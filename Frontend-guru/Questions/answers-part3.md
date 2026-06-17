# Frontend Interview Questions Answers - Part 3 (Questions 26-30)

## 𝗙𝗿𝗼𝗻𝘁𝗲𝗻𝗱 𝗦𝘆𝘀𝘁𝗲𝗺 𝗗𝗲𝘀𝗶𝗴𝗻 (continued)

### 26. Infinite scroll for millions of items

```javascript
// CHALLENGE: Handle millions of items without freezing browser

// SOLUTION OVERVIEW:
/*
1. Virtual scrolling (only render visible items)
2. Intersection Observer API (detect when to load more)
3. Pagination with cursor-based approach
4. Efficient data structure (avoid huge arrays)
5. Debounce/throttle scroll events
6. Preload next page before user reaches end
*/

// IMPLEMENTATION:

// 1. Basic Infinite Scroll with Intersection Observer
function useInfiniteScroll(callback, options = {}) {
  const observerRef = useRef();
  const { threshold = 0.5, rootMargin = '100px' } = options;
  
  const targetRef = useCallback((node) => {
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          callback();
        }
      },
      { threshold, rootMargin }
    );
    
    if (node) observerRef.current.observe(node);
  }, [callback, threshold, rootMargin]);
  
  return targetRef;
}

// Usage:
function InfiniteList() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const loadMore = async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    const newItems = await fetchItems(page, 50);
    
    setItems(prev => [...prev, ...newItems]);
    setHasMore(newItems.length > 0);
    setPage(p => p + 1);
    setLoading(false);
  };
  
  const sentinelRef = useInfiniteScroll(loadMore, {
    rootMargin: '200px' // Load 200px before reaching end
  });
  
  return (
    <div>
      {items.map(item => (
        <ItemCard key={item.id} item={item} />
      ))}
      
      {loading && <Spinner />}
      
      {hasMore && <div ref={sentinelRef} style={{ height: 10 }} />}
      
      {!hasMore && <div>No more items</div>}
    </div>
  );
}

// 2. CURSOR-BASED PAGINATION (for millions of items)
// Avoids performance issues with large OFFSET values

// Backend (Node.js + MongoDB example)
app.get('/api/items', async (req, res) => {
  const { cursor, limit = 50 } = req.query;
  
  const query = cursor ? { _id: { $gt: cursor } } : {};
  
  const items = await Item.find(query)
    .sort({ _id: 1 })
    .limit(parseInt(limit));
  
  const nextCursor = items.length > 0 
    ? items[items.length - 1]._id 
    : null;
  
  res.json({
    items,
    nextCursor,
    hasMore: items.length === parseInt(limit)
  });
});

// Frontend with cursor-based pagination
function useCursorPagination(endpoint, limit = 50) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const loadMore = async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    const params = new URLSearchParams({ limit });
    if (cursor) params.append('cursor', cursor);
    
    const response = await fetch(`${endpoint}?${params}`);
    const data = await response.json();
    
    setItems(prev => [...prev, ...data.items]);
    setCursor(data.nextCursor);
    setHasMore(data.hasMore);
    setLoading(false);
  };
  
  return { items, loadMore, loading, hasMore };
}

// 3. VIRTUAL SCROLLING for better performance
// Using @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualInfiniteScroll() {
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const parentRef = useRef(null);
  
  const virtualizer = useVirtualizer({
    count: hasMore ? items.length + 1 : items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated item height
    overscan: 5 // Render 5 extra items outside viewport
  });
  
  const virtualItems = virtualizer.getVirtualItems();
  
  // Load more when scrolling near end
  useEffect(() => {
    const [lastItem] = [...virtualItems].reverse();
    
    if (!lastItem) return;
    
    if (
      lastItem.index >= items.length - 1 &&
      hasMore &&
      !loading
    ) {
      loadMore();
    }
  }, [hasMore, loading, items.length, virtualItems]);
  
  const loadMore = async () => {
    setLoading(true);
    const newItems = await fetchItems(items.length, 50);
    setItems(prev => [...prev, ...newItems]);
    setHasMore(newItems.length > 0);
    setLoading(false);
  };
  
  return (
    <div
      ref={parentRef}
      style={{ height: '800px', overflow: 'auto' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative'
        }}
      >
        {virtualItems.map(virtual => {
          const item = items[virtual.index];
          
          return (
            <div
              key={virtual.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtual.size}px`,
                transform: `translateY(${virtual.start}px)`
              }}
            >
              {item ? (
                <ItemCard item={item} />
              ) : (
                <div>Loading...</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 4. BIDIRECTIONAL INFINITE SCROLL
// Load both up and down (like social feeds)
function BidirectionalScroll() {
  const [items, setItems] = useState([]);
  const [topCursor, setTopCursor] = useState(null);
  const [bottomCursor, setBottomCursor] = useState(null);
  const [hasMoreTop, setHasMoreTop] = useState(true);
  const [hasMoreBottom, setHasMoreBottom] = useState(true);
  
  const containerRef = useRef();
  const previousScrollHeight = useRef(0);
  
  const loadTop = async () => {
    const scrollContainer = containerRef.current;
    previousScrollHeight.current = scrollContainer.scrollHeight;
    
    const newItems = await fetchItems('up', topCursor, 50);
    
    setItems(prev => [...newItems, ...prev]);
    setTopCursor(newItems[0]?.id);
    setHasMoreTop(newItems.length > 0);
    
    // Maintain scroll position
    requestAnimationFrame(() => {
      const newScrollHeight = scrollContainer.scrollHeight;
      scrollContainer.scrollTop += newScrollHeight - previousScrollHeight.current;
    });
  };
  
  const loadBottom = async () => {
    const newItems = await fetchItems('down', bottomCursor, 50);
    
    setItems(prev => [...prev, ...newItems]);
    setBottomCursor(newItems[newItems.length - 1]?.id);
    setHasMoreBottom(newItems.length > 0);
  };
  
  const topSentinel = useInfiniteScroll(loadTop);
  const bottomSentinel = useInfiniteScroll(loadBottom);
  
  return (
    <div ref={containerRef} style={{ height: '100vh', overflow: 'auto' }}>
      {hasMoreTop && <div ref={topSentinel}>Loading older...</div>}
      
      {items.map(item => (
        <ItemCard key={item.id} item={item} />
      ))}
      
      {hasMoreBottom && <div ref={bottomSentinel}>Loading newer...</div>}
    </div>
  );
}

// 5. WINDOWED/CHUNKED APPROACH (keep only visible data in memory)
function WindowedInfiniteScroll() {
  const [window, setWindow] = useState({ start: 0, end: 100 });
  const [items, setItems] = useState(new Map()); // Use Map for efficient lookups
  const [totalCount, setTotalCount] = useState(0);
  
  const loadRange = async (start, end) => {
    const newItems = await fetchItemRange(start, end);
    
    setItems(prev => {
      const updated = new Map(prev);
      newItems.forEach((item, index) => {
        updated.set(start + index, item);
      });
      
      // Cleanup: Remove items far from current window
      for (let key of updated.keys()) {
        if (key < start - 200 || key > end + 200) {
          updated.delete(key);
        }
      }
      
      return updated;
    });
  };
  
  const handleScroll = useCallback(
    throttle((scrollPosition, containerHeight) => {
      const itemHeight = 100;
      const visibleStart = Math.floor(scrollPosition / itemHeight);
      const visibleEnd = Math.ceil((scrollPosition + containerHeight) / itemHeight);
      
      const bufferSize = 50;
      const newStart = Math.max(0, visibleStart - bufferSize);
      const newEnd = Math.min(totalCount, visibleEnd + bufferSize);
      
      if (newStart !== window.start || newEnd !== window.end) {
        setWindow({ start: newStart, end: newEnd });
        loadRange(newStart, newEnd);
      }
    }, 200),
    [window, totalCount]
  );
  
  return (
    <div
      onScroll={(e) => {
        handleScroll(e.target.scrollTop, e.target.clientHeight);
      }}
      style={{ height: '100vh', overflow: 'auto' }}
    >
      <div style={{ height: totalCount * 100 }}>
        {Array.from({ length: window.end - window.start }, (_, i) => {
          const index = window.start + i;
          const item = items.get(index);
          
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                top: index * 100,
                height: 100
              }}
            >
              {item ? <ItemCard item={item} /> : <Skeleton />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 6. REACT QUERY INFINITE QUERIES
import { useInfiniteQuery } from '@tanstack/react-query';

function ReactQueryInfinite() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useInfiniteQuery({
    queryKey: ['items'],
    queryFn: ({ pageParam = 0 }) => fetchItems(pageParam),
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.hasMore) {
        return lastPage.nextCursor;
      }
      return undefined;
    }
  });
  
  const sentinelRef = useInfiniteScroll(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  });
  
  if (status === 'loading') return <Spinner />;
  if (status === 'error') return <Error />;
  
  return (
    <div>
      {data.pages.map((page, pageIndex) => (
        <React.Fragment key={pageIndex}>
          {page.items.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </React.Fragment>
      ))}
      
      {isFetchingNextPage && <Spinner />}
      
      {hasNextPage && <div ref={sentinelRef} style={{ height: 20 }} />}
      
      {!hasNextPage && <div>End of list</div>}
    </div>
  );
}

// 7. PERFORMANCE OPTIMIZATIONS

// Memoize item components
const ItemCard = React.memo(({ item }) => {
  return (
    <div className="item-card">
      <h3>{item.title}</h3>
      <p>{item.description}</p>
    </div>
  );
});

// Debounced scroll handler
function useDebounce(callback, delay) {
  const timeoutRef = useRef();
  
  return useCallback((...args) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
}

// Image lazy loading
function LazyImage({ src, alt }) {
  const [inView, setInView] = useState(false);
  const imgRef = useRef();
  
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    });
    
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);
  
  return (
    <div ref={imgRef}>
      {inView && <img src={src} alt={alt} loading="lazy" />}
    </div>
  );
}

// BACKEND OPTIMIZATIONS:
/*
✓ Database indexing (_id, createdAt for sorting)
✓ Use cursor-based pagination (not OFFSET)
✓ Cache frequently accessed pages (Redis)
✓ Implement rate limiting
✓ Use database read replicas
✓ Compress responses (gzip/brotli)
✓ Use CDN for static content
✓ Implement connection pooling
✓ Query optimization (select only needed fields)
✓ Denormalize data for read-heavy operations
*/

// Example optimized query:
db.items.find(
  { _id: { $gt: cursor } },
  { _id: 1, title: 1, thumbnail: 1 } // Only fetch needed fields
)
.sort({ _id: 1 })
.limit(50)
.hint({ _id: 1 }); // Use index

// SCALABILITY CHECKLIST:
/*
✓ Virtual scrolling (only render visible)
✓ Cursor-based pagination
✓ Intersection Observer (not scroll events)
✓ Debounce/throttle handlers
✓ Memoize components with React.memo
✓ Lazy load images
✓ Use windowing for extreme cases
✓ Implement data cleanup (remove far items)
✓ Prefetch next page
✓ Error handling & retry logic
✓ Loading states & skeletons
✓ Monitor performance metrics
*/
```

---

### 27. Real-time updates architecture

```javascript
// REQUIREMENTS:
// - Push updates to clients instantly (<1s latency)
// - Handle 10k+ concurrent connections
// - Graceful degradation if real-time fails
// - Efficient message delivery (don't spam)
// - Reconnection handling
// - Authentication & authorization

// TECHNOLOGY CHOICES:

// 1. WebSockets (bidirectional, persistent connection)
// 2. Server-Sent Events (SSE) (unidirectional, simpler)
// 3. Long Polling (fallback for old browsers)
// 4. WebRTC (peer-to-peer, for video/audio)

// ARCHITECTURE OVERVIEW:
/*
┌──────────────────────────────────────────┐
│         Client (React)                   │
│  ┌────────────┐  ┌────────────────────┐ │
│  │ WebSocket  │  │  Optimistic UI     │ │
│  │ Manager    │  │  Updates           │ │
│  └────────────┘  └────────────────────┘ │
└──────────────────────────────────────────┘
       ↕ WebSocket
┌──────────────────────────────────────────┐
│      WebSocket Server (Socket.io)       │
│  ┌────────────┐  ┌────────────────────┐ │
│  │ Connection │  │  Room/Channel      │ │
│  │ Manager    │  │  Management        │ │
│  └────────────┘  └────────────────────┘ │
└──────────────────────────────────────────┘
       ↕ Pub/Sub
┌──────────────────────────────────────────┐
│         Message Queue (Redis)            │
│  ┌────────────────────────────────────┐ │
│  │  Pub/Sub for multi-server setup   │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
*/

// IMPLEMENTATION:

// 1. CLIENT-SIDE: WebSocket Manager
class WebSocketManager {
  constructor(url, options = {}) {
    this.url = url;
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 1000;
    this.heartbeatInterval = null;
  }
  
  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.emit('connect');
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.emit(data.type, data.payload);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.stopHeartbeat();
      this.handleReconnect();
    };
  }
  
  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  send(type, payload) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('WebSocket not connected');
      this.emit('sendError', { type, payload });
    }
  }
  
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }
  
  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }
  
  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.emit('reconnectFailed');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.send('ping', { timestamp: Date.now() });
    }, 30000); // Every 30 seconds
  }
  
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// React Hook for WebSocket
function useWebSocket(url, options = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  
  useEffect(() => {
    const ws = new WebSocketManager(url, options);
    wsRef.current = ws;
    
    ws.on('connect', () => setIsConnected(true));
    ws.on('disconnect', () => setIsConnected(false));
    
    ws.connect();
    
    return () => ws.disconnect();
  }, [url]);
  
  const subscribe = useCallback((event, callback) => {
    return wsRef.current?.on(event, callback);
  }, []);
  
  const send = useCallback((type, payload) => {
    wsRef.current?.send(type, payload);
  }, []);
  
  return {
    isConnected,

    subscribe,
    send,
    lastMessage
  };
}

