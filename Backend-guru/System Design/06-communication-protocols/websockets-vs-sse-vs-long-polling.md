# WebSockets vs SSE vs Long Polling
[← Back to index](../readme.md)

## What this is and why it's asked

Plain HTTP is request-response: the client asks, the server answers, the connection's job is done. But a huge class of features — chat, live notifications, collaborative editing, live scores, presence indicators — need the *server* to be able to push data to the client whenever something happens, not only when the client happens to ask. Interviewers use this topic to see whether you can match a real-time requirement to the cheapest protocol that satisfies it, instead of reaching for WebSockets by default — WebSockets are the most powerful option and also the most operationally expensive one, and picking it for a use case that's actually unidirectional (like notifications) is a common interview red flag.

## Short polling

The client just asks repeatedly, on a fixed interval, whether there's anything new.

```
Client -> GET /messages/new     -> Server: [] (nothing yet)
   ... wait 3s ...
Client -> GET /messages/new     -> Server: [] (nothing yet)
   ... wait 3s ...
Client -> GET /messages/new     -> Server: [{msg}]  (finally something)
```

- Pros: trivial to implement, works everywhere, no special infrastructure.
- Cons: latency is bounded by the poll interval (average delay = interval/2); most requests return nothing, wasting connections/bandwidth/server CPU on repeated auth+routing+query overhead for empty results; doesn't scale well — every idle client is still a periodic request the server must handle.

## Long polling

The client makes a request, but instead of the server responding immediately with "nothing yet," it *holds the connection open* until there's actually something to say (or a timeout is hit), then responds — at which point the client immediately opens a new long-poll request.

```
Client -> GET /messages/new  ----(connection held open)----
                                          |
                                   (30s later, new message arrives)
                                          |
Client <- 200 {msg}  <--------------------
Client -> GET /messages/new  ----(held open again immediately)----
```

```python
# server-side sketch
def long_poll(request, timeout=30):
    deadline = time.time() + timeout
    while time.time() < deadline:
        msg = queue.pop_if_any(request.user_id)
        if msg:
            return json_response(msg)
        time.sleep(0.5)   # or, better, block on a condition variable / pub-sub notify
    return json_response([])   # timed out with nothing; client reconnects immediately
```

- Pros: much lower latency than short polling (server responds the instant data is available) while still using only plain HTTP — works through any proxy/firewall/load balancer that understands HTTP.
- Cons: every held-open connection ties up a server worker/thread (or, with async servers, a socket + associated memory) for the duration of the hold — at scale this means provisioning for "concurrent connections," not "concurrent active requests," which is a very different capacity model; each response requires establishing a brand new HTTP request/response cycle (new headers, sometimes new TCP handshake if not kept-alive), which adds overhead on every round trip compared to a connection that just stays open and streams.

This was the standard workaround before SSE/WebSockets had broad browser support, and it's still used today as a fallback or in very simple/legacy systems where the operational cost of a persistent-connection protocol isn't justified.

## Server-Sent Events (SSE)

SSE is a *unidirectional*, server-to-client streaming protocol built directly on plain HTTP — the client opens one long-lived connection and the server writes a stream of text-formatted events down it indefinitely, without ever closing the response.

```
Client -> GET /stream        (Accept: text/event-stream)
Server -> 200 (connection stays open, Content-Type: text/event-stream)
Server -> data: {"type":"like","count":42}\n\n
             ... time passes ...
Server -> data: {"type":"comment","user":"alice"}\n\n
             ... time passes ...
Server -> data: {"type":"like","count":43}\n\n
```

The browser-native `EventSource` API handles the plumbing, including **automatic reconnection** with a server-suggested retry delay and a `Last-Event-ID` header so the client can resume from where it left off after a drop — this reconnect logic is arguably SSE's biggest practical advantage, since it's built into the browser rather than something you hand-roll.

```javascript
const es = new EventSource("/stream");
es.onmessage = (e) => render(JSON.parse(e.data));
es.onerror = () => console.log("EventSource reconnects automatically");
```

