# WebSockets vs SSE vs Long Polling
[← Back to index](../readme.md)

## What it is and why it's asked

Traditional HTTP follows a request-response model: the client sends a request, the server responds, and the connection is finished. That works well for CRUD APIs, but many modern applications need the opposite behavior—the **server must be able to push data whenever something happens**.

Examples include:

- Chat applications
- Live notifications
- Multiplayer games
- Collaborative editing
- Stock tickers
- Live sports scores
- Monitoring dashboards

Interviewers ask this topic to see whether you can **match the communication protocol to the problem** rather than always choosing WebSockets. The strongest answer isn't "WebSockets are best"—it's knowing **when they're unnecessary**.

---

# Evolution of Real-Time Communication

```
Shortest-lived connection

Short Polling
     ↓
Long Polling
     ↓
Server-Sent Events (SSE)
     ↓
WebSockets

Most powerful, but also most operationally expensive
```

---

# 1. Short Polling

The simplest approach.

The client repeatedly asks the server if anything has changed.

```
Client -> GET /messages/new
Server -> []

(wait 3 seconds)

Client -> GET /messages/new
Server -> []

(wait 3 seconds)

Client -> GET /messages/new
Server -> [{message}]
```

Every request is independent.

## Advantages

- Extremely easy to implement.
- Works everywhere.
- Stateless.
- No persistent connections.

## Disadvantages

- High latency.
- Most requests return nothing.
- Wastes CPU, bandwidth, and database queries.
- Doesn't scale well with many idle clients.

Average notification delay is approximately:

```
poll_interval / 2
```

Example:

- Poll every 10 seconds
- Average notification delay ≈ 5 seconds

---

# 2. Long Polling

Instead of immediately responding with "nothing," the server waits until either:

- new data arrives, or
- a timeout occurs.

```
Client -> GET /messages/new
             |
             |
      Server waits...
             |
      New message arrives
             |
Client <- {message}

Immediately:

Client -> GET /messages/new
```

Unlike short polling, the client always has **one outstanding request** waiting.

### Example

```python
def long_poll(user_id, timeout=30):
    deadline = time.time() + timeout

    while time.time() < deadline:
        msg = queue.pop_if_any(user_id)

        if msg:
            return msg

        time.sleep(0.5)

    return []
```

## Advantages

- Much lower latency.
- Uses ordinary HTTP.
- Works through proxies and firewalls.
- Easy fallback for older clients.

## Disadvantages

- Every waiting client consumes a connection.
- Each response requires another HTTP request.
- Extra request/response overhead compared to streaming.

Long polling was the standard solution before SSE and WebSockets became widely supported.

---

# 3. Server-Sent Events (SSE)

SSE keeps **one HTTP response permanently open**.

The server continuously writes events to that response whenever something changes.

```
Client -> GET /stream
Accept: text/event-stream

Server -> 200 OK

Connection stays open

data: {"type":"like"}

data: {"type":"comment"}

data: {"type":"notification"}
```

Unlike polling, **no new request is needed** after every message.

---

## Browser API

```javascript
const stream = new EventSource("/stream");

stream.onmessage = (event) => {
  render(JSON.parse(event.data));
};
```

---

## Automatic Reconnection

One of SSE's biggest strengths is that browsers automatically reconnect.

If the connection drops:

```
Connection Lost
      ↓
Browser reconnects
      ↓
Sends Last-Event-ID
      ↓
Server resumes streaming
```

No custom reconnect logic is necessary.

---

## Advantages

- Very simple.
- Uses plain HTTP.
- Native browser support.
- Automatic reconnection.
- Excellent for server push.

---

## Disadvantages

- One-way communication only.
- Client must send updates using normal HTTP requests.
- Text protocol only.
- Binary data requires encoding.
- HTTP/1.1 had connection limits (mostly solved by HTTP/2).

---

## Best Use Cases

- Notifications
- Dashboards
- Activity feeds
- Build logs
- Monitoring
- Stock prices
- Sports scores

---

# 4. WebSockets

WebSockets begin as HTTP but then upgrade into a completely different protocol.

After the handshake, the connection becomes a **persistent bidirectional socket**.

```
Client -> HTTP Upgrade Request

Server -> 101 Switching Protocols

==========================
Persistent WebSocket
==========================

Client -> Message

Server -> Message

Client -> Typing...

Server -> Presence Update

Either side can send at any time.
```

---

## Browser API

```javascript
const ws = new WebSocket("wss://chat.example.com/socket");

ws.onmessage = (event) => {
    render(JSON.parse(event.data));
};

ws.onopen = () => {
    ws.send(JSON.stringify({
        room: "general"
    }));
};
```

---

## Advantages

- Full duplex.
- Very low latency.
- Supports binary data.
- Excellent for interactive applications.
- One persistent connection.

---

## Disadvantages

- No automatic reconnection.
- Heartbeats required.
- Must detect dead connections.
- More difficult to scale.
- Some corporate proxies block WebSocket upgrades.

---

# Scaling WebSockets

Unlike HTTP requests, a WebSocket stays attached to one backend server.

```
             Load Balancer
                    |
          +---------+---------+
          |                   |
      Server A           Server B
          |
      Connected Client
```

