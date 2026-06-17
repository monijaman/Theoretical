# Server-Sent Events (SSE)

## Table of Contents
- [What are Server-Sent Events?](#what-are-server-sent-events)
- [How SSE Works](#how-sse-works)
- [Key Characteristics](#key-characteristics)
- [When to Use SSE](#when-to-use-sse)
- [SSE vs WebSockets vs Polling](#sse-vs-websockets-vs-polling)
- [Implementation Examples](#implementation-examples)
- [Advantages](#advantages)
- [Disadvantages](#disadvantages)
- [Best Practices](#best-practices)
- [Real-World Use Cases](#real-world-use-cases)

---

## What are Server-Sent Events?

**Server-Sent Events (SSE)** is a server push technology that enables a server to push real-time updates to the client over a single, long-lived HTTP connection. Unlike traditional HTTP requests where the client must poll the server for updates, SSE allows the server to send data to the client whenever new information is available.

SSE is part of the HTML5 specification and uses the `EventSource` API on the client side.

### Core Concept
- **Unidirectional communication**: Server → Client only
- **Built on HTTP**: Uses standard HTTP protocol
- **Text-based protocol**: Data is sent as UTF-8 text
- **Automatic reconnection**: Built-in reconnection mechanism

---

## How SSE Works

### Connection Flow

```
Client                          Server
  |                               |
  |------ HTTP Request --------→ |
  |   (Accept: text/event-stream) |
  |                               |
  |←----- HTTP Response --------- |
  |   (Content-Type:              |
  |    text/event-stream)         |
  |                               |
  |←----- Event Data ------------ |
  |←----- Event Data ------------ |
  |←----- Event Data ------------ |
  |         (connection stays     |
  |          open)                |
```

### Event Stream Format

SSE uses a specific text format for messages:

```
data: This is a message
data: It can span multiple lines

event: customEvent
data: {"user": "John", "message": "Hello"}
id: 1
retry: 10000

data: Another message
```

**Field Types:**
- `data:` - The message payload (required)
- `event:` - Event type/name (optional, defaults to "message")
- `id:` - Event ID for tracking (optional)
- `retry:` - Reconnection time in milliseconds (optional)
- Empty line - Marks the end of an event

---

## Key Characteristics

### 1. **HTTP-Based**
- Uses standard HTTP/1.1 or HTTP/2
- Works through proxies and firewalls
- No special protocol required

### 2. **Automatic Reconnection**
- If connection drops, EventSource automatically reconnects
- Last-Event-ID header sent on reconnection
- Configurable retry interval

### 3. **UTF-8 Text Only**
- Sends text data (usually JSON)
- No binary data support
- Efficient for most use cases

### 4. **Browser Support**
- Supported in all modern browsers
- Polyfills available for older browsers
- Not natively supported in IE (use polyfill)

### 5. **Connection Limits**
- Browser limit: ~6 connections per domain (HTTP/1.1)
- HTTP/2 allows more concurrent connections
- Uses one connection per EventSource

---

## When to Use SSE

### ✅ Ideal Use Cases

1. **Real-time Updates** (Server → Client)
   - Live news feeds
   - Stock price updates
   - Social media notifications
   - Live sports scores

2. **Real-time Dashboards**
   - System monitoring dashboards
   - Analytics dashboards
   - Server metrics

3. **Live Notifications**
   - User notifications
   - Alert systems
   - Toast/banner messages

4. **Activity Streams**
   - Social media feeds
   - Activity logs
   - Audit trails

5. **Progress Tracking**
   - File upload progress
   - Build/deployment status
   - Long-running task updates

### ❌ When NOT to Use SSE

- **Bidirectional communication needed** → Use WebSockets
- **Binary data transfer** → Use WebSockets
- **Client needs to send frequent updates** → Use WebSockets or HTTP API
- **Very high-frequency updates** → Use WebSockets
- **Need IE support without polyfills** → Consider alternatives

---

## SSE vs WebSockets vs Polling

| Feature | SSE | WebSockets | Long Polling |
|---------|-----|------------|--------------|
| **Communication** | Unidirectional (Server→Client) | Bidirectional (Client↔Server) | Request-Response |
| **Protocol** | HTTP | WebSocket (ws://) | HTTP |
| **Connection** | Single HTTP connection | Persistent WebSocket | Multiple HTTP requests |
| **Reconnection** | Automatic | Manual implementation | Automatic per request |
| **Browser Support** | Modern browsers | All modern browsers | Universal |
| **Firewall/Proxy** | Works well | May be blocked | Works well |
| **Data Format** | Text (UTF-8) | Text or Binary | Any |
| **Resource Usage** | Low | Medium | High |
| **Complexity** | Simple | Moderate | Simple |
| **Latency** | Low | Very Low | Moderate-High |
| **Overhead** | Low | Very Low | High |

### Decision Matrix

```
Need bidirectional? ────→ YES ────→ WebSockets
         │
         NO
         │
         ↓
Need binary data? ────→ YES ────→ WebSockets
         │
         NO
         │
         ↓
Simple server push? ───→ YES ────→ SSE
         │
         NO
         │
         ↓
    Use REST API + Polling
```

---

## Implementation Examples

### Backend Implementation

#### Node.js with Express

```javascript
const express = require('express');
const app = express();

// SSE endpoint
app.get('/events', (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial connection message
  res.write('data: Connected to SSE\n\n');

  // Send periodic updates
  const intervalId = setInterval(() => {
    const data = {
      time: new Date().toISOString(),
      value: Math.random() * 100
    };

    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }, 2000);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
});

app.listen(3000, () => {
  console.log('SSE server running on port 3000');
});
```

#### With Custom Events and IDs

```javascript
app.get('/notifications', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let eventId = 0;

  const sendEvent = (eventName, data) => {
    eventId++;
    res.write(`id: ${eventId}\n`);
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n`);
    res.write(`retry: 10000\n\n`);
  };

  // Send different types of events
  setInterval(() => {
    sendEvent('notification', {
      type: 'info',
      message: 'System update available'
    });
  }, 5000);

  setInterval(() => {
    sendEvent('heartbeat', {
      timestamp: Date.now()
    });
  }, 15000);

  req.on('close', () => {
    res.end();
  });
});
```

#### Python with Flask

```python
from flask import Flask, Response
import json
import time
import threading

app = Flask(__name__)

@app.route('/stream')
def stream():
    def event_stream():
        count = 0
        while True:
            count += 1
            data = {
                'count': count,
                'timestamp': time.time()
            }
            yield f"data: {json.dumps(data)}\n\n"
            time.sleep(2)
    
    return Response(
        event_stream(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )

if __name__ == '__main__':
    app.run(debug=True, threaded=True)
```

#### Go Example

```go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "time"
)

func sseHandler(w http.ResponseWriter, r *http.Request) {
    // Set SSE headers
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")
    w.Header().Set("Access-Control-Allow-Origin", "*")

    flusher, ok := w.(http.Flusher)
    if !ok {
        http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
        return
    }

    // Send events
    ticker := time.NewTicker(2 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-r.Context().Done():
            return
        case t := <-ticker.C:
            data := map[string]interface{}{
                "time": t.Format(time.RFC3339),
                "value": time.Now().Unix(),
            }
            jsonData, _ := json.Marshal(data)
            fmt.Fprintf(w, "data: %s\n\n", jsonData)
            flusher.Flush()
        }
    }
}

func main() {
    http.HandleFunc("/events", sseHandler)
    http.ListenAndServe(":8080", nil)
}
```

### Frontend Implementation

#### Basic JavaScript

```javascript
// Create EventSource connection
const eventSource = new EventSource('http://localhost:3000/events');

// Listen for messages (default event)
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
  
  // Update UI
  document.getElementById('output').textContent = JSON.stringify(data, null, 2);
};

// Listen for connection open
eventSource.onopen = () => {
  console.log('Connection opened');
};

// Listen for errors
eventSource.onerror = (error) => {
  console.error('EventSource error:', error);
  
  if (eventSource.readyState === EventSource.CLOSED) {
    console.log('Connection closed');
  }
};

// Close connection when needed
// eventSource.close();
```

#### With Custom Event Types

```javascript
const eventSource = new EventSource('/notifications');

// Listen for custom 'notification' events
eventSource.addEventListener('notification', (event) => {
  const data = JSON.parse(event.data);
  showNotification(data.type, data.message);
});

// Listen for 'heartbeat' events
eventSource.addEventListener('heartbeat', (event) => {
  const data = JSON.parse(event.data);
  updateHeartbeat(data.timestamp);
});

// Default message handler
eventSource.onmessage = (event) => {
  console.log('Default message:', event.data);
};

// Error handling
eventSource.onerror = (error) => {
  if (error.eventPhase === EventSource.CLOSED) {
    console.log('Connection was closed');
  }
};
```

#### React Hook Example

```javascript
import { useEffect, useState } from 'react';

function useSSE(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setData(parsed);
      } catch (err) {
        setData(event.data);
      }
    };

    eventSource.onerror = (err) => {
      setError(err);
      setIsConnected(false);
    };

    // Cleanup
    return () => {
      eventSource.close();
    };
  }, [url]);

  return { data, error, isConnected };
}

// Usage
function Dashboard() {
  const { data, error, isConnected } = useSSE('/api/events');

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {error && <div>Error: {error.message}</div>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
```

#### Vue.js Composition API

```javascript
import { ref, onMounted, onUnmounted } from 'vue';

export function useSSE(url) {
  const data = ref(null);
  const error = ref(null);
  const isConnected = ref(false);
  let eventSource = null;

  onMounted(() => {
    eventSource = new EventSource(url);

    eventSource.onopen = () => {
      isConnected.value = true;
      error.value = null;
    };

    eventSource.onmessage = (event) => {
      try {
        data.value = JSON.parse(event.data);
      } catch (err) {
        data.value = event.data;
      }
    };

    eventSource.onerror = (err) => {
      error.value = err;
      isConnected.value = false;
    };
  });

  onUnmounted(() => {
    if (eventSource) {
      eventSource.close();
    }
  });

  return { data, error, isConnected };
}
```

---

## Advantages

### 1. **Simplicity**
- Built on HTTP - no new protocol to learn
- Native browser API (`EventSource`)
- Straightforward server implementation

### 2. **Automatic Reconnection**
- Built-in reconnection logic
- Configurable retry intervals
- Last-Event-ID for resuming streams

### 3. **Resource Efficient**
- Single HTTP connection
- Lower overhead than polling
- Efficient for one-way communication

### 4. **Firewall Friendly**
- Uses standard HTTP/HTTPS
- Works through most proxies
- No special port requirements

### 5. **Event IDs & Tracking**
- Built-in message IDs
- Can resume from last received message
- Useful for event sourcing

### 6. **Named Events**
- Support for custom event types
- Can have multiple event listeners
- Better event organization

### 7. **Better Than Polling**
- Lower latency
- Reduced server load
- Less network overhead

---

## Disadvantages

### 1. **Unidirectional Only**
- Server → Client only
- Client must use separate API calls to send data
- Not suitable for chat applications

### 2. **Browser Connection Limits**
- HTTP/1.1: ~6 connections per domain
- Can be limiting for multiple SSE streams
- HTTP/2 improves this

### 3. **No Binary Data**
- Text-only (UTF-8)
- Binary data must be base64 encoded
- Increases payload size

### 4. **IE Not Supported**
- No native support in Internet Explorer
- Requires polyfills
- May have compatibility issues

### 5. **Buffering Issues**
- Some proxies/servers buffer responses
- Can delay event delivery
- Requires specific server configuration

### 6. **No Built-in Authentication**
- Must implement custom auth
- Cookie-based auth common
- Token in URL or headers

---

## Best Practices

### Server-Side

#### 1. **Set Proper Headers**
```javascript
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
```

#### 2. **Implement Heartbeat**
```javascript
// Send periodic heartbeat to keep connection alive
const heartbeatInterval = setInterval(() => {
  res.write(': heartbeat\n\n'); // Comment line, ignored by client
}, 30000);
```

#### 3. **Handle Client Disconnection**
```javascript
req.on('close', () => {
  clearInterval(heartbeatInterval);
  // Cleanup resources
  console.log('Client disconnected');
});
```

#### 4. **Use Event IDs**
```javascript
let eventId = 0;
res.write(`id: ${++eventId}\n`);
res.write(`data: ${JSON.stringify(data)}\n\n`);
```

#### 5. **Set Retry Time**
```javascript
// Set reconnection time (milliseconds)
res.write('retry: 5000\n');
```

### Client-Side

#### 1. **Error Handling**
```javascript
eventSource.onerror = (error) => {
  if (error.eventPhase === EventSource.CLOSED) {
    // Connection closed permanently
    console.log('Connection lost');
  } else {
    // Temporary error, will retry
    console.log('Connection error, retrying...');
  }
};
```

#### 2. **Always Close Connections**
```javascript
// When component unmounts or page unloads
window.addEventListener('beforeunload', () => {
  eventSource.close();
});
```

#### 3. **Handle Reconnection**
```javascript
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

eventSource.onerror = () => {
  reconnectAttempts++;
  if (reconnectAttempts > maxReconnectAttempts) {
    eventSource.close();
    console.log('Max reconnection attempts reached');
  }
};

eventSource.onopen = () => {
  reconnectAttempts = 0;
};
```

#### 4. **Authentication**
```javascript
// Pass token in URL (if appropriate)
const eventSource = new EventSource(`/events?token=${authToken}`);

// Or use credentials
const eventSource = new EventSource('/events', {
  withCredentials: true
});
```

### Performance

#### 1. **Connection Pooling**
- Reuse EventSource instances
- Close unused connections
- Consider sharing one connection for multiple components

#### 2. **Compression**
```javascript
// Enable gzip compression
app.use(compression());
```

#### 3. **Efficient Data Format**
- Send only necessary data
- Use compact JSON
- Consider data batching for high-frequency updates

#### 4. **Rate Limiting**
```javascript
// Implement throttling/debouncing
let lastSent = 0;
const MIN_INTERVAL = 100; // ms

function sendUpdate(data) {
  const now = Date.now();
  if (now - lastSent >= MIN_INTERVAL) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    lastSent = now;
  }
}
```

---

## Real-World Use Cases

### 1. **Live News Feed**
```javascript
// Server
app.get('/news-feed', (req, res) => {
  setupSSE(res);
  
  newsEmitter.on('article', (article) => {
    res.write(`event: new-article\n`);
    res.write(`data: ${JSON.stringify(article)}\n\n`);
  });
});

// Client
eventSource.addEventListener('new-article', (e) => {
  const article = JSON.parse(e.data);
  addArticleToFeed(article);
});
```

### 2. **Stock Price Ticker**
```javascript
// Server
app.get('/stock-prices', (req, res) => {
  setupSSE(res);
  
  setInterval(() => {
    const prices = getLatestStockPrices();
    res.write(`data: ${JSON.stringify(prices)}\n\n`);
  }, 1000);
});

// Client
eventSource.onmessage = (e) => {
  const prices = JSON.parse(e.data);
  updateStockDisplay(prices);
};
```

### 3. **Notification System**
```javascript
// Server
app.get('/notifications/:userId', (req, res) => {
  setupSSE(res);
  
  const userId = req.params.userId;
  
  notificationEmitter.on(`user-${userId}`, (notification) => {
    res.write(`id: ${notification.id}\n`);
    res.write(`event: ${notification.type}\n`);
    res.write(`data: ${JSON.stringify(notification)}\n\n`);
  });
});

// Client
const eventSource = new EventSource(`/notifications/${currentUserId}`);

eventSource.addEventListener('message', handleMessage);
eventSource.addEventListener('alert', handleAlert);
eventSource.addEventListener('update', handleUpdate);
```

### 4. **Live Dashboard/Monitoring**
```javascript
// Server
app.get('/metrics', (req, res) => {
  setupSSE(res);
  
  const interval = setInterval(async () => {
    const metrics = await getSystemMetrics();
    res.write(`data: ${JSON.stringify(metrics)}\n\n`);
  }, 5000);
  
  req.on('close', () => clearInterval(interval));
});

// Client
const eventSource = new EventSource('/metrics');

eventSource.onmessage = (e) => {
  const metrics = JSON.parse(e.data);
  updateChart(metrics.cpu, metrics.memory, metrics.requests);
};
```

### 5. **Build/Deploy Progress**
```javascript
// Server
async function streamBuildProgress(buildId, res) {
  setupSSE(res);
  
  const build = await startBuild(buildId);
  
  build.on('progress', (progress) => {
    res.write(`data: ${JSON.stringify({
      status: 'progress',
      percentage: progress,
      stage: build.currentStage
    })}\n\n`);
  });
  
  build.on('complete', (result) => {
    res.write(`data: ${JSON.stringify({
      status: 'complete',
      result
    })}\n\n`);
    res.end();
  });
}

// Client
const eventSource = new EventSource(`/build/${buildId}/stream`);

eventSource.onmessage = (e) => {
  const update = JSON.parse(e.data);
  
  if (update.status === 'progress') {
    updateProgressBar(update.percentage);
    updateStageText(update.stage);
  } else if (update.status === 'complete') {
    showCompletionMessage(update.result);
    eventSource.close();
  }
};
```

---

## Security Considerations

### 1. **Authentication & Authorization**
```javascript
// Using token authentication
app.get('/events', authenticateToken, (req, res) => {
  setupSSE(res);
  // Send events specific to authenticated user
});

function authenticateToken(req, res, next) {
  const token = req.query.token || req.headers.authorization;
  if (!isValidToken(token)) {
    return res.status(401).send('Unauthorized');
  }
  next();
}
```

### 2. **Rate Limiting**
```javascript
const rateLimit = require('express-rate-limit');

const sseLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // limit each IP to 5 requests per windowMs
});

