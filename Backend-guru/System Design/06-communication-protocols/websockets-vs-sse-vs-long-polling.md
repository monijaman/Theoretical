# WebSockets vs SSE vs Long Polling
[← Back to index](../readme.md)

## What it is and why it's asked

Traditional HTTP follows a request-response model: the client asks, the server responds, and the interaction ends. Modern applications such as chat, live notifications, collaborative editing, stock tickers, multiplayer games, and monitoring dashboards need something different—the server must be able to push updates whenever they occur.

Interviewers ask this topic to see whether you can choose the simplest protocol that satisfies the requirements. A common mistake is defaulting to WebSockets for every real-time feature. In reality, WebSockets are the most powerful option, but also the most operationally expensive. If communication is only one-way, SSE is often a better choice.

---

## Short Polling

The client periodically asks the server whether anything has changed.

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

### Advantages

- Extremely simple to implement.
- Works with every browser, proxy, CDN, and HTTP server.
- Completely stateless.

### Disadvantages

- High latency. New data waits until the next poll.
- Most requests return nothing.
- Wastes CPU, bandwidth, and database queries.
- Doesn't scale well with thousands of idle clients.

Average notification delay is roughly half the polling interval.

---

## Long Polling

Instead of immediately responding with "nothing," the server keeps the HTTP request open until new data becomes available or a timeout occurs.

```
Client -> GET /messages/new
             |
             | (server waits)
             |
      New message arrives
             |
Client <- {message}

Client immediately sends another request.
```

Example:

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

### Advantages

- Much lower latency than short polling.
- Uses ordinary HTTP.
- Works through nearly every proxy and firewall.
- Easy fallback for older systems.

### Disadvantages

- Every waiting client occupies a connection.
- Every response requires opening another HTTP request.
- Additional HTTP headers and request processing on every reconnect.
- Less efficient than persistent streaming.

Long polling was the dominant real-time technique before browsers widely supported SSE and WebSockets.

---

## Server-Sent Events (SSE)

SSE creates one long-lived HTTP connection where the server continuously streams events to the client.

```
Client -> GET /stream
Accept: text/event-stream

Server -> 200 OK
Connection remains open

data: {"type":"like","count":42}

data: {"type":"comment","user":"alice"}

data: {"type":"like","count":43}
```

Browser support is built into the `EventSource` API.

```javascript
const stream = new EventSource("/stream");

stream.onmessage = (event) => {
  render(JSON.parse(event.data));
};
```

### Automatic reconnection

One of SSE's biggest strengths is automatic recovery.

If the connection drops:

- the browser reconnects automatically,
- it sends the last received event ID,
- the server can resume from that point.

No custom reconnect logic is required.

### Advantages

- Simple API.
- Uses plain HTTP.
- Automatic reconnection built into browsers.
- Ideal for server-to-client updates.
- Easier infrastructure than WebSockets.

### Disadvantages

- One-way only.
- Client must use normal HTTP requests to send data.
- Text protocol only.
- Binary data must be encoded.
- Older HTTP/1.1 browsers limited concurrent connections (mostly solved by HTTP/2).

### Best use cases

- Notifications
- Live dashboards
- Stock prices
- Sports scores
- Build logs
- Monitoring systems

---

## WebSockets

WebSockets upgrade an HTTP connection into a persistent full-duplex TCP connection.

After the initial handshake, HTTP disappears and both sides can send messages independently.

```
Client -> HTTP Upgrade Request

Server -> 101 Switching Protocols

=============================
Persistent WebSocket Connection
=============================

Client -> {"message":"Hi"}

Server -> {"message":"Hello"}

Client -> {"typing":true}

Server -> {"presence":"online"}
```

Example:

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

### Advantages

- Full duplex.
- Extremely low latency.
- Persistent connection.
- Supports binary and text messages.
- Ideal for highly interactive applications.

### Disadvantages

- No automatic reconnection.
- Application must implement:
  - reconnect logic
  - heartbeat (ping/pong)
  - missed-message recovery
- Long-lived stateful connections complicate scaling.
- May be blocked by restrictive corporate proxies.

### Scaling challenge

A client remains connected to one backend server.

```
Load Balancer

        |
   +----+----+
   |         |
Server A   Server B
   |
 Client
```

If another server needs to send data to that client, servers typically communicate through Redis Pub/Sub, Kafka, NATS, or another message bus.