// Usage in React component:
function ChatComponent() {
  const [messages, setMessages] = useState([]);
  const { isConnected, subscribe, send } = useWebSocket('wss://api.example.com');
  
  useEffect(() => {
    const unsubscribe = subscribe('message', (message) => {
      setMessages(prev => [...prev, message]);
    });
    
    return unsubscribe;
  }, [subscribe]);
  
  const sendMessage = (text) => {
    send('message', { text, timestamp: Date.now() });
  };
  
  return (
    <div>
      <div className="status">
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>
      
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i}>{msg.text}</div>
        ))}
      </div>
      
      <MessageInput onSend={sendMessage} />
    </div>
  );
}

// 2. SERVER-SIDE: Socket.io Setup (Node.js)
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Redis for multi-server scaling
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
});

// Authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  
  try {
    const user = await verifyToken(token);
    socket.userId = user.id;
    socket.username = user.username;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});

// Connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}`);
  
  // Join user-specific room
  socket.join(`user:${socket.userId}`);
  
  // Subscribe to channels
  socket.on('subscribe', ({ channel }) => {
    // Check permissions
    if (canAccessChannel(socket.userId, channel)) {
      socket.join(channel);
      socket.emit('subscribed', { channel });
    }
  });
  
  socket.on('unsubscribe', ({ channel }) => {
    socket.leave(channel);
    socket.emit('unsubscribed', { channel });
  });
  
  // Handle messages
  socket.on('message', async ({ channel, content }) => {
    // Validate & save to database
    const message = await saveMessage({
      userId: socket.userId,
      channel,
      content,
      timestamp: Date.now()
    });
    
    // Broadcast to channel
    io.to(channel).emit('message', {
      id: message.id,
      username: socket.username,
      content: message.content,
      timestamp: message.timestamp
    });
  });
  
  // Typing indicators
  socket.on('typing', ({ channel }) => {
    socket.to(channel).emit('userTyping', {
      userId: socket.userId,
      username: socket.username
    });
  });
  
  socket.on('stopTyping', ({ channel }) => {
    socket.to(channel).emit('userStoppedTyping', {
      userId: socket.userId
    });
  });
  
  // Presence
  socket.on('updatePresence', ({ status }) => {
    io.emit('userPresence', {
      userId: socket.userId,
      username: socket.username,
      status
    });
    
    // Update in database/cache
    updateUserPresence(socket.userId, status);
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
    
    // Notify others
    io.emit('userOffline', {
      userId: socket.userId,
      timestamp: Date.now()
    });
    
    updateUserPresence(socket.userId, 'offline');
  });
});

