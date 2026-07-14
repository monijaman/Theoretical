# Design a Notification System
[← Back to index](../readme.md)

## 1. Requirements

**Functional**
- Send notifications across multiple channels: push (iOS/Android), email, SMS, and optionally in-app.
- Accept notification requests from many internal services (order updates, marketing, security alerts, social activity).
- Respect per-user preferences (opted-out channels, quiet hours, unsubscribe from marketing but not security).
- Deduplicate near-identical triggers (e.g. two internal events firing "your order shipped" within seconds).
- Retry failed deliveries with backoff; move permanently-failed messages to a dead-letter queue for inspection.
- Support templated content (localized, per-channel formatting) and basic scheduling (send at a specific time / user's local morning).

**Non-functional**
- High throughput, bursty: a single marketing campaign or mass event (e.g. a live-score push) can spike to millions of notifications in minutes.
- At-least-once delivery per channel with idempotency downstream (better a rare duplicate than a silently dropped critical alert).
- Provider-agnostic: swapping APNs/FCM/Twilio/SendGrid for alternatives should not require touching business logic.
- Asynchronous by nature — the triggering service should never block on notification delivery.
- Delivery latency: best-effort near-real-time (seconds) for push/in-app, minutes acceptable for email/SMS batches, except security alerts which need sub-second dispatch.

**Assumptions**
- 200M users, 50M DAU, average 5 notification-worthy events/user/day across all channels ≈ 1B notifications/day.
- Push is the dominant channel (~70%), email ~20%, SMS ~10% (SMS reserved mostly for OTP/critical alerts due to cost).
- Third-party providers (APNs, FCM, Twilio, SendGrid) are the actual delivery mechanism; this system owns orchestration, not last-mile delivery.

## 2. Capacity Estimation

**Traffic**
- 1B notifications/day ÷ 86,400s ≈ **~11,600/sec average**; real traffic is spiky (breaking news push, flash sale) — assume 20x peak → **~230,000/sec** peak for short bursts.
- Split by channel at peak: push ~160k/sec, email ~46k/sec, SMS ~23k/sec — each channel's provider has its own rate limits (e.g. FCM/APNs handle very high throughput; Twilio/SendGrid often gate to a few thousand/sec per account), so the system must queue and throttle per provider independently rather than assume unlimited downstream capacity.

**Storage**
- Notification record: id, user_id, channel, template_id, payload (~500 bytes avg with rendered content), status, timestamps ≈ **700 bytes/row**.
- 1B/day × 700 bytes ≈ **700 GB/day**, ≈ **~250 TB/year** raw. This is too much to keep in a hot OLTP store indefinitely — recent (7-30 day) delivery/status records stay in the primary store for retries/support lookups; older records roll off to cold storage/warehouse for analytics.
- User preference table: 200M users × ~200 bytes (channel toggles, quiet hours, locale) = **40 GB** — trivially fits a normal database, read on every send so it must be cache-friendly.

**Queue sizing**
- At 230k/sec peak with a target end-to-end processing time of a few seconds, the ingestion queue must buffer at least `230,000 × 10s ≈ 2.3M` messages in flight during a burst without falling over — well within a Kafka topic's normal capacity, but it means consumer (worker) pool size must scale to drain that fast, not just the queue holding it.

**Worker/connection sizing**
- If each provider call takes ~50ms round-trip and a worker holds one connection at a time, sustaining 230k/sec needs `230,000 × 0.05 ≈ 11,500` concurrent in-flight calls — implies either a large async worker pool (event-loop based, thousands of logical workers per box) or several hundred threaded workers per provider, load-balanced across many machines rather than one.

## 3. High-Level Architecture

```
   ┌────────────────────┐
   │ Internal producers  │  (order svc, social svc, security svc, marketing tool)
   └──────────┬───────────┘
              │ publish "notification requested" events
      ┌───────▼────────┐
      │  Kafka (ingest)  │   topic per rough priority: security > transactional > marketing
      └───────┬────────┘
              │
      ┌───────▼─────────────┐
      │  Notification Service │  dedup, preference check, template render, fan-out per channel
      │  (stateless workers)  │
      └───┬─────┬─────┬──────┘
          │     │     │
   ┌──────▼─┐ ┌─▼────┐ ┌▼───────┐
   │ Push Q  │ │Email Q│ │ SMS Q  │   (per-channel queues, independent rate limits)
   └──────┬─┘ └─┬────┘ └┬───────┘
          │     │        │
   ┌──────▼─┐ ┌─▼────┐ ┌▼───────┐
   │ APNs/FCM│ │SendGrid│ │ Twilio │   (provider adapters, retry/backoff per provider)
   │ adapter │ │adapter │ │adapter │
   └──────┬─┘ └─┬────┘ └┬───────┘
          │     │        │
          ▼     ▼        ▼
     external providers → end-user devices/inboxes/phones
              │
      ┌───────▼────────┐
      │ Delivery status  │──▶ Status DB (per-notification state) + DLQ for permanent failures
      │ webhook/callback │
      └────────────────┘
```

**Walkthrough**
1. An internal service (e.g. Order Service) publishes a "notify user X that order shipped" event to Kafka rather than calling a notification API synchronously — decouples the triggering service from delivery entirely.
2. The Notification Service consumes the event, checks the **dedup cache** (has this exact trigger been seen in the last N minutes?), fetches the user's **preferences** (channel opt-outs, quiet hours, locale), renders the appropriate **template**, and fans the message out to one queue per eligible channel.
3. Each channel has its own queue and worker pool so that, say, a SendGrid slowdown never backs up push delivery — channels fail independently.
4. Channel-specific **provider adapters** translate the internal message format into each provider's API shape, respect that provider's own rate limits, and handle retries with exponential backoff on transient errors (5xx, timeouts).
5. Providers deliver to the device/inbox and, for push/email especially, send back delivery/bounce/click webhooks, which update the Status DB — this closes the loop for retry decisions and analytics.
6. Messages that exhaust retries land in a **dead-letter queue** for manual inspection or automated alerting (e.g. a security-critical SMS repeatedly failing pages an on-call engineer).

## 4. API Design

```
POST /api/v1/notifications
Request:
{
  "user_id": "u_789",
  "event_type": "order_shipped",
  "dedup_key": "order_shipped:order_555",     // caller-supplied, used for idempotency/dedup
  "channels": ["push", "email"],               // optional hint; system still filters by preference
  "template_id": "order_shipped_v2",
  "template_data": { "order_id": "555", "eta": "2026-07-16" },
  "priority": "transactional"                  // security | transactional | marketing
}
Response: 202 Accepted
{ "notification_id": "n_abc123", "status": "queued" }

GET /api/v1/notifications/{notification_id}
Response: 200
{
  "notification_id": "n_abc123",
  "status": "delivered",
  "channels": {
    "push": { "status": "delivered", "delivered_at": "..." },
    "email": { "status": "bounced", "reason": "invalid_address" }
  }
}

PATCH /api/v1/users/{user_id}/preferences
Request:
{ "marketing_push": false, "quiet_hours": { "start": "22:00", "end": "08:00", "tz": "America/Sao_Paulo" } }
Response: 200 { "updated": true }
```

## 5. Data Model & Storage Choice

```
notifications (recent window, e.g. 30 days — status/support lookups)
  notification_id  PK
  user_id           indexed
  dedup_key         indexed, unique per (user_id, dedup_key, time_window)
  event_type
  priority
  created_at
  channel_statuses  (JSON: per-channel status, timestamps, provider message id)

user_preferences
  user_id           PK
  channel_opt_outs  (set: push/email/sms/marketing flags)
  quiet_hours_start, quiet_hours_end, timezone
  locale

templates
  template_id       PK
  channel
  locale
  content (subject/body with placeholders)
```

`notifications` is high-volume, append-mostly, with simple key-based lookups (`by notification_id`, `by dedup_key`, `by user_id` for recent history) — a NoSQL key-value/wide-column store (DynamoDB/Cassandra) fits well for the same reasons as in [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md): near-linear write scaling, TTL-based expiry to age data out of the hot store automatically, no need for cross-user joins.

`user_preferences` is small, read-heavy (checked on nearly every send), and benefits from being cached aggressively in front of whatever store holds it — a small relational table or a key-value store both work; the real requirement is that it sits behind a cache (see [caching-strategies](../04-caching/caching-strategies.md)), because a 40 GB table read at 230k/sec would otherwise be the single biggest bottleneck in the whole pipeline.

`templates` is tiny and rarely written — a relational table with admin tooling on top is simplest, cached fully in-memory by workers since template count is small (thousands, not millions).

## 6. Deep Dive

### 6.1 Provider abstraction layer

Business logic (dedup, preferences, templating) should never know whether push goes through FCM or a hypothetical replacement. Define a common internal interface per channel type:
```
interface PushProvider {
  send(deviceToken, payload) -> ProviderResult(success, providerMessageId, error)
}
```
APNs and FCM adapters implement this interface, translating the internal payload into each provider's specific JSON shape (APNs uses HTTP/2 with JWT auth; FCM uses its own REST/gRPC API) and normalizing their very different error taxonomies (invalid token, rate limited, provider outage) into a shared internal error enum the retry logic understands. This lets the system add a secondary email provider (SendGrid → SES failover) or swap SMS vendors by region (Twilio in the US, a local aggregator elsewhere) without touching the orchestration layer — critical because provider outages happen often enough that hard-coding one vendor is an operational risk.

### 6.2 Deduplication

Two internal services (or a retried event) can trigger logically-identical notifications. Dedup on a caller-supplied `dedup_key` (e.g. `order_shipped:order_555`) using a short-lived cache (Redis, TTL matched to the plausible duplicate window — minutes to low hours): before enqueueing, `SETNX` the key; if it already exists, drop the duplicate and return the existing `notification_id`. For triggers that don't supply a natural key, fall back to a content hash (event_type + user_id + rendered template output) over a shorter window. This must happen *before* fan-out to channel queues, not after, or duplicates fan out independently per channel and the dedup is pointless.

### 6.3 Retry, backoff, and dead-letter handling

Each channel adapter classifies provider errors into retryable (timeout, 5xx, rate-limited) vs terminal (invalid token/address, user unsubscribed at the provider level). Retryable errors get exponential backoff with jitter (per [retry-exponential-backoff](../01-scaling-traffic/retry-exponential-backoff.md)) and a bounded max attempt count (e.g. 5 attempts over ~15 minutes) — after which the message moves to a per-channel **dead-letter queue**. DLQ entries are inspected by an automated job (e.g. auto-alert on-call if a security-priority message dead-letters) and are available for manual replay once an underlying issue (bad provider credentials, a config bug) is fixed. A circuit breaker ([circuit-breaker-pattern](../01-scaling-traffic/circuit-breaker-pattern.md)) around each provider adapter stops hammering a provider that's clearly down, shedding load back onto the queue instead of burning through retries uselessly.

### 6.4 User preferences and quiet hours

Preference checks must happen before rendering/sending, not after — wasted rendering work is cheap to avoid. Quiet hours require converting the user's local time (stored timezone) against `now`, and for non-urgent (marketing) notifications, either dropping the send or deferring it to a scheduled queue that flushes at the start of the user's next allowed window. Security/critical priority notifications bypass quiet hours and most opt-outs by design (e.g. a fraud alert should not be silenced by a "no push after 10pm" preference) — priority tagging at ingestion (§3) is what enables this bypass logic downstream.

## 7. Bottlenecks & Scaling

- **10x burst (2.3M/sec during a mass event)**: partition Kafka topics by a hash of user_id so consumer parallelism scales horizontally; scale channel worker pools independently since a push-heavy event doesn't need more SMS workers.
- **Provider rate limits become the ceiling, not our own infrastructure**: queue depth per provider becomes the real backpressure signal — throttle adapters to each provider's documented limit and let the queue absorb the rest, rather than dropping messages.
- **Preference-store read load**: a naive per-send DB read at 230k/sec would overwhelm most databases; cache preferences aggressively (short TTL, invalidate on preference update) per [cache-invalidation](../04-caching/cache-invalidation.md).
- **Hot users receiving very frequent notifications (e.g. a popular creator's followers all pinged near-simultaneously)**: batch/debounce at the source event level where possible (e.g. aggregate "10 people liked your post" instead of 10 separate pushes) — this is a product decision as much as an infra one, but it materially reduces peak load.
- **Cross-region users**: route provider calls from the region closest to the user/provider endpoint where providers support regional endpoints (SendGrid, Twilio do); replicate preference and template data to all regions to avoid cross-region reads on the hot path, per [multi-region-architecture](../09-large-scale-data-systems/multi-region-architecture.md).

## 8. Trade-offs & Alternatives

- **At-least-once delivery with idempotent dedup vs exactly-once**: exactly-once delivery across three external providers we don't control is not realistically achievable; we chose at-least-once plus a dedup key, pushing the rare-duplicate cost onto a cheap cache check rather than building distributed transactions we can't actually guarantee end-to-end.
- **Per-channel independent queues vs a single unified queue**: independent queues mean one provider's outage never head-of-line-blocks other channels, at the cost of more moving infrastructure pieces (N queues, N worker pools) to operate.
- **Synchronous provider calls vs async webhook-based status**: async fits better for scale (workers aren't held open waiting on slow providers) but means "delivered" status is eventually consistent — a notification can show `queued` for a few seconds even though it already reached the device, which is an acceptable UX trade for the throughput gained.
- **Aggressive dedup window vs simplicity**: a longer dedup window catches more true duplicates but risks incorrectly suppressing a legitimately-repeated notification (e.g. two separate real order-ship events with a coincidentally similar payload) — tuned narrow and scoped to a caller-supplied key specifically to avoid this false-positive risk.

## Related topics
- [Message Queues](../05-messaging-event-driven/message-queues.md)
- [Event-Driven Architecture](../05-messaging-event-driven/event-driven-architecture.md)
- [Retry & Exponential Backoff](../01-scaling-traffic/retry-exponential-backoff.md)
- [Circuit Breaker Pattern](../01-scaling-traffic/circuit-breaker-pattern.md)
- [Backpressure](../01-scaling-traffic/backpressure.md)
- [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md)
- [Caching Strategies](../04-caching/caching-strategies.md)
- [Cache Invalidation](../04-caching/cache-invalidation.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
- [High Availability](../08-reliability-operations/high-availability.md)