app.get('/events', sseLimit, (req, res) => {
  setupSSE(res);
});
```

### 3. **CORS Configuration**
```javascript
app.get('/events', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://trusted-domain.com');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  setupSSE(res);
});
```

### 4. **Input Validation**
```javascript
// Validate user input to prevent injection
app.get('/events/:channel', (req, res) => {
  const channel = sanitize(req.params.channel);
  if (!isValidChannel(channel)) {
    return res.status(400).send('Invalid channel');
  }
  setupSSE(res);
});
```

---

## Debugging Tips

### 1. **Chrome DevTools**
- Network tab → EventStream tab
- Shows all received events
- Displays event data and timing

### 2. **Server Logs**
```javascript
app.get('/events', (req, res) => {
  console.log(`New SSE connection from ${req.ip}`);
  setupSSE(res);
  
  req.on('close', () => {
    console.log(`SSE connection closed for ${req.ip}`);
  });
});
```

### 3. **Client Monitoring**
```javascript
const eventSource = new EventSource('/events');

eventSource.addEventListener('open', () => {
  console.log('Connection established');
});

eventSource.addEventListener('error', (e) => {
  console.log('ReadyState:', eventSource.readyState);
  console.log('Error:', e);
});
```

### 4. **Buffering Issues**
```nginx
# Nginx configuration to disable buffering
location /events {
    proxy_pass http://backend;
    proxy_set_header Connection '';
    proxy_http_version 1.1;
    chunked_transfer_encoding off;
    proxy_buffering off;
    proxy_cache off;
}
```

---

## Summary

**Server-Sent Events** provide a simple, efficient way to push real-time updates from server to client using standard HTTP. They're ideal for:

✅ One-way real-time updates  
✅ Live notifications and feeds  
✅ Progress tracking  
✅ System monitoring dashboards  

Choose SSE when you need **simple, unidirectional server-to-client communication**. For bidirectional communication or binary data, consider WebSockets instead.

**Key Takeaways:**
- Built on HTTP, firewall-friendly
- Automatic reconnection handling
- Lower complexity than WebSockets
- Perfect for push notifications and live updates
- Not suitable for bidirectional communication
- Text-only format (UTF-8)