httpServer.listen(3000, () => {
  console.log('WebSocket server running on port 3000');
});

// 3. OPTIMISTIC UPDATES
function useOptimisticMessages() {
  const [messages, setMessages] = useState([]);
  const { send } = useWebSocket('wss://api.example.com');
  
  const sendMessage = async (text) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      text,
      status: 'sending',
      timestamp: Date.now()
    };
    
    // Add to UI immediately
    setMessages(prev => [...prev, optimisticMessage]);
    
    try {
      // Send to server
      const response = await send('message', { text });
      
      // Update with real ID
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempId
            ? { ...msg, id: response.id, status: 'sent' }
            : msg
        )
      );
    } catch (error) {
      // Mark as failed
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempId
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
    }
  };
  
  return { messages, sendMessage };
}

// 4. CONFLICT RESOLUTION (for collaborative editing)
// Using Operational Transformation (OT) or CRDT

function useCollaborativeDocument(documentId) {
  const [content, setContent] = useState('');
  const [version, setVersion] = useState(0);
  const { subscribe, send } = useWebSocket('wss://api.example.com');
  
  useEffect(() => {
    const unsubscribe = subscribe('documentUpdate', ({ operations, fromVersion }) => {
      if (fromVersion === version) {
        // Apply operations
        setContent(prev => applyOperations(prev, operations));
        setVersion(v => v + 1);
      } else {
        // Version mismatch - fetch latest
        fetchLatestDocument(documentId);
      }
    });
    
    return unsubscribe;
  }, [version]);
  
  const updateDocument = (newContent) => {
    const operations = computeDiff(content, newContent);
    
    // Optimistic update
    setContent(newContent);
    
    // Send to server
    send('documentUpdate', {
      documentId,
      operations,
      fromVersion: version
    });
  };
  
  return { content, updateDocument };
}

// 5. RATE LIMITING & THROTTLING
function useThrottledEmit(ws, event, delay = 1000) {
  const timeoutRef = useRef();
  const lastEmitRef = useRef(0);
  
  return useCallback((data) => {
    const now = Date.now();
    const timeSinceLastEmit = now - lastEmitRef.current;
    
    clearTimeout(timeoutRef.current);
    
    if (timeSinceLastEmit >= delay) {
      ws.send(event, data);
      lastEmitRef.current = now;
    } else {
      timeoutRef.current = setTimeout(() => {
        ws.send(event, data);
        lastEmitRef.current = Date.now();
      }, delay - timeSinceLastEmit);
    }
  }, [ws, event, delay]);
}

// Usage: Throttle typing indicators
function ChatInput() {
  const { send } = useWebSocket('wss://api.example.com');
  const emitTyping = useThrottledEmit(send, 'typing', 1000);
  
  const handleChange = (e) => {
    emitTyping({ channel: 'general' });
    // Update input...
  };
  
  return <input onChange={handleChange} />;
}

// 6. FALLBACK: Server-Sent Events (SSE)
function useServerSentEvents(url) {
  const [data, setData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    const eventSource = new EventSource(url);
    
    eventSource.onopen = () => {
      console.log('SSE connected');
      setIsConnected(true);
    };
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setData(data);
    };
    
    eventSource.onerror = () => {
      console.error('SSE error');
      setIsConnected(false);
      eventSource.close();
    };
    
    return () => eventSource.close();
  }, [url]);
  
  return { data, isConnected };
}

// Server-side SSE (Express):
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  // Subscribe to Redis pub/sub
  const subscriber = redis.duplicate();
  subscriber.subscribe('updates');
  
  subscriber.on('message', (channel, message) => {
    sendEvent(JSON.parse(message));
  });
  
  req.on('close', () => {
    subscriber.unsubscribe();
    subscriber.quit();
  });
});

// 7. MONITORING & ANALYTICS
// Track WebSocket metrics
class WebSocketMetrics {
  constructor() {
    this.metrics = {
      connections: 0,
      messages: 0,
      errors: 0,
      avgLatency: 0
    };
  }
  
  trackConnection() {
    this.metrics.connections++;
  }
  
  trackMessage(latency) {
    this.metrics.messages++;
    this.metrics.avgLatency = 
      (this.metrics.avgLatency * (this.metrics.messages - 1) + latency) / 
      this.metrics.messages;
  }
  
  trackError() {
    this.metrics.errors++;
  }
  
  getMetrics() {
    return this.metrics;
  }
}

// SCALABILITY CONSIDERATIONS:
/*
✓ Use Redis Pub/Sub for multi-server setup
✓ Implement horizontal scaling (load balancer)
✓ Sticky sessions (if stateful)
✓ Rate limiting per user/connection
✓ Message queue for reliable delivery
✓ Database for message persistence
✓ Compression for large payloads
✓ Binary protocol (MessagePack vs JSON)
✓ Connection pooling
✓ Monitor with Prometheus/Grafana

ARCHITECTURE PATTERNS:
- Fan-out (1 user → many users)
- Fan-in (many users → 1 aggregator)
- Request-Reply (RPC over WebSocket)
- Publish-Subscribe (channels/rooms)
*/
```

---

### 28. Offline-first app design

```javascript
// OFFLINE-FIRST PRINCIPLES:
// 1. App works without network
// 2. Sync when connection available
// 3. Conflict resolution strategy
// 4. Optimistic UI updates
// 5. Queue operations for retry