If Server B needs to send data to that client, it cannot directly write to the socket.

Servers usually communicate through:

- Redis Pub/Sub
- Kafka
- NATS

```
             Redis Pub/Sub

      +-------------------------+
      |                         |
  Server A                 Server B
      |                         |
   Client A                 Client B
```

Typical production architecture:

- Sticky sessions
- Shared message bus

---

## Best Use Cases

- Chat
- Multiplayer games
- Collaborative editing
- Live cursors
- Trading systems
- Voice/video signaling

---

# Comparison Table

| Feature | Short Polling | Long Polling | SSE | WebSockets |
|----------|--------------|--------------|-----|------------|
| Communication | Client → Server | Client → Server | Server → Client | Bidirectional |
| Connection | New request every poll | One waiting request | One persistent HTTP stream | One persistent socket |
| Transport | HTTP | HTTP | HTTP | WebSocket Protocol |
| Browser Support | Universal | Universal | Excellent | Excellent |
| Auto Reconnect | N/A | Manual | Built-in | Manual |
| Binary Support | Yes | Yes | No | Yes |
| Latency | Poll interval | Near real-time | Near real-time | Real-time |
| Infrastructure Complexity | Very Low | Low | Medium | High |
| Typical Use | Status checks | Legacy real-time | Notifications | Chat & collaboration |

---

# Which One Should You Choose?

## Choose Short Polling

When:

- Updates are infrequent.
- Simplicity matters most.
- Small internal tools.
- Legacy systems.

---

## Choose Long Polling

When:

- Real-time behavior is needed.
- WebSockets or SSE aren't available.
- Maximum compatibility is required.

---

## Choose SSE

When only the **server sends updates**.

Examples:

- Notifications
- Dashboards
- Live feeds
- Monitoring
- Scoreboards

---

## Choose WebSockets

When **both client and server continuously communicate**.

Examples:

- Chat
- Multiplayer games
- Collaborative editors
- Whiteboards
- Cursor synchronization
- Trading platforms

---

# Rule of Thumb

Ask yourself one question:

> Does the client need to send data over the same real-time connection?

```
                Need Bidirectional Communication?
                       /                 \
                     Yes                 No
                      |                  |
               WebSockets             SSE
```

If real-time itself isn't necessary, polling is often the simplest solution.

---

# Common Interview Questions

## Q: Why do WebSockets often require sticky sessions?

A WebSocket connection remains attached to one backend server for its lifetime. If future messages are routed to another server, that server doesn't own the connection. Sticky sessions or a shared pub/sub system ensure messages reach the correct backend.

---

## Q: How do you scale WebSockets?

A common production architecture:

```
                Load Balancer
                      |
        +-------------+-------------+
        |                           |
    WebSocket A                WebSocket B
        |                           |
        +--------- Redis/Kafka/NATS ---------+
```

Servers exchange events through Redis, Kafka, or NATS so any server can deliver messages to clients connected elsewhere.

---

## Q: Why are WebSockets sometimes blocked by corporate networks?

WebSockets require an HTTP Upgrade handshake.

Some older proxies and firewalls only understand ordinary HTTP traffic and reject protocol upgrades. SSE and long polling remain standard HTTP traffic, so they usually pass through.

---

## Q: If SSE is better than long polling, why does long polling still exist?

Long polling remains useful when:

- `EventSource` isn't supported.
- Streaming responses aren't available.
- Infrastructure limits request duration.
- Legacy compatibility is required.

---

## Q: Does HTTP/2 improve SSE?

Yes.

HTTP/2 multiplexes many streams over a single TCP connection, removing the old HTTP/1.1 limit of roughly six simultaneous connections per domain. This makes multiple SSE streams much more practical.

---

## Q: How do you detect a dead WebSocket connection?

Use heartbeat messages.

```
Server -> Ping

Client -> Pong

(No Pong)

Connection is considered dead.
```

Heartbeats prevent the server from keeping resources allocated for clients that have silently disconnected.

---

# Interview Summary

| Requirement | Best Choice |
|-------------|-------------|
| Simple periodic updates | Short Polling |
| Legacy real-time | Long Polling |
| One-way server push | SSE |
| Bidirectional communication | WebSockets |
| Chat | WebSockets |
| Notifications | SSE |
| Multiplayer games | WebSockets |
| Live dashboards | SSE |
| Stock ticker | SSE |
| Collaborative editing | WebSockets |

### One-line takeaway

> **Use the simplest protocol that satisfies the communication pattern: Polling for simple periodic updates, SSE for one-way server push, and WebSockets only when true bidirectional communication is required.**

## Related topics
- [REST vs GraphQL vs gRPC](rest-vs-graphql-vs-grpc.md)
- [Load Balancing](../01-scaling-traffic/load-balancing.md)
- [Backpressure](../01-scaling-traffic/backpressure.md)
- [Event-Driven Architecture](../05-messaging-event-driven/event-driven-architecture.md)
- [Message Queues](../05-messaging-event-driven/message-queues.md)
- [Real-Time System Design](../09-large-scale-data-systems/real-time-system-design.md)
- [Chat System](../10-system-design-practice/chat-system.md)
- [News Feed](../10-system-design-practice/news-feed.md)
