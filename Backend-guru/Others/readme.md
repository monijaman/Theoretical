# Real-Time Communication: Extra Topics

Use this section to connect live updates, WebSocket scaling, and media delivery. These systems share networking concerns, but sending a chat event and distributing live video require different components.

## Start Here

Understand basic HTTP and asynchronous messages first. Then read [communication protocols](../System%20Design/06-communication-protocols/readme.md) to compare WebSockets, server-sent events, and request-response APIs.

## Topics to Explore

| Topic | What it helps you understand | Read next |
| --- | --- | --- |
| WebRTC architecture | How peers establish a real-time media connection and handle network traversal. | [Real-time system design](../System%20Design/09-large-scale-data-systems/real-time-system-design.md) |
| Redis Pub/Sub | How connected subscribers receive broadcasts across application instances. | [Redis patterns](../Redis%20Deep%20Dive/readme.md) |
| Socket.IO scaling | How several servers coordinate rooms and event delivery. | [Interview: scaling WebSockets](../Interview/readme.md#8-scaling-websockets) |
| Live-streaming pipeline | How media moves from capture through processing to playback. | [YouTube design exercise](../System%20Design/10-system-design-practice/youtube.md) |

## Example to Reason About

Imagine a live class with video and chat. Draw the chat path separately from the video path. Identify where users authenticate, where messages are routed, and what happens when a viewer reconnects.

Start with these questions:

- Which events need to be stored for later replay?
- What state is shared when two viewers connect to different servers?
- How does a viewer recover missed messages after reconnecting?
- How would you measure delay and failed delivery?

## Practice Check

Explain why a broadcast mechanism alone is not a durable chat history. Then compare a small interactive video call with a broadcast watched by thousands of people.

[Backend learning guide](../readme.md)