// ARCHITECTURE:
/*
┌──────────────────────────────────────────┐
│            React App                     │
│  ┌────────────┐  ┌──────────────────┐  │
│  │ UI Layer   │  │  Service Worker  │  │
│  └────────────┘  └──────────────────┘  │
│  ┌────────────────────────────────────┐ │
│  │    Offline Manager                 │ │
│  │  - Operation Queue                 │ │
│  │  - Sync Engine                     │ │
│  │  - Conflict Resolution             │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │    Local Database (IndexedDB)      │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
         ↕ Sync when online
┌──────────────────────────────────────────┐
│         Backend API                      │
│  ┌──────────────────────────────────┐   │
│  │  Sync Endpoint                   │   │
│  │  Conflict Resolution             │   │
│  └──────────────────────────────────┘   │
└──────────────────────────────────────────┘
*/

// IMPLEMENTATION:

// 1. SERVICE WORKER for caching
// service-worker.js
const CACHE_NAME = 'app-v1';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return cached response
      if (response) {
        return response;
      }
      
      // Clone request
      const fetchRequest = event.request.clone();
      
      return fetch(fetchRequest).then((response) => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Clone response
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      }).catch(() => {
        // Network request failed, return offline page
        return caches.match('/offline.html');
      });
    })
  );
});

// Register service worker in React app:
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('SW registered:', registration);
        })
        .catch((error) => {
          console.log('SW registration failed:', error);
        });
    });
  }
}

// 2. INDEXEDDB for local storage
// Use Dexie.js (wrapper around IndexedDB)
import Dexie from 'dexie';

class AppDatabase extends Dexie {
  constructor() {
    super('AppDatabase');
    
    this.version(1).stores({
      todos: '++id, title, completed, createdAt, synced',
      queue: '++id, operation, data, timestamp, retries'
    });
  }
}

const db = new AppDatabase();

// 3. OFFLINE DETECTION
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
}

// 4. OPERATION QUEUE
class OperationQueue {
  constructor(db) {
    this.db = db;
    this.processing = false;
  }
  
  async enqueue(operation, data) {
    await this.db.queue.add({
      operation,
      data,
      timestamp: Date.now(),
      retries: 0
    });
    
    // Try to process immediately if online
    if (navigator.onLine) {
      this.process();
    }
  }
  
  async process() {
    if (this.processing) return;
    
    this.processing = true;
    
    const operations = await this.db.queue.toArray();
    
    for (const op of operations) {
      try {
        await this.executeOperation(op);
        await this.db.queue.delete(op.id);
      } catch (error) {
        console.error('Operation failed:', error);
        
        // Increment retry count
        await this.db.queue.update(op.id, {
          retries: op.retries + 1
        });
        
        // Remove if too many retries
        if (op.retries >= 5) {
          await this.db.queue.delete(op.id);
          this.handleFailedOperation(op, error);
        }
      }
    }
    
    this.processing = false;
  }
  
