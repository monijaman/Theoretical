# Design a Chat System
[← Back to index](../readme.md)

## 1. Requirements

**Functional**
- 1:1 and group messaging (text, images, small files).
- Delivery state per message: sent → delivered → read, visible to the sender.
- Offline support: messages sent while a recipient is offline are stored and delivered on reconnect, in order.
- Presence (online/offline/last-seen), typing indicators.
- Group chats up to a few hundred members with the same ordering/delivery guarantees.
- Message history sync across a user's multiple devices.

**Non-functional**
- Real-time delivery: sub-second for online recipients.
- Messages must not be lost even if a client disconnects mid-send or the server restarts.
- Ordering: messages within a single conversation must appear in a consistent order to all participants (global cross-conversation ordering is not required).
- Massive number of persistent, mostly-idle connections held open concurrently (this is the defining scaling challenge, distinct from most read/write-heavy systems).
- Horizontally scalable connection layer — no single node should need to hold all connections for a region.

**Assumptions**
- 500M MAU, 150M concurrent connections at peak (a large fraction of DAU is "online" with an idle WebSocket even if not actively typing).
- Average user sends 40 messages/day; average message payload (text) ~200 bytes; media messages handled via a separate blob-upload path referenced by URL, not inlined.
- 1:1 chats dominate by volume; group chats capped at a few hundred members (not a "channel with millions of members" broadcast case — that's closer to the [news feed](news-feed.md) fan-out problem).

## 2. Capacity Estimation

**Traffic**
- 500M MAU × 40 msgs/day = 20B messages/day ≈ 20,000,000,000 / 86,400 ≈ **~231,000 messages/sec average**; peak (evenings, regional daytime overlap) assume 3x → **~700,000 messages/sec** peak.
- Each message potentially fans out to multiple recipients (group chats) — assume an average fan-out factor of 3 (mix of 1:1 and small groups) → **~2.1M delivery-events/sec** peak at the connection layer.

**Connections**
- 150M concurrent WebSocket connections. A single well-tuned connection-server process can hold roughly 50,000-100,000 idle WebSocket connections (bounded by file descriptors and per-connection memory, not CPU, since most are idle). At 75,000/node, that's `150,000,000 / 75,000 ≈ 2,000` connection-server nodes — a large but entirely normal fleet size for a service at this scale, and the reason connection management (not message throughput) is the headline scaling problem for chat.

**Storage**
- Message record: id, conversation_id, sender_id, content (~200 bytes avg), timestamps, delivery-state flags ≈ **300 bytes/row**.
- 20B messages/day × 300 bytes ≈ **6 TB/day** ≈ **~2.2 PB/year** — this is a genuine big-data volume problem, driving the choice toward a wide-column store partitioned by conversation (see §5), with old/rarely-accessed history tiered to cheaper storage.

**Presence/ephemeral state**
- 500M users × small presence record (status, last-seen ts, ~50 bytes) = 25 GB — small, but write-heavy (every status flip, every heartbeat) and latency-sensitive, so it belongs in an in-memory store (Redis) rather than the durable message store.

## 3. High-Level Architecture

```
        ┌──────────┐        ┌──────────┐
        │ Client A  │        │ Client B  │
        └────┬─────┘        └─────┬────┘
             │ WebSocket           │ WebSocket
      ┌──────▼──────┐       ┌──────▼──────┐
      │ Conn Server  │       │ Conn Server  │   (thousands of stateless-ish nodes,
      │   (region 1)  │       │   (region 2)  │    each holding ~75k live sockets)
      └──────┬──────┘       └──────┬──────┘
             │                      │
             └─────────┬────────────┘
                 ┌──────▼───────┐
                 │  Session /    │   maps user_id → which conn-server node(s)
                 │  Presence Reg  │   holds their live connection (Redis)
                 └──────┬───────┘
                 ┌──────▼───────┐
                 │ Message Router │  looks up recipient's conn-server, or
                 │  / Chat Service │  queues for offline delivery
                 └──────┬───────┘
             ┌───────────┼────────────┐
             ▼            ▼            ▼
      ┌───────────┐ ┌──────────┐ ┌────────────┐
      │ Message DB │ │ Offline Q │ │ Push Notif  │
      │ (per convo, │ │ (per user,│ │ (via the    │
      │  sharded)   │ │  for undelivered)│ notification-system) │
      └───────────┘ └──────────┘ └────────────┘
```

**Walkthrough**
1. Both clients hold a persistent WebSocket to a nearby connection-server; on connect, the server registers `user_id → this node` in a shared Session/Presence Registry (Redis) so any other node can find where to route a message to this user.
2. Client A sends a message. Its connection server persists the message to the sharded Message DB first (durability before delivery — never lose a message because a downstream hop failed) and publishes it to the Message Router.
3. The router looks up recipient B's session: if B is online (registry hit), it forwards the message directly to B's connection-server node, which pushes it over B's live socket — typically well under a second end-to-end.
4. If B is offline (registry miss), the message is left in the Message DB as unread/undelivered and a job also enqueues a push notification via the [notification system](notification-system.md) so B finds out even with the app closed.
5. On B's reconnect, the client requests "everything since my last-synced message id/timestamp" — the server replays from the Message DB, and delivery-state transitions to `delivered`; when B actually views the conversation, the client acks `read`, which is relayed back to A's connection if online (or stored for A to see on their own next sync).
6. Group messages repeat step 2-4 per member, fanned out by the Message Router — bounded by the small group size assumption, unlike a celebrity broadcast.

## 4. API Design

Primarily WebSocket-based for the real-time path, with REST for history/sync:

```
WS message (client → server), send:
{
  "type": "send_message",
  "client_msg_id": "c_9f2a",          // client-generated, for de-duplication on retry
  "conversation_id": "conv_123",
  "content": { "type": "text", "body": "hey, running late" }
}

WS message (server → client), delivery:
{
  "type": "message",
  "message_id": "m_88213",
  "conversation_id": "conv_123",
  "sender_id": "u_42",
  "content": { "type": "text", "body": "hey, running late" },
  "sent_at": "2026-07-14T09:00:00Z"
}

WS message (server → client), receipt update:
{ "type": "receipt", "message_id": "m_88213", "state": "read", "by": "u_77", "at": "..." }

REST — history sync:
GET /api/v1/conversations/{id}/messages?after=m_88200&limit=50
Response: 200
{ "messages": [ { "message_id": "m_88201", "sender_id": "u_42", "content": {...}, "sent_at": "..." }, ... ] }

REST — presence:
GET /api/v1/users/{id}/presence
Response: 200 { "status": "online", "last_seen": "2026-07-14T09:00:00Z" }
```

`client_msg_id` is essential: a flaky connection can cause the client to retry a send before receiving an ack; the server treats `(sender_id, client_msg_id)` as an idempotency key so a retried send never creates a duplicate message.

## 5. Data Model & Storage Choice

```
messages (partitioned by conversation_id)
  conversation_id   partition key
  message_id        clustering key (time-ordered, e.g. Snowflake/ULID)
  sender_id
  content
  client_msg_id     (dedup)
  created_at

message_receipts
  message_id, user_id  composite key
  state             (sent | delivered | read)
  updated_at

conversations
  conversation_id   PK
  type              (1:1 | group)
  member_ids        (list, small for groups)
  last_message_id   (denormalized, for conversation-list previews)

session_registry (Redis, ephemeral)
  user_id → { conn_server_node, connected_at }

presence (Redis, ephemeral)
  user_id → { status, last_seen }
```

Messages are the dominant volume and the access pattern is almost entirely "give me messages in conversation X, ordered by time, paginated" — a perfect fit for a wide-column NoSQL store (Cassandra-style) partitioned by `conversation_id` with `message_id` as a time-ordered clustering key, per [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md): writes are append-only, reads are range-scans within a single partition, and horizontal scale is achieved simply by adding nodes since conversations distribute the load naturally (no single conversation is large enough to be a hot partition, unlike a celebrity's followers in a feed system).

`conversations` (small, needs member-list lookups and light relational structure) can live in the same NoSQL store or a small relational table — it's low-volume enough that either works; consistency requirements are also low (adding/removing a group member doesn't need to be strongly consistent globally).

Session/presence data is inherently ephemeral and extremely write-heavy (every connect/disconnect/heartbeat) — Redis is the natural fit, with no durability requirement beyond "reconstructible on restart from clients reconnecting."

## 6. Deep Dive

### 6.1 Message ordering and delivery guarantees

Ordering only needs to be guaranteed **within a conversation**, not globally — this significantly simplifies things versus a global total-order system. Using a time-ordered id (Snowflake-style: timestamp + shard + sequence, or a client-supplied Lamport-ish counter reconciled server-side) as the clustering key inside each conversation partition gives a stable, monotonic order that all participants and all of a user's devices agree on, without needing a distributed consensus protocol per message.

Delivery guarantee is **at-least-once with client-side dedup**: the server persists the message before attempting live delivery, so a crash between persist and push never loses the message — it's simply picked up on the recipient's next sync. The `client_msg_id` idempotency key (§4) similarly protects the *sender* side from creating duplicates on retry. Exactly-once end-to-end delivery is not actually achievable across an unreliable network without this kind of idempotent-receiver pattern, so we lean on it rather than chasing an unattainable guarantee.

Read/delivered/read receipts are a separate, lower-durability data path from the messages themselves — losing a receipt update is a UX nuisance (a checkmark doesn't turn blue promptly), not data loss, so it can be delivered best-effort over the same WebSocket channel without the same persist-before-push discipline as the message body.

### 6.2 Connection management at scale

The core operational challenge is **150M concurrent, mostly-idle connections**, not throughput. Each connection-server node is sized by file-descriptor and memory limits (a few KB of state per connection), not CPU — this pushes toward many moderately-sized nodes (§2's ~2,000-node estimate) behind a Layer 4 load balancer that assigns a new connection to *some* available node and doesn't need to route by content afterward, since routing between users happens at the Message Router / Session Registry layer, not the LB.

Because a user's live connection can be on any of 2,000 nodes, every send requires a registry lookup (`user_id → node`) before the connection server holding the recipient can be reached — this registry lookup is on the critical path for every online delivery, so it lives in Redis (sub-millisecond) rather than a durable database. Node failure means every connection on that node drops; clients must implement automatic reconnect-with-backoff, and the registry entry is cleaned up (TTL-based heartbeat expiry) so the system doesn't keep routing to a dead node.

### 6.3 Group chat fan-out

For groups (capped at a few hundred members per our assumptions), a single sent message is fanned out by looking up each member's session and pushing individually — an O(group size) operation per message, entirely tractable at this scale (unlike fan-out to millions of followers, which is the [news feed](news-feed.md) problem and needs a fundamentally different, asynchronous/batched approach). If group sizes were allowed to grow into the thousands, the design would need to borrow the feed system's fan-out-on-read strategies for the largest groups specifically.

### 6.4 Offline storage and multi-device sync

Every message is durably stored regardless of recipient online status (§3 step 2), so "offline delivery" is really just "the recipient's next sync reads from the same store a live client would have received a push from." Multi-device sync follows the same mechanism: each device tracks its own `last_synced_message_id` per conversation and requests "everything after that" on reconnect/foreground — this means a user's phone and laptop can be at different sync points independently without any special-cased logic, since sync is pull-based from a durable source of truth rather than push-only.

### 6.5 End-to-end encryption (brief)

For true E2E encryption (WhatsApp-style), the server stores and routes only ciphertext — it never has the keys to read message content. Each device maintains a key pair; on first contact, devices exchange public keys (often via a protocol like Signal's Double Ratchet) and the server's role becomes pure store-and-forward of opaque encrypted blobs plus delivery-state metadata. This has real architectural consequences: server-side search/moderation over message content becomes impossible, and multi-device sync requires each device to independently hold (or securely receive) the keys needed to decrypt history, which is a meaningfully harder problem than the plaintext sync described in §6.4 — most real systems solve it with per-device key fan-out at send time (the sender encrypts the same message separately for each of the recipient's registered devices).

## 7. Bottlenecks & Scaling

- **10x concurrent connections (1.5B)**: connection-server fleet scales roughly linearly (more nodes, same per-node ceiling) — the harder problem is the Session Registry's lookup volume, which needs its own horizontal sharding (consistent hashing on user_id across many Redis instances).
- **Hot conversation (a very active large group)**: even bounded-size groups can be very chatty; if one conversation's partition becomes a hot spot, sub-partition by time bucket (e.g. `conversation_id + day`) so a single Cassandra partition doesn't grow unbounded or absorb disproportionate write load.
- **Regional latency for cross-region conversations**: route messages through the region closest to the recipient's active connection; replicate the message store across regions asynchronously so a user's history is available near them, accepting eventual consistency for message visibility across regions per [strong-vs-eventual-consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md).
- **Reconnect storms (regional outage recovery)**: thousands of clients reconnecting simultaneously can overwhelm connection servers and the registry at once; require client-side jittered backoff and consider a brief connection-admission rate limit during recovery, per [rate-limiting](../01-scaling-traffic/rate-limiting.md).
- **Message store growth (2.2 PB/year)**: age out and tier older conversation history to cheaper cold storage, keeping only recent/active conversations in the hot tier, with on-demand rehydration for old-history scrollback.

## 8. Trade-offs & Alternatives

- **WebSockets vs long-polling/SSE**: WebSockets chosen for true bidirectional low-latency push at this connection scale; long-polling would multiply request volume dramatically (each poll is a new HTTP request) and SSE is one-directional, requiring a separate channel for client→server sends — see [websockets-vs-sse-vs-long-polling](../06-communication-protocols/websockets-vs-sse-vs-long-polling.md).
- **Per-conversation ordering vs global ordering**: global total order across all conversations would require a much heavier coordination mechanism for no real product benefit — chat only needs consistent order within a conversation, so we scoped the guarantee down deliberately.
- **At-least-once + idempotent dedup vs exactly-once**: exactly-once delivery over unreliable networks and app restarts isn't realistically achievable end-to-end; leaning on idempotency keys gets the same practical outcome (no visible duplicates) without the complexity of distributed transactions.
- **Pull-based multi-device sync vs push-fan-out to all of a user's devices**: pull-based (§6.4) is simpler and naturally handles devices that are offline for extended periods, at the cost of a small latency bump on reconnect (one sync request) versus instant push to every device.

## Related topics
- [WebSockets vs SSE vs Long Polling](../06-communication-protocols/websockets-vs-sse-vs-long-polling.md)
- [Message Queues](../05-messaging-event-driven/message-queues.md)
- [Database Sharding](../02-data-storage/database-sharding.md)
- [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md)
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
- [Caching Strategies](../04-caching/caching-strategies.md)
- [Rate Limiting](../01-scaling-traffic/rate-limiting.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
- [Real-Time System Design](../09-large-scale-data-systems/real-time-system-design.md)
- [News Feed](news-feed.md)