- Good fit: anything where only the server needs to push and the client never needs to send data back over the same channel — live notification feeds, stock tickers, live sports scores, "someone is typing" indicators fed from a single direction, build/CI log streaming.
- Limitations: strictly one-way (client-to-server messages need a separate normal HTTP request); text-only wire format (binary payloads must be base64-encoded, which SSE wasn't designed for); older versions of HTTP/1.1 impose a per-domain connection limit (6 per browser) that many concurrent SSE streams to the same host can exhaust — though HTTP/2 multiplexing largely removes this limit.

## WebSockets

WebSockets establish a **full-duplex**, persistent TCP connection: after an HTTP-based upgrade handshake, the connection stops being HTTP at all and becomes a raw bidirectional message channel — either side can send a message at any time, with no request/response pairing required.

```
Client -> GET /chat  (Upgrade: websocket, Connection: Upgrade, Sec-WebSocket-Key: ...)
Server -> 101 Switching Protocols (Sec-WebSocket-Accept: ...)
              |
       (connection is now a raw bidirectional socket, not HTTP anymore)
              |
Client -> {"type":"message","text":"hi"}
Server -> {"type":"message","user":"bob","text":"hey!"}
Client -> {"type":"typing"}
Server -> {"type":"presence","user":"bob","status":"online"}
   ... either side can send at any time, no polling shape at all ...
```

```javascript
const ws = new WebSocket("wss://chat.example.com/socket");
ws.onmessage = (e) => render(JSON.parse(e.data));
ws.onopen = () => ws.send(JSON.stringify({type: "join", room: "general"}));
```

- Good fit: anything genuinely bidirectional and low-latency — chat (Slack, Discord both use WebSockets as the backbone of their real-time client connection), multiplayer games, collaborative editing (cursors/operational transforms), voice/video signaling.
- Costs: no automatic reconnect or message-replay built into the browser API (unlike `EventSource`) — the application must implement heartbeat/ping-pong, reconnect-with-backoff, and resuming missed state itself; because it's a long-lived stateful TCP connection tied to one specific server process, horizontally scaling a WebSocket service requires **sticky sessions** (the load balancer must route a given client back to the same backend instance for the life of the connection) or an explicit pub/sub fabric (Redis pub/sub, NATS) so that a message destined for a client connected to server B can be routed there even if it originates on server A.

## Comparison table

| | Short polling | Long polling | SSE | WebSockets |
|---|---|---|---|---|
| Direction | Client-initiated only | Client-initiated only | Server -> client only | Full duplex |
| Transport | Plain HTTP request/response | Plain HTTP, held open | Plain HTTP, streamed | TCP after HTTP upgrade |
| Browser support / API | Universal (`fetch`/XHR) | Universal | `EventSource`, very good modern support | `WebSocket`, very good modern support |
| Proxy/firewall friendliness | Excellent (looks like normal HTTP) | Excellent | Good (still HTTP, though some old proxies buffer streams) | Can be blocked by strict corporate proxies/firewalls that don't allow the Upgrade header |
| Auto-reconnect | N/A (stateless by design) | Manual (client just re-requests) | Built into `EventSource` | Must be hand-implemented |
| Scaling implication | Stateless, easy to load-balance | Ties up a worker per waiting client | Ties up a connection per client; stateless enough to often load-balance freely | Requires sticky sessions or a cross-server pub/sub fan-out |
| Latency | Bound by poll interval | Near-immediate | Near-immediate | Immediate, both directions |
| Typical use case | Legacy/simple status checks | Legacy real-time fallback | Notifications, live feeds, tickers | Chat, games, collaborative editing |

## When to pick which

- **Chat / multiplayer / collaborative editing → WebSockets.** The interaction is inherently bidirectional and latency-sensitive in both directions; anything else forces an awkward second channel for the client-to-server half.
- **Live notifications / activity feeds / dashboards → SSE.** The client never needs to talk back over the same channel, so the simpler, auto-reconnecting, plain-HTTP protocol is strictly cheaper to run and operate than WebSockets for the same outcome.
- **Legacy clients, very low traffic, or simplicity trumps efficiency → long polling.** Works through anything that speaks HTTP/1.1, needs no special infrastructure (no sticky sessions, no Upgrade support), and is a reasonable fallback path for browsers/networks that block WebSocket upgrades.
- **Rule of thumb interviewers listen for**: "does the client need to send data over the *same* channel the server is pushing on?" If no, SSE is usually the better default over WebSockets — it's simpler, has native reconnection, and is easier to scale (ordinary HTTP load balancing largely still applies), reserving WebSockets for when true bidirectionality is a hard requirement.

## Common interview follow-ups

**Q: Why do WebSockets need sticky sessions but SSE often doesn't as badly?**
A WebSocket connection is a single long-lived stateful socket tied to one specific backend process holding that connection's in-memory state (room membership, presence); if a load balancer routes a reconnect to a different instance, that instance doesn't have the session unless state is externalized. SSE has the same "long-lived connection tied to one server" property technically, but because it's push-only, many SSE architectures make the server side stateless per-stream (just subscribing to a shared pub/sub topic and relaying), so any instance can serve any client's stream without needing that specific instance's local state.

**Q: How do you scale WebSockets across multiple backend servers?**
Combine sticky sessions at the load balancer (so a client's reconnects land on a consistent server when possible) with a shared message bus (Redis pub/sub, Kafka, NATS) so that when server A needs to deliver a message to a client actually connected to server B, it publishes to the bus and server B relays it down its own socket — this decouples "which server holds the socket" from "which server produced the message."

**Q: Why might a corporate network block WebSockets but allow long polling or SSE?**
Some older/strict proxies and firewalls only understand well-formed HTTP request/response and don't support (or explicitly block) the `Connection: Upgrade` handshake WebSockets require, since after the upgrade the traffic is no longer inspectable as HTTP; long polling and SSE never leave the HTTP request/response model (SSE just keeps one response streaming), so they pass through the same infrastructure that already handles ordinary web traffic.

**Q: If SSE is simpler and auto-reconnects, why does anyone still choose long polling today?**
Mostly legacy support and extremely simple use cases — servers or clients that predate or don't support `EventSource`, or environments where introducing a new response content-type (`text/event-stream`) and keeping a response perpetually open isn't feasible (some serverless/FaaS platforms cap request duration, which breaks both SSE and long-lived long-polling, favoring short polling with a queue behind it instead).

**Q: Does HTTP/2 change any of these trade-offs?**
Yes — HTTP/2's multiplexing removes the old 6-connections-per-domain browser limit, so many concurrent SSE streams (or long-polls) to the same host stop competing with each other for a scarce connection slot, which was previously a real practical constraint on using SSE for multiple simultaneous feeds from the same page.

**Q: How would you detect a dead WebSocket connection that hasn't sent an explicit close frame?**
Implement application-level ping/pong heartbeats (send a ping every N seconds, expect a pong within a timeout) since TCP alone can leave a socket looking "open" for a long time after the peer actually vanished (dead peer, network partition, laptop closed) — this is the same problem service health checks solve at a different layer, and without it a server can hold resources for connections nobody is on the other end of anymore.

## Related topics
- [REST vs GraphQL vs gRPC](rest-vs-graphql-vs-grpc.md)
- [Load Balancing](../01-scaling-traffic/load-balancing.md)
- [Backpressure](../01-scaling-traffic/backpressure.md)
- [Event-Driven Architecture](../05-messaging-event-driven/event-driven-architecture.md)
- [Message Queues](../05-messaging-event-driven/message-queues.md)
- [Real-Time System Design](../09-large-scale-data-systems/real-time-system-design.md)
- [Chat System](../10-system-design-practice/chat-system.md)
- [News Feed](../10-system-design-practice/news-feed.md)