  async executeOperation(op) {
    switch (op.operation) {
      case 'CREATE_TODO':
        return await fetch('/api/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(op.data)
        });
        
      case 'UPDATE_TODO':
        return await fetch(`/api/todos/${op.data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(op.data)
        });
        
      case 'DELETE_TODO':
        return await fetch(`/api/todos/${op.data.id}`, {
          method: 'DELETE'
        });
        
      default:
        throw new Error(`Unknown operation: ${op.operation}`);
    }
  }
  
  handleFailedOperation(op, error) {
    // Log to error tracking
    console.error('Operation permanently failed:', op, error);
    
    // Notify user
    showNotification('Some changes could not be synced');
  }
}

const queue = new OperationQueue(db);

// 5. OFFLINE TODO APP EXAMPLE
function useOfflineTodos() {
  const [todos, setTodos] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const isOnline = useOnlineStatus();
  
  // Load from IndexedDB on mount
  useEffect(() => {
    loadTodos();
  }, []);
  
  const loadTodos = async () => {
    const localTodos = await db.todos.toArray();
    setTodos(localTodos);
  };
  
  // Sync when coming online
  useEffect(() => {
    if (isOnline) {
      sync();
    }
  }, [isOnline]);
  
  const createTodo = async (title) => {
    const newTodo = {
      id: `temp-${Date.now()}`,
      title,
      completed: false,
      createdAt: Date.now(),
      synced: false
    };
    
    // Add to local state
    setTodos(prev => [...prev, newTodo]);
    
    // Add to IndexedDB
    await db.todos.add(newTodo);
    
    // Queue for sync
    await queue.enqueue('CREATE_TODO', newTodo);
  };
  
  const updateTodo = async (id, updates) => {
    // Optimistic update
    setTodos(prev =>
      prev.map(todo => (todo.id === id ? { ...todo, ...updates, synced: false } : todo))
    );
    
    // Update IndexedDB
    await db.todos.update(id, { ...updates, synced: false });
    
    // Queue for sync
    await queue.enqueue('UPDATE_TODO', { id, ...updates });
  };
  
  const deleteTodo = async (id) => {
    // Optimistic delete
    setTodos(prev => prev.filter(todo => todo.id !== id));
    
    // Delete from IndexedDB
    await db.todos.delete(id);
    
    // Queue for sync
    await queue.enqueue('DELETE_TODO', { id });
  };
  
  const sync = async () => {
    setSyncing(true);
    
    try {
      // Process queued operations
      await queue.process();
      
      // Fetch latest from server
      const response = await fetch('/api/todos');
      const serverTodos = await response.json();
      
      // Merge with local (conflict resolution)
      const merged = await mergeTodos(serverTodos);
      
      // Update IndexedDB
      await db.todos.clear();
      await db.todos.bulkAdd(merged);
      
      // Update state
      setTodos(merged);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };
  
  return {
    todos,
    createTodo,
    updateTodo,
    deleteTodo,
    syncing,
    isOnline
  };
}

// Usage:
function TodoApp() {
  const {
    todos,
    createTodo,
    updateTodo,
    deleteTodo,
    syncing,
    isOnline
  } = useOfflineTodos();
  
  return (
    <div>
      <div className="status-bar">
        {isOnline ? (
          <span>🟢 Online</span>
        ) : (
          <span>🔴 Offline - changes will sync when back online</span>
        )}
        {syncing && <span>Syncing...</span>}
      </div>
      
      <TodoInput onSubmit={createTodo} />
      
      <ul>
        {todos.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onUpdate={(updates) => updateTodo(todo.id, updates)}
            onDelete={() => deleteTodo(todo.id)}
          />
        ))}
      </ul>
    </div>
  );
}

// 6. CONFLICT RESOLUTION
async function mergeTodos(serverTodos) {
  const localTodos = await db.todos.toArray();
  const merged = [];
  
  // Create maps for easy lookup
  const localMap = new Map(localTodos.map(t => [t.id, t]));
  const serverMap = new Map(serverTodos.map(t => [t.id, t]));
  
  // Process server todos
  for (const serverTodo of serverTodos) {
    const localTodo = localMap.get(serverTodo.id);
    
    if (!localTodo) {
      // Only on server - add it
      merged.push({ ...serverTodo, synced: true });
    } else if (localTodo.synced) {
      // Both synced - use server version
      merged.push({ ...serverTodo, synced: true });
    } else {
      // Local has changes - resolve conflict
      const resolved = resolveConflict(localTodo, serverTodo);
      merged.push({ ...resolved, synced: false });
    }
  }
  
  // Add local-only todos (not synced yet)
  for (const localTodo of localTodos) {
    if (!serverMap.has(localTodo.id)) {
      merged.push(localTodo);
    }
  }
  
  return merged;
}

function resolveConflict(local, server) {
  // Strategy: Last-write-wins
  if (local.updatedAt > server.updatedAt) {
    return local;
  }
  return server;
  
  // Or: Merge properties
  // return {
  //   ...server,
  //   ...local,
  //   _conflict: true
  // };
}

// 7. BACKGROUND SYNC API
// Register background sync when back online
async function registerBackgroundSync() {
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    
    try {
      await registration.sync.register('syncTodos');
      console.log('Background sync registered');
    } catch (error) {
      console.error('Background sync registration failed:', error);
      // Fallback to regular sync
      queue.process();
    }
  }
}

// In service worker:
self.addEventListener('sync', (event) => {
  if (event.tag === 'syncTodos') {
    event.waitUntil(syncTodos());
  }
});

async function syncTodos() {
  // Fetch queued operations from IndexedDB
  // Process them
  // Update local data
}

// 8. STORAGE QUOTA MANAGEMENT
async function checkStorageQuota() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const { usage, quota } = await navigator.storage.estimate();
    const percentageUsed = (usage / quota) * 100;
    
    console.log(`Using ${percentageUsed.toFixed(2)}% of storage`);
    
    if (percentageUsed > 80) {
      // Cleanup old data
      await cleanupOldData();
    }
  }
}

async function cleanupOldData() {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  await db.todos
    .where('createdAt')
    .below(thirtyDaysAgo)
    .and(todo => todo.synced)
    .delete();
}

// 9. CACHE STRATEGIES
// service-worker.js
const STRATEGIES = {
  // For API calls - Network First, Cache Fallback
  networkFirst: async (request) => {
    try {
      const response = await fetch(request);
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
      return response;
    } catch (error) {
      return await caches.match(request);
    }
  },
  
  // For static assets - Cache First
  cacheFirst: async (request) => {
    const cached = await caches.match(request);
    if (cached) return cached;
    
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  },
  
  // For time-sensitive data - Network Only
  networkOnly: async (request) => {
    return await fetch(request);
  }
};

// 10. TESTING OFFLINE FUNCTIONALITY
// Simulate offline in tests
const mockOffline = () => {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: false
  });
  
  window.dispatchEvent(new Event('offline'));
};

const mockOnline = () => {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true
  });
  
  window.dispatchEvent(new Event('online'));
};

// Test example:
test('creates todo offline and syncs when online', async () => {
  mockOffline();
  
  const { createTodo, todos } = renderHook(() => useOfflineTodos());
  
  await createTodo('Test todo');
  
  expect(todos).toHaveLength(1);
  expect(todos[0].synced).toBe(false);
  
  mockOnline();
  
  await waitFor(() => {
    expect(todos[0].synced).toBe(true);
  });
});

// BEST PRACTICES:
/*
✓ Progressive enhancement (work without JS)
✓ Service worker for asset caching
✓ IndexedDB for structured data
✓ Operation queue for pending changes
✓ Optimistic UI updates
✓ Clear offline/online indicators
✓ Conflict resolution strategy
✓ Background Sync API
✓ Storage quota management
✓ Test offline scenarios
✓ Graceful degradation
✓ Cache versioning
*/
```

---

### 29. Feature flag system

```javascript
// FEATURE FLAGS (Feature Toggles):
// - Enable/disable features without deployment
// - A/B testing
// - Gradual rollouts
// - Kill switches

// ARCHITECTURE:
/*
┌──────────────────────────────────────────┐
│         Client (React)                   │
│  ┌────────────────────────────────────┐ │
│  │   Feature Flag Provider            │ │
│  │   - Evaluation Engine              │ │
│  │   - Local Cache                    │ │
│  │   - Analytics Integration          │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
         ↕ Fetch flags
┌──────────────────────────────────────────┐
│   Feature Flag Service                   │
│  ┌────────────────────────────────────┐ │
│  │   Flag Configuration               │ │
│  │   - Targeting Rules                │ │
│  │   - Percentage Rollouts            │ │
│  │   - User Segmentation              │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
*/

// IMPLEMENTATION:

// 1. SIMPLE FEATURE FLAG SYSTEM
// Feature flag configuration
const flagConfig = {
  darkMode: {
    enabled: true,
    description: 'Dark mode UI'
  },
  newCheckout: {
    enabled: false,
    description: 'New checkout flow',
    rollout: {
      percentage: 50, // 50% of users
      users: ['user-123', 'user-456'] // Specific users
    }
  },
  premiumFeatures: {
    enabled: true,
    description: 'Premium features',
    targeting: {
      requiredPlan: 'premium'
    }
  }
};

// Feature Flag Context
const FeatureFlagContext = createContext(null);

function FeatureFlagProvider({ children, user }) {
  const [flags, setFlags] = useState({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadFlags();
  }, [user.id]);
  
  const loadFlags = async () => {
    try {
      // Fetch from API
      const response = await fetch(`/api/flags?userId=${user.id}`);
      const data = await response.json();
      
      // Store in localStorage for offline
      localStorage.setItem('featureFlags', JSON.stringify(data));
      
      setFlags(data);
    } catch (error) {
      // Fallback to cached flags
      const cached = localStorage.getItem('featureFlags');
      if (cached) {
        setFlags(JSON.parse(cached));
      }
    } finally {
      setLoading(false);
    }
  };
  
  const isEnabled = useCallback((flagKey) => {
    const flag = flags[flagKey];
    
    if (!flag) return false;
    
    // Basic enabled check
    if (!flag.enabled) return false;
    
    // Percentage rollout
    if (flag.rollout?.percentage) {
      const hash = hashUserId(user.id);
      if (hash % 100 >= flag.rollout.percentage) {
        return false;
      }
    }
    
    // Specific user targeting
    if (flag.rollout?.users) {
      if (!flag.rollout.users.includes(user.id)) {
        return false;
      }
    }
    
    // Plan-based targeting
    if (flag.targeting?.requiredPlan) {
      if (user.plan !== flag.targeting.requiredPlan) {
        return false;
      }
    }
    
    return true;
  }, [flags, user]);
  
  const value = {
    flags,
    isEnabled,
    loading
  };
  
  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

// Hook for using feature flags
function useFeatureFlag(flagKey) {
  const context = useContext(FeatureFlagContext);
  
  if (!context) {
    throw new Error('useFeatureFlag must be used within FeatureFlagProvider');
  }
  
  return context.isEnabled(flagKey);
}

// Usage:
function App() {
  const user = useAuth();
  
  return (
    <FeatureFlagProvider user={user}>
      <AppContent />
    </FeatureFlagProvider>
  );
}

function AppContent() {
  const darkModeEnabled = useFeatureFlag('darkMode');
  const newCheckoutEnabled = useFeatureFlag('newCheckout');
  
  return (
    <div className={darkModeEnabled ? 'dark' : 'light'}>
      <Header />
      
      {newCheckoutEnabled ? (
        <NewCheckoutFlow />
      ) : (
        <OldCheckoutFlow />
      )}
    </div>
  );
}

// 2. COMPONENT-LEVEL FLAG
function FeatureFlag({ flag, children, fallback = null }) {
  const isEnabled = useFeatureFlag(flag);
  
  if (!isEnabled) return fallback;
  
  return <>{children}</>;
}

// Usage:
<FeatureFlag flag="darkMode" fallback={<LightTheme />}>
  <DarkTheme />
</FeatureFlag>

// 3. ADVANCED TARGETING
class FeatureFlagEvaluator {
  constructor(user, config) {
    this.user = user;
    this.config = config;
  }
  
  evaluate(flagKey) {
    const flag = this.config[flagKey];
    
    if (!flag || !flag.enabled) return false;
    
    // Check all targeting rules
    if (flag.targeting) {
      if (!this.evaluateTargeting(flag.targeting)) {
        return false;
      }
    }
    
    // Check rollout rules
    if (flag.rollout) {
      if (!this.evaluateRollout(flag.rollout)) {
        return false;
      }
    }
    
    return true;
  }
  
  evaluateTargeting(targeting) {
    // User attributes
    if (targeting.attributes) {
      for (const [key, value] of Object.entries(targeting.attributes)) {
        if (this.user[key] !== value) {
          return false;
        }
      }
    }
    
    // User segments
    if (targeting.segments) {
      if (!targeting.segments.some(segment => 
        this.user.segments?.includes(segment)
      )) {
        return false;
      }
    }
    
    // Custom rules (using a simple expression language)
    if (targeting.rules) {
      return this.evaluateRules(targeting.rules);
    }
    
    return true;
  }
  
  evaluateRollout(rollout) {
    // Percentage-based
    if (rollout.percentage !== undefined) {
      const bucket = this.getBucket(this.user.id);
      if (bucket >= rollout.percentage) {
        return false;
      }
    }
    
    // Time-based
    if (rollout.startDate && new Date() < new Date(rollout.startDate)) {
      return false;
    }
    
    if (rollout.endDate && new Date() > new Date(rollout.endDate)) {
      return false;
    }
    
    // User whitelist/blacklist
    if (rollout.whitelist && !rollout.whitelist.includes(this.user.id)) {
      return false;
    }
    
    if (rollout.blacklist && rollout.blacklist.includes(this.user.id)) {
      return false;
    }
    
    return true;
  }
  
  evaluateRules(rules) {
    // Simple rule engine
    // Example rule: { attr: 'country', op: 'in', value: ['US', 'CA'] }
    return rules.every(rule => {
      const userValue = this.user[rule.attr];
      
      switch (rule.op) {
        case 'eq':
          return userValue === rule.value;
        case 'ne':
          return userValue !== rule.value;
        case 'in':
          return rule.value.includes(userValue);
        case 'gt':
          return userValue > rule.value;
        case 'lt':
          return userValue < rule.value;
        default:
          return false;
      }
    });
  }
  
  getBucket(userId) {
    // Consistent hashing for percentage rollouts
    // Ensures same user always gets same result
    const hash = hashString(userId);
    return hash % 100;
  }
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// 4. A/B TESTING with Feature Flags
function useABTest(experimentKey, variants = ['A', 'B']) {
  const { user } = useAuth();
  const [variant, setVariant] = useState(null);
  
  useEffect(() => {
    // Deterministic variant assignment based on user ID
    const hash = hashString(`${experimentKey}-${user.id}`);
    const index = hash % variants.length;
    const assignedVariant = variants[index];
    
    setVariant(assignedVariant);
    
    // Track assignment
    analytics.track('Experiment Viewed', {
      experimentKey,
      variant: assignedVariant,
      userId: user.id
    });
  }, [experimentKey, user.id]);
  
  const trackConversion = useCallback((eventName, properties = {}) => {
    analytics.track(eventName, {
      experimentKey,
      variant,
      ...properties
    });
  }, [experimentKey, variant]);
  
  return { variant, trackConversion };
}

// Usage:
function PricingPage() {
  const { variant, trackConversion } = useABTest('pricing-test', ['control', 'variant-a']);
  
  const handlePurchase = () => {
    trackConversion('Purchase Completed', {
      plan: selectedPlan,
      amount: price
    });
  };
  
  if (variant === 'variant-a') {
    return <NewPricingLayout onPurchase={handlePurchase} />;
  }
  
  return <OldPricingLayout onPurchase={handlePurchase} />;
}

// 5. GRADUAL ROLLOUT
function useGradualRollout(flagKey, rolloutSchedule) {
  const [percentage, setPercentage] = useState(0);
  
  useEffect(() => {
    // Gradual increase over time
    const interval = setInterval(() => {
      setPercentage(prev => {
        const next = prev + rolloutSchedule.increment;
        return Math.min(next, 100);
      });
    }, rolloutSchedule.intervalMs);
    
    return () => clearInterval(interval);
  }, [rolloutSchedule]);
  
  const isEnabled = useFeatureFlag(flagKey);
  const userBucket = hashString(user.id) % 100;
  
  return isEnabled && userBucket < percentage;
}

// 6. FEATURE FLAG ADMIN PANEL
function FeatureFlagAdmin() {
  const [flags, setFlags] = useState({});
  
  const updateFlag = async (flagKey, updates) => {
    await fetch(`/api/admin/flags/${flagKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    
    // Refresh flags
    loadFlags();
  };
  
  return (
    <div>
      <h1>Feature Flags</h1>
      
      {Object.entries(flags).map(([key, flag]) => (
        <div key={key} className="flag-card">
          <h3>{flag.name}</h3>
          <p>{flag.description}</p>
          
          <label>
            <input
              type="checkbox"
              checked={flag.enabled}
              onChange={(e) =>
                updateFlag(key, { enabled: e.target.checked })
              }
            />
            Enabled
          </label>
          
          {flag.rollout && (
            <div>
              <label>
                Rollout Percentage:
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={flag.rollout.percentage}
                  onChange={(e) =>
                    updateFlag(key, {
                      rollout: { percentage: parseInt(e.target.value) }
                    })
                  }
                />
                {flag.rollout.percentage}%
              </label>
            </div>
          )}
          
          <div>
            <strong>Users affected:</strong> {flag.stats.usersAffected}
          </div>
        </div>
      ))}
    </div>
  );
}

// 7. BACKEND (Node.js)
app.get('/api/flags', authenticate, async (req, res) => {
  const { userId } = req.user;
  
  // Get user context
  const user = await User.findById(userId);
  
  // Evaluate all flags
  const evaluator = new FeatureFlagEvaluator(user, flagConfig);
  
  const evaluatedFlags = {};
  for (const flagKey of Object.keys(flagConfig)) {
    evaluatedFlags[flagKey] = evaluator.evaluate(flagKey);
  }
  
  res.json(evaluatedFlags);
});

app.patch('/api/admin/flags/:key', authenticate, authorize('admin'), async (req, res) => {
  const { key } = req.params;
  const updates = req.body;
  
  await FeatureFlag.updateOne({ key }, updates);
  
  // Notify all connected clients via WebSocket
  io.emit('flagUpdated', { key, updates });
  
  res.json({ success: true });
});

// 8. REAL-TIME FLAG UPDATES
function useRealtimeFlags() {
  const { flags, setFlags } = useContext(FeatureFlagContext);
  
  useEffect(() => {
    const socket = io('wss://api.example.com');
    
    socket.on('flagUpdated', ({ key, updates }) => {
      setFlags(prev => ({
        ...prev,
        [key]: { ...prev[key], ...updates }
      }));
    });
    
    return () => socket.disconnect();
  }, []);
  
  return flags;
}

// 9. ANALYTICS & OBSERVABILITY
function trackFlagEvaluation(flagKey, result, user) {
  analytics.track('Feature Flag Evaluated', {
    flagKey,
    result,
    userId: user.id,
    userSegment: user.segment,
    timestamp: Date.now()
  });
}

// Monitor flag performance
function monitorFlag(flagKey) {
  const startTime = performance.now();
  
  const result = evaluator.evaluate(flagKey);
  
  const duration = performance.now() - startTime;
  
  metrics.timing('feature_flag.evaluation_time', duration, {
    flagKey
  });
  
  return result;
}

// BEST PRACTICES:
/*
✓ Default to disabled (fail-safe)
✓ Use consistent hashing for rollouts
✓ Cache flags client-side
✓ Implement kill switches
✓ Monitor flag usage & performance
✓ Clean up old flags regularly
✓ Document flag purpose & owner
✓ Test with flags on/off
✓ Gradual rollouts for risky changes
✓ Analytics integration
✓ Real-time updates via WebSocket
✓ Admin UI for non-technical users
*/
```

---

### 30. Role-based access control (RBAC)

```javascript
// RBAC SYSTEM DESIGN
// - Users have Roles
// - Roles have Permissions
// - Resources check Permissions

// ARCHITECTURE:
/*
┌──────────────────────────────────────────┐
│         Client (React)                   │
│  ┌────────────────────────────────────┐ │
│  │   Permission Provider              │ │
│  │   - User Roles & Permissions       │ │
│  │   - Access Control Logic           │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
         ↕ Fetch user + permissions
┌──────────────────────────────────────────┐
│      Backend API                         │
│  ┌────────────────────────────────────┐ │
│  │   Auth Middleware                  │ │
│  │   - Role Verification              │ │
│  │   - Permission Checks              │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │   Database                         │ │
│  │   - Users                          │ │
│  │   - Roles                          │ │
│  │   - Permissions                    │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
*/

// DATA MODEL:
/*
User
  - id
  - email
  - roles: [Role]

Role
  - id
  - name (e.g., 'admin', 'editor', 'viewer')
  - permissions: [Permission]

Permission
  - id
  - resource (e.g., 'posts', 'users')
  - action (e.g., 'create', 'read', 'update', 'delete')
  
Examples:
- admin: ALL permissions
- editor: posts:create, posts:update, posts:read
- viewer: posts:read
*/

// IMPLEMENTATION:

// 1. PERMISSIONS CONFIGURATION
const PERMISSIONS = {
  // Posts
  'posts:create': 'Create new posts',
  'posts:read': 'Read posts',
  'posts:update': 'Update posts',
  'posts:delete': 'Delete posts',
  
  // Users
  'users:read': 'View users',
  'users:update': 'Edit users',
  'users:delete': 'Delete users',
  
  // Admin
  'admin:access': 'Access admin panel',
  'roles:manage': 'Manage roles & permissions'
};

const ROLES = {
  superadmin: {
    name: 'Super Admin',
    permissions: Object.keys(PERMISSIONS) // All permissions
  },
  admin: {
    name: 'Admin',
    permissions: [
      'posts:create',
      'posts:read',
      'posts:update',
      'posts:delete',
      'users:read',
      'admin:access'
    ]
  },
  editor: {
    name: 'Editor',
    permissions: [
      'posts:create',
      'posts:read',
      'posts:update'
    ]
  },
  viewer: {
    name: 'Viewer',
    permissions: ['posts:read']
  }
};

// 2. PERMISSION PROVIDER (React Context)
const PermissionContext = createContext(null);

function PermissionProvider({ children }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadPermissions();
  }, [user]);
  