Large deployments usually combine:

- Sticky sessions
- Shared pub/sub infrastructure

### Best use cases

- Chat
- Multiplayer games
- Collaborative editing
- Live cursor sharing
- Trading platforms
- Voice/video signaling

---

## Feature Comparison

| Feature | Short Polling | Long Polling | SSE | WebSockets |
|----------|--------------|--------------|-----|------------|
| Direction | Client → Server | Client → Server | Server → Client | Bidirectional |
| Connection | New request every poll | One waiting request | One persistent HTTP stream | One persistent socket |
| Transport | HTTP | HTTP | HTTP | WebSocket protocol |
| Browser Support | Universal | Universal | Excellent | Excellent |
| Auto Reconnect | N/A | Manual | Built-in | Manual |
| Latency | Poll interval | Near real-time | Near real-time | Real-time |
| Binary Support | Yes | Yes | No | Yes |
| Scaling | Easy | Moderate | Moderate | Harder |
| Typical Use | Status checks | Legacy real-time | Notifications | Chat & collaboration |

---

## When to Choose Each

### Choose Short Polling when

- Updates are infrequent.
- Simplicity matters more than efficiency.
- Small applications.
- Legacy systems.

---

### Choose Long Polling when

- Real-time behavior is needed.
- WebSockets or SSE aren't available.
- Compatibility is the highest priority.

---

### Choose SSE when

- Only the server pushes updates.
- Automatic reconnection is valuable.
- Simplicity is preferred over bidirectional communication.

Examples:

- Notifications
- Live feeds
- Dashboards
- Monitoring
- Scoreboards

---

### Choose WebSockets when

Both client and server need to communicate continuously.

Examples:

- Chat
- Multiplayer games
- Collaborative editors
- Whiteboards
- Live cursor synchronization
- Financial trading interfaces

---

## Rule of Thumb

Ask one question:

> Does the client need to send messages over the same real-time connection?

- **No → Use SSE**
- **Yes → Use WebSockets**

If real-time isn't critical, polling is often sufficient.

---

## Common Interview Questions

### Q: Why do WebSockets often require sticky sessions?

Each connection stays attached to one backend server. If later messages reach another server, that server doesn't own the socket. Sticky sessions or a shared pub/sub system ensure messages reach the correct backend.

---

### Q: How do you scale WebSockets?

A common architecture is:

```
                Load Balancer
                      |
        +-------------+-------------+
        |                           |
    WebSocket A                WebSocket B
        |                           |
        +----------- Redis/Kafka/NATS -----------+
```

Servers exchange messages through Redis Pub/Sub, Kafka, or NATS so any server can deliver messages to its connected clients.

---

### Q: Why do some corporate networks block WebSockets?

WebSockets require an HTTP Upgrade handshake. Some older proxies and firewalls only understand standard HTTP traffic and reject upgraded connections. SSE and long polling remain normal HTTP traffic, so they usually pass through.

---

### Q: If SSE is simpler, why does long polling still exist?

Long polling works in environments where:

- `EventSource` isn't available,
- streaming responses aren't supported,
- infrastructure limits request duration,
- legacy compatibility is important.

---

### Q: Does HTTP/2 improve SSE?

Yes.

HTTP/2 multiplexes many streams over one TCP connection, eliminating the old browser limitation of around six simultaneous HTTP/1.1 connections per domain. This makes SSE significantly more practical for applications with multiple live streams.

---

### Q: How do you detect a dead WebSocket connection?

Use heartbeat messages.

The server periodically sends a ping and expects a pong within a timeout.

```
Server -> Ping

Client -> Pong

(no pong)

Connection considered dead
```

Without heartbeats, TCP may keep a broken connection appearing alive for several minutes.

## Related topics
- [REST vs GraphQL vs gRPC](rest-vs-graphql-vs-grpc.md)
- [Load Balancing](../01-scaling-traffic/load-balancing.md)
- [Backpressure](../01-scaling-traffic/backpressure.md)
- [Event-Driven Architecture](../05-messaging-event-driven/event-driven-architecture.md)
- [Message Queues](../05-messaging-event-driven/message-queues.md)
- [Real-Time System Design](../09-large-scale-data-systems/real-time-system-design.md)
- [Chat System](../10-system-design-practice/chat-system.md)
- [News Feed](../10-system-design-practice/news-feed.md)