  const loadPermissions = async () => {
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }
    
    try {
      // Fetch user's permissions from API
      const response = await fetch(`/api/users/${user.id}/permissions`);
      const data = await response.json();
      
      setPermissions(data.permissions);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };
  
  const hasPermission = useCallback((permission) => {
    return permissions.includes(permission);
  }, [permissions]);
  
  const hasAnyPermission = useCallback((requiredPermissions) => {
    return requiredPermissions.some(p => permissions.includes(p));
  }, [permissions]);
  
  const hasAllPermissions = useCallback((requiredPermissions) => {
    return requiredPermissions.every(p => permissions.includes(p));
  }, [permissions]);
  
  const hasRole = useCallback((role) => {
    return user?.roles?.includes(role);
  }, [user]);
  
  const value = {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    loading
  };
  
  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

// Hook for using permissions
function usePermission() {
  const context = useContext(PermissionContext);
  
  if (!context) {
    throw new Error('usePermission must be used within PermissionProvider');
  }
  
  return context;
}

// 3. PERMISSION GUARDS (Components)
function Can({ permission, fallback = null, children }) {
  const { hasPermission, loading } = usePermission();
  
  if (loading) return null;
  
  if don't(!hasPermission(permission)) return fallback;
  
  return <>{children}</>;
}

// Usage:
<Can permission="posts:create" fallback={<p>Access denied</p>}>
  <CreatePostButton />
</Can>

// Multiple permissions (ANY)
function CanAny({ permissions, fallback = null, children }) {
  const { hasAnyPermission, loading } = usePermission();
  
  if (loading) return null;
  
  if (!hasAnyPermission(permissions)) return fallback;
  
  return <>{children}</>;
}

// Multiple permissions (ALL)
function CanAll({ permissions, fallback = null, children }) {
  const { hasAllPermissions, loading } = usePermission();
  
  if (loading) return null;
  
  if (!hasAllPermissions(permissions)) return fallback;
  
  return <>{children}</>;
}

// Role guard
function RequireRole({ role, fallback = null, children }) {
  const { hasRole, loading } = usePermission();
  
  if (loading) return null;
  
  if (!hasRole(role)) return fallback;
  
  return <>{children}</>;
}

// 4. ROUTE PROTECTION
function ProtectedRoute({ permission, children }) {
  const { hasPermission, loading } = usePermission();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!hasPermission(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
}

// Usage with React Router:
<Routes>
  <Route
    path="/admin"
    element={
      <ProtectedRoute permission="admin:access">
        <AdminPanel />
      </ProtectedRoute>
    }
  />
  
  <Route
    path="/posts/new"
    element={
      <ProtectedRoute permission="posts:create">
        <CreatePost />
      </ProtectedRoute>
    }
  />
</Routes>

// 5. CONDITIONAL RENDERING IN COMPONENTS
function PostActions({ post }) {
  const { hasPermission } = usePermission();
  const { user } = useAuth();
  
  const canEdit = hasPermission('posts:update') && post.authorId === user.id;
  const canDelete = hasPermission('posts:delete');
  
  return (
    <div className="post-actions">
      {canEdit && <button onClick={() => editPost(post)}>Edit</button>}
      {canDelete && <button onClick={() => deletePost(post)}>Delete</button>}
    </div>
  );
}

// 6. BACKEND MIDDLEWARE (Express)
// Middleware to check permissions
function requirePermission(permission) {
  return async (req, res, next) => {
    const { user } = req;
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Fetch user's permissions
    const userPermissions = await getUserPermissions(user.id);
    
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Missing permission: ${permission}`
      });
    }
    
    next();
  };
}

function requireRole(role) {
  return async (req, res, next) => {
    const { user } = req;
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userRoles = await getUserRoles(user.id);
    
    if (!userRoles.includes(role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Missing role: ${role}`
      });
    }
    
    next();
  };
}

// Usage:
app.post('/api/posts',
  authenticate,
  requirePermission('posts:create'),
  async (req, res) => {
    // Create post
  }
);

app.delete('/api/users/:id',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    // Delete user
  }
);

// 7. DATABASE QUERIES (MongoDB example)
// User schema
const UserSchema = new Schema({
  email: String,
  name: String,
  roles: [{ type: Schema.Types.ObjectId, ref: 'Role' }]
});

// Role schema
const RoleSchema = new Schema({
  name: String,
  permissions: [String]
});

// Get user with permissions
async function getUserWithPermissions(userId) {
  const user = await User.findById(userId).populate('roles');
  
  // Flatten permissions from all roles
  const permissions = user.roles.flatMap(role => role.permissions);
  
  // Remove duplicates
  return {
    ...user.toObject(),
    permissions: [...new Set(permissions)]
  };
}

// 8. RESOURCE-LEVEL PERMISSIONS (ACL)
// More granular: permissions on specific resources
function useResourcePermission(resource, resourceId) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);
  
  useEffect(() => {
    loadResourcePermissions();
  }, [resource, resourceId, user]);
  
  const loadResourcePermissions = async () => {
    const response = await fetch(
      `/api/${resource}/${resourceId}/permissions?userId=${user.id}`
    );
    const data = await response.json();
    setPermissions(data.permissions);
  };
  
  const can = useCallback((action) => {
    return permissions.includes(action);
  }, [permissions]);
  
  return { can };
}

// Usage:
function DocumentView({ documentId }) {
  const { can } = useResourcePermission('documents', documentId);
  
  return (
    <div>
      <DocumentContent documentId={documentId} />
      
      {can('edit') && <EditButton />}
      {can('share') && <ShareButton />}
      {can('delete') && <DeleteButton />}
    </div>
  );
}

// Backend: ACL table
/*
ACL Table:
- resourceType (e.g., 'document')
- resourceId
- userId (or roleId)
- permission (e.g., 'read', 'write', 'delete')
*/

app.get('/api/:resource/:id/permissions', authenticate, async (req, res) => {
  const { resource, id } = req.params;
  const { userId } = req.query;
  
  const acls = await ACL.find({
    resourceType: resource,
    resourceId: id,
    userId
  });
  
  res.json({
    permissions: acls.map(acl => acl.permission) });
});

// 9. HIERARCHICAL ROLES
// Roles can inherit from other roles
const ROLE_HIERARCHY = {
  superadmin: ['admin'],
  admin: ['editor'],
  editor: ['viewer'],
  viewer: []
};

function getAllRoles(userRoles) {
  const allRoles = new Set(userRoles);
  
  userRoles.forEach(role => {
    const parents = ROLE_HIERARCHY[role] || [];
    parents.forEach(parent => {
      allRoles.add(parent);
      
      // Recursively add parent's parents
      getAllRoles([parent]).forEach(r => allRoles.add(r));
    });
  });
  
  return Array.from(allRoles);
}

// 10. ADMIN UI FOR MANAGING PERMISSIONS
function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  
  const updateRolePermissions = async (roleId, permissions) => {
    await fetch(`/api/admin/roles/${roleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions })
    });
    
    loadRoles();
  };
  
  return (
    <div className="role-management">
      <div className="roles-list">
        {roles.map(role => (
          <div
            key={role.id}
            className={selectedRole?.id === role.id ? 'active' : ''}
            onClick={() => setSelectedRole(role)}
          >
            {role.name}
          </div>
        ))}
      </div>
      
      {selectedRole && (
        <div className="permissions-editor">
          <h3>{selectedRole.name} Permissions</h3>
          
          {Object.entries(PERMISSIONS).map(([key, description]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={selectedRole.permissions.includes(key)}
                onChange={(e) => {
                  const newPermissions = e.target.checked
                    ? [...selectedRole.permissions, key]
                    : selectedRole.permissions.filter(p => p !== key);
                  
                  updateRolePermissions(selectedRole.id, newPermissions);
                }}
              />
              {description}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// BEST PRACTICES:
/*
✓ Principle of least privilege (give minimum needed)
✓ Use roles for groups of permissions
✓ Separate authentication from authorization
✓ Check permissions on server-side (not just client)
✓ Cache permissions client-side
✓ Audit permission changes
✓ Document who has what access
✓ Regular permission reviews
✓ Resource-level permissions for sensitive data
✓ Hierarchical roles for flexibility
✓ Admin UI for non-technical managers
✓ Monitor unauthorized access attempts
*/

// SECURITY CONSIDERATIONS:
/*
⚠ NEVER trust client-side checks
⚠ Always verify on backend
⚠ Use JWT with roles/permissions
⚠ Implement rate limiting
⚠ Log all permission changes
⚠ Regular security audits
⚠ Handle permission denials gracefully
⚠ Encrypt sensitive permission data
*/
```

---

## 🎯 Summary

You now have comprehensive answers with examples for all 30 frontend interview questions covering:

**JavaScript Core (1-9)**
- `this`, call, apply, bind
- var, let, const
- Event loop & microtasks
- Debounce & throttle
- Closures
- Shallow vs deep copy
- Promise methods
- async/await
- Memory leaks

**React (10-18)**
- Reconciliation & Virtual DOM
- Controlled vs uncontrolled components
- useEffect traps
- State lifting vs global state
- Context vs Redux vs Zustand
- Rendering optimizations
- React keys
- Large lists
- Error boundaries

**Performance (19-24)**
- Time to Interactive (TTI)
- Code splitting
- Memoization pitfalls
- Preventing re-renders
- Image optimization
- Web Vitals

**System Design (25-30)**
- Scalable dashboard
- Infinite scroll (millions of items)
- Real-time updates
- Offline-first apps
- Feature flags
- Role-based access control (RBAC)

All answers include production-ready code examples!
