# Kubernetes + Observability + Production Engineering — Complete Mastery

## Real-World Analogy: From Small Restaurant to Global Chain

**Early Days (Monolith):** You run a single restaurant kitchen. One manager (you) oversees all operations: cooking, plating, delivery. Everything works locally on your machine—you're the bottleneck and single point of failure.

**Growing Business (Docker):** You package your recipes into containers (each recipe contains ingredients + cooking instructions). You can now run the same recipe anywhere, consistently.

**Multiple Locations (Kubernetes):** You have 50 restaurants globally. Each needs the same menu (services), but they're independent. You hire a **manager (Kubernetes)** who:
- Ensures each location has the right staff (Pods, Deployments)
- Hires more staff when a location gets busy (HPA scaling)
- Routes customer orders to nearby locations (Service Discovery)
- Handles staff illness/location closure gracefully (Fault tolerance)
- Tracks which locations are understaffed (Observability)

If one kitchen catches fire, customers automatically route to nearby locations. Staff don't lose orders mid-shift. Management knows instantly. That's Kubernetes + Observability + Production Engineering.

## Part 1: Kubernetes Fundamentals & Architecture

### Why Kubernetes: The Business Case

**Netflix's Journey:**
- 2008: Single monolith on physical servers → 1 failure = full outage
- 2012: Manual VM management → hours to provision new capacity
- 2015: Kubernetes predecessor (internal system) → response to auto-scaling demand
- 2018: Moved to Kubernetes → 99.99% uptime, 5M+ hours of video streamed daily
- **Business Impact:** $15B+ revenue, made possible by reliable, scalable infrastructure

**Cost Savings Example:**
```
Manual scaling (Old way):
- Capacity planned for peak + 50% buffer
- Peak: Black Friday, 10M users online
- Cost: $500K/month infrastructure for 50M peak capacity (used 40% of year)
- Wasted: $300K/month in off-peak periods

Kubernetes auto-scaling (New way):
- Scale based on actual load, minute by minute
- Off-peak: 100K users = 10 pods ($50K/month)
- Peak: 10M users = 1000 pods ($500K/month, 1 day/year)
- Average: $100K/month
- Savings: $200K/month (annual: $2.4M on single service)
```

### Kubernetes Architecture: The Cluster

```
┌─────────────────────────────────────────────────────────────┐
│                      KUBERNETES CLUSTER                      │
├─────────────────────────────────────────────────────────────┤
│                      CONTROL PLANE                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ kube-server  │  │ etcd (DB)    │  │ scheduler    │       │
│  │ (API)        │  │ (state)      │  │ (place pods) │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
├─────────────────────────────────────────────────────────────┤
│ WORKER NODES (where containers actually run)                │
│                                                              │
│ Node-1                     Node-2          Node-3           │
│ ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐   │
│ │ Pod A (nginx)    │  │ Pod C (db)   │  │ Pod E (cache)│   │
│ │ Pod B (app)      │  │ Pod D (app)  │  │ Pod F (job)  │   │
│ └──────────────────┘  └──────────────┘  └──────────────┘   │
│ kubelet (agent)        kubelet (agent)     kubelet (agent)  │
└─────────────────────────────────────────────────────────────┘
```

**Key Components:**

**❌ Junior Mistake:**
```yaml
# Deploy everything to one node
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 10  # All on same node
  template:
    spec:
      nodeSelector:
        hostname: node-1  # Pin to specific node
```
**Problem:** Node-1 dies → all 10 replicas down → 100% of users affected

**✅ Good Approach:**
```yaml
# Distribute across nodes, let scheduler decide
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 10
  template:
    metadata:
      labels:
        app: user-service
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - user-service
                topologyKey: kubernetes.io/hostname  # Different nodes
      containers:
        - name: user-service
          image: myregistry/user-service:1.0.0
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
```

### Core Kubernetes Primitives

**Pod (Smallest deployable unit):**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-server
spec:
  containers:
    - name: nginx
      image: nginx:1.19
      ports:
        - containerPort: 80
  initContainers:  # Run before main container
    - name: init-config
      image: busybox:1.28
      command: ['sh', '-c', 'echo "Initializing..." && sleep 5']
```

**Service (Stable network endpoint):**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  type: ClusterIP  # Internal only
  selector:
    app: user-service  # Route to pods with this label
  ports:
    - port: 80
      targetPort: 8080
      protocol: TCP
```

Service DNS: `user-service.default.svc.cluster.local` → automatically load-balances to all healthy Pods

**Deployment (Replicas, rolling updates, rollbacks):**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1         # 1 extra pod during update
      maxUnavailable: 0   # Always have 3 ready
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
        - name: user-service
          image: myregistry/user-service:1.1.0
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: url
```

**ConfigMap (Non-sensitive config):**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  log_level: "INFO"
  cache_ttl: "3600"
  database_pool_size: "20"
  features.json: |
    {
      "beta_features": false,
      "rate_limit": 1000
    }
```

### Stateful Services: PostgreSQL, Redis, RabbitMQ

**❌ Rookie Mistake - Stateless Deployment for Database:**
```yaml
# WRONG: This violates data durability
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: postgres
          image: postgres:13
          # No persistent storage! Data lost on pod restart!
```

**✅ Correct - StatefulSet for Databases:**
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: production
spec:
  replicas: 1  # Primary only initially
  selector:
    matchLabels:
      app: postgres
  serviceName: postgres-headless  # Important: required for StatefulSet
  template:
    metadata:
      labels:
        app: postgres
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: postgres
          image: postgres:13
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: password
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 2000m
              memory: 2Gi
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
              subPath: pgdata  # Avoid permission issues
          livenessProbe:
            exec:
              command:
                - /bin/sh
                - -c
                - pg_isready -U postgres
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - /bin/sh
                - -c
                - pg_isready -U postgres -q
            initialDelaySeconds: 5
            periodSeconds: 5
  volumeClaimTemplates:
    - metadata:
        name: postgres-storage
      spec:
        accessModes: [ "ReadWriteOnce" ]
        storageClassName: fast-ssd  # Use fast storage for production
        resources:
          requests:
            storage: 100Gi
```

**Key Differences:**
- **Deployment:** Pods are stateless, interchangeable, can be killed/rescheduled anywhere
- **StatefulSet:** Persistent identity (postgres-0, postgres-1, postgres-2), stable storage (PVC), ordered deployment/scale-down

### Ingress: External Access & TLS

**❌ Exposing Services Without Ingress:**
```yaml
# Okay for dev, bad for production
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  type: NodePort
  ports:
    - port: 8080
      nodePort: 30000  # Access via http://node-ip:30000
  selector:
    app: user-service
```

Problems:
- NodePort random, hard to remember
- No HTTPS
- No request routing (hostname-based, path-based)
- No rate limiting

**✅ Production Ingress:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"  # Requests per second
    nginx.ingress.kubernetes.io/limit-rps: "100"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls-cert  # Auto-renewed by cert-manager
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /users(/|$)(.*)
            pathType: Prefix
            backend:
              service:
                name: user-service
                port:
                  number: 8080
          - path: /orders(/|$)(.*)
            pathType: Prefix
            backend:
              service:
                name: order-service
                port:
                  number: 8080
          - path: /payments(/|$)(.*)
            pathType: Prefix
            backend:
              service:
                name: payment-service
                port:
                  number: 8080
```

## Part 2: Auto-Scaling & Resource Management

### Horizontal Pod Autoscaler (HPA): Scale Replicas

**Real Business Scenario:**
```
E-commerce platform:
- Off-peak: 1000 users, 10 pods (1 second latency)
- Peak (9 PM): 100K users, need ? pods

Calculate:
- 10 pods handle 1000 users = 100 users per pod
- 100K users → 100K / 100 = 1000 pods needed

Challenge: Add 1000 pods instantly?
- Provisioning takes 30 seconds per node (AWS)
- Need to add 500 nodes (2 pods per node)
- Time: 500 nodes × 30s = 250 minutes
- Result: Major latency spike, customer loss

Solution: Predict demand, scale gradually before peak
```

**❌ Manual Scaling:**
```sh
# Admin manually resizes every evening
kubectl set replicas deployment/user-service --replicas=1000
# Next morning, manually scale down
kubectl set replicas deployment/user-service --replicas=10
# If admin forgets → black Friday disaster
```

**✅ Automatic Scaling:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  minReplicas: 5
  maxReplicas: 1000
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70  # Scale up when pods exceed 70% CPU
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80  # Scale up when pods exceed 80% memory
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 min before scaling down
      policies:
        - type: Percent
          value: 50  # Remove max 50% of replicas
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0  # Scale up immediately
      policies:
        - type: Percent
          value: 100  # Add 100% of replicas
          periodSeconds: 30
        - type: Pods
          value: 50
          periodSeconds: 30
      selectPolicy: Max  # Use policy that increases replicas most
```

**Custom Metrics (Business-Driven):**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 3
  maxReplicas: 500
  metrics:
    - type: Pods
      pods:
        metric:
          name: queue_depth  # Custom metric from Prometheus
          selector:
            matchLabels:
              queue: "order-processing"
        target:
          type: AverageValue
          averageValue: "100"  # One pod per 100 messages in queue
```

**Monitoring Scaling:**
```sh
# Watch HPA in action
kubectl get hpa user-service-hpa --watch
NAME              REFERENCE                  TARGETS            MINPODS MAXPODS REPLICAS AGE
user-service-hpa  Deployment/user-service    78%/70%, 45%/80%   5       1000    120      5m
user-service-hpa  Deployment/user-service    92%/70%, 55%/80%   5       1000    250      6m
user-service-hpa  Deployment/user-service    68%/70%, 42%/80%   5       1000    250      10m
user-service-hpa  Deployment/user-service    42%/70%, 30%/80%   5       1000    150      15m
```

### Resource Requests & Limits

**Business Impact of Wrong Sizing:**
```
E-commerce: Payment processing
- Per order: $50-500 revenue
- Poorly sized payment pods → OOM kill → restart → slow processing
- 10 second delay × 1000 concurrent orders = $12,500 lost in one spike

Correct sizing: $50K infrastructure, prevent $1M revenue loss
```

**❌ No Resource Limits:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: memory-hog
spec:
  template:
    spec:
      containers:
        - name: app
          image: myapp:1.0
          # No limits! Pod can use 100% node memory
```

Problem: Pod leaks memory → uses 50GB → evicts other pods → cascade failure

**✅ Proper Resource Management:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  template:
    spec:
      containers:
        - name: user-service
          image: myapp:1.0
          resources:
            requests:  # Minimum needed to run well
              cpu: 100m  # 100 millicores = 0.1 CPU
              memory: 256Mi
            limits:  # Absolutely cannot exceed
              cpu: 500m
              memory: 512Mi
      podManagementPolicy: Parallel  # Don't require requests for node to accept pod
```

**Capacity Planning:**
```
Node: 4 CPU, 16GB memory

Pod specs:
- user-service: 100m CPU, 256Mi memory
- order-service: 100m CPU, 256Mi memory
- payment-service: 200m CPU, 512Mi memory

Pods per node:
- CPU: 4000m / 100m = 40 pods (user-service only)
- Memory: 16384 / 256 = 64 pods (user-service only)
- Realistic mix: user (10) + order (10) + payment (5) = 25 pods, uses:
  - CPU: 10×100 + 10×100 + 5×200 = 2200m (55% = healthy)
  - Memory: 10×256 + 10×256 + 5×512 = 7168Mi (44% = healthy)
```

## Part 3: Observability: Logging, Metrics, Traces

### Structured Logging with Correlation IDs

**❌ Unstructured Logs (Hard to Troubleshoot):**
```log
2026-03-08 14:32:10 INFO User created
2026-03-08 14:32:11 ERROR Database connection failed
2026-03-08 14:32:12 INFO Order processed
2026-03-08 14:32:13 ERROR Payment timeout
# Which user? Which order? Related events?
```

**✅ Structured Logs with Trace Context:**
```json
{
  "timestamp": "2026-03-08T14:32:10Z",
  "level": "INFO",
  "service": "user-service",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "spanId": "f7ad6b7b90a4eea1",
  "userId": "user123",
  "action": "user.created",
  "email": "alice@example.com",
  "duration_ms": 45,
  "status": "success"
}
{
  "timestamp": "2026-03-08T14:32:11Z",
  "level": "INFO",
  "service": "order-service",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "spanId": "8a5ck9d9c1b2f3g4",
  "parentSpanId": "f7ad6b7b90a4eea1",
  "userId": "user123",
  "orderId": "order456",
  "action": "order.created",
  "items": 3,
  "total": 199.99,
  "duration_ms": 120,
  "status": "success"
}
{
  "timestamp": "2026-03-08T14:32:12Z",
  "level": "ERROR",
  "service": "payment-service",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "spanId": "k8a9z2b3c4d5e6f7",
  "parentSpanId": "8a5ck9d9c1b2f3g4",
  "orderId": "order456",
  "action": "payment.charge",
  "amount": 199.99,
  "error": "gateway_timeout",
  "retry_count": 1,
  "duration_ms": 5000,
  "status": "failed"
}
```

**Query: Find all events for order456:**
```
traceId: 550e8400-e29b-41d4-a716-446655440000
Results:
1. user-service: user created (45ms)
2. order-service: order created (120ms)
3. payment-service: payment attempt 1 failed (5000ms timeout)
4. payment-service: payment attempt 2 succeeded (2000ms)
5. notification-service: confirmation email sent (300ms)
Total journey: 7.46 seconds
```

**Implementation (Node.js + Winston):**
```javascript
// logger.js
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const cls = require('cls-hooked');

const namespace = cls.createNamespace('app-context');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.printf(info => {
      const traceId = namespace.get('traceId') || 'no-trace';
      const spanId = namespace.get('spanId') || 'no-span';
      const parentSpanId = namespace.get('parentSpanId') || null;
      
      return JSON.stringify({
        timestamp: info.timestamp,
        level: info.level,
        service: process.env.SERVICE_NAME || 'unknown',
        traceId,
        spanId,
        parentSpanId,
        userId: namespace.get('userId'),
        message: info.message,
        ...info.metadata,
        stack: info.stack
      });
    })
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ]
});

// Express middleware for trace context
const traceMiddleware = (req, res, next) => {
  const traceId = req.headers['x-trace-id'] || uuidv4();
  const spanId = uuidv4();
  
  namespace.run(() => {
    namespace.set('traceId', traceId);
    namespace.set('spanId', spanId);
    namespace.set('userId', req.user?.id);
    
    res.setHeader('X-Trace-ID', traceId);
    
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('request.completed', {
        metadata: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration_ms: duration
        }
      });
    });
    
    next();
  });
};

module.exports = { logger, traceMiddleware, namespace };
```

### Metrics: Prometheus & Grafana

**Key Metrics:**
```
# Latency (milliseconds)
http_request_duration_seconds{service="user-service", endpoint="/api/users", quantile="0.99"}
# p99 latency for user service

# Throughput (requests per second)
http_requests_total{service="user-service", method="GET", status="200"}
# Total successful GET requests

# Error Rate (%)
http_requests_total{status=~"5.."}
/ http_requests_total
× 100

# Business Metrics
orders_created_total
revenue_usd_total
users_active_current

# Resource Metrics
container_cpu_usage_seconds_total
container_memory_usage_bytes
```

**Grafana Dashboard Query (Multi-Service):**
```
# Latency trends across services
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# Alert: Error rate spike
rate(http_requests_total{status=~"5.."}[5m]) > 0.05  # > 5% errors
```

### Distributed Tracing: Jaeger

**Trace Propagation (W3C Trace Context):**
```
Request 1: User Service
GET /api/users/123

Request 1 Headers:
traceparent: 00-550e8400e29b41d4a716446655440000-f7ad6b7b90a4eea1-01
tracestate: vendor-data=123

Service 1 creates span:
- traceId: 550e8400e29b41d4a716446655440000
- spanId: f7ad6b7b90a4eea1
- status: success, duration: 100ms

Service 1 calls Service 2:
GET /api/orders?userId=123

Request 2 Headers:
traceparent: 00-550e8400e29b41d4a716446655440000-8a5ck9d9c1b2f3g4-01
(Same traceId, new spanId, f7ad... as parent)

Service 2 creates span:
- traceId: 550e8400e29b41d4a716446655440000 (same)
- spanId: 8a5ck9d9c1b2f3g4 (new)
- parentSpanId: f7ad6b7b90a4eea1 (linked to parent)
```

**Jaeger Visualization:**
```
Trace: 550e8400... (total: 500ms)
├─ user-service GET /users/123 [30ms] ✅
│  ├─ db query [15ms] ✅
│  └─ cache lookup [5ms] ✅
├─ order-service GET /orders [450ms] ⚠️ (slow)
│  ├─ db query [400ms] ⚠️ (bottleneck)
│  │  └─ index scan [350ms] (N+1 query detected)
│  └─ cache miss [50ms]
└─ notification-service POST /send [20ms] ✅
   └─ email queue [10ms] ✅
```

## Part 4: Graceful Shutdown & Health Checks

**❌ Abrupt Shutdown (Data Loss):**
```javascript
// No graceful handling
const server = app.listen(3000);
// User sends request...
// SIGTERM arrives → server dies immediately
// In-flight request lost without response
```

**✅ Graceful Shutdown (Zero Request Loss):**
```javascript
const server = app.listen(3000);
const activeRequests = new Set();

app.use((req, res, next) => {
  activeRequests.add(req);
  res.on('finish', () => activeRequests.delete(req));
  res.on('close', () => activeRequests.delete(req));
  next();
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, starting graceful shutdown...');
  
  // 1. Stop accepting new requests
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  // 2. Wait for in-flight requests to complete (max 25s, Kubernetes gives 30s)
  let waitTime = 0;
  while (activeRequests.size > 0 && waitTime < 25000) {
    console.log(`Waiting for ${activeRequests.size} requests to complete...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    waitTime += 1000;
  }
  
  // 3. Clone resources
  await Promise.all([
    dbPool.end(),
    redisClient.quit(),
    amqpConnection.close()
  ]);
  
  console.log('Graceful shutdown complete');
  process.exit(0);
});
```

**Kubernetes Integration:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 30  # Gives pod 30s to shut down
      containers:
        - name: user-service
          image: user-service:1.0
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 5"]  # Wait for LB to remove endpoint
          ports:
            - containerPort: 8080
```

**Health Checks:**
```javascript
// Health endpoint
app.get('/health/live', (req, res) => {
  // Liveness: Is the app running?
  res.json({ status: 'alive' });
});

app.get('/health/ready', (req, res) => {
  // Readiness: Can accept traffic?
  const checks = {
    database: await dbPool.query('SELECT 1'),
    redis: redisClient.ping(),
    rabbitmq: amqpConnection.connection.serverProperties !== undefined
  };
  
  if (checks.database && checks.redis && checks.rabbitmq) {
    res.status(200).json({ ready: true, checks });
  } else {
    res.status(503).json({ ready: false, checks });
  }
});

app.get('/health/startup', (req, res) => {
  // Startup probe: Finished initialization?
  if (appInitialized) {
    res.json({ initialized: true });
  } else {
    res.status(503).json({ initialized: false });
  }
});
```

## Part 5: Security (RBAC, Network Policies, Secrets)

### Role-Based Access Control (RBAC)

**Problem: Default Kubernetes is Too Permissive**
```
Every pod can:
- Read all secrets
- Delete all deployments
- Access all services
→ Compromised application = compromised entire cluster!
```

**✅ Least Privilege RBAC:**
```yaml
# ServiceAccount for order-service
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
  namespace: production

---
# Role: Only what order-service needs
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: order-service-role
  namespace: production
rules:
  # Read its own secrets
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["order-service-secret"]
    verbs: ["get"]
  # Read its own config
  - apiGroups: [""]
    resources: ["configmaps"]
    resourceNames: ["order-service-config"]
    verbs: ["get"]
  # Cannot delete anything, cannot access other services' secrets

---
# RoleBinding: Attach role to service account
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: order-service-rolebinding
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: order-service-role
subjects:
  - kind: ServiceAccount
    name: order-service
    namespace: production

---
# Pod uses service account
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: production
spec:
  template:
    spec:
      serviceAccountName: order-service  # Uses RBAC role above
      containers:
        - name: order-service
          image: order-service:1.0
```

### Network Policies: Firewall for Pods

**❌ No Network Policies (Everything Can Talk to Everything):**
```
order-service can reach: ✗ payment-service ✗ user-service ✗ admin-service ✗ (unwanted)
malicious-pod can reach: ✗ database ✗ redis ✗ payment-gateway ✗ (catastrophic!)
```

**✅ Restrict Traffic:**
```yaml
# Deny all traffic by default
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: production
spec:
  podSelector: {}  # All pods
  policyTypes:
    - Ingress

---
# Allow order-service to receive from ingress controller
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-order-ingress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: order-service
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080

---
# Allow order-service to call payment-service only
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-order-to-payment
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: payment-service
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: order-service
      ports:
        - protocol: TCP
          port: 8080
```

### Secrets Management

**❌ Secrets in Plain Text:**
```yaml
# NEVER DO THIS
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
stringData:
  password: "SuperSecret123!"  # Visible in `kubectl get secret -o yaml`
```

**✅ Encrypted Secrets with Sealed Secrets:**
```bash
# Generate sealed secret (encrypted)
echo -n 'SuperSecret123!' | kubectl create secret generic db-secret \
  --dry-run=client \
  --from-file=password=/dev/stdin \
  -o yaml | kubeseal -f - > sealed-secret.yaml

# sealed-secret.yaml contains encrypted blob
# Only cluster can decrypt (has private key)
```

## Part 6: GitOps & Automated Deployments

**Traditional Deployment (Manual):**
```bash
# Admin builds and pushes manually
docker build -t myapp:2.0 .
docker push myregistry/myapp:2.0
kubectl set image deployment/myapp myapp=myregistry/myapp:2.0
# Admin could accidentally set wrong version, forget to deploy to production, etc.
```

**✅ GitOps (Declarative, Automatic):**
```
Git Repository: infra/ folder
├─ user-service.yaml
├─ order-service.yaml
└─ database.yaml

ArgoCD watches repository continuously:
1. Git updated: user-service.yaml version: 2.0.1
2. ArgoCD detects mismatch (cluster has 2.0.0)
3. ArgoCD automatically deploys new version
4. Kubernetes rolling update (old pods → new pods)

Benefits:
✓ All changes recorded in Git (audit trail)
✓ Automatic sync (no manual kubectl commands)
✓ Easy rollback (git revert)
✓ Multiple environments (dev/staging/prod in same repo)
✓ Pull request = approval gate before deployment
```

**ArgoCD Application:**
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: user-service-production
  namespace: argocd
spec:
  project: production
  source:
    repoURL: https://github.com/mycompany/infra
    targetRevision: main
    path: kubernetes/production/user-service
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true      # Delete resources removed from Git
      selfHeal: true   # Re-deploy if cluster drifts from Git
    syncOptions:
      - CreateNamespace=true
  notifications:
    - type: slack
      when: degraded,synced
```

## Part 7: Production Troubleshooting Runbook

**Scenario: Users Report Slow Order Processing**

```
1. DETECT (30 seconds)
   Grafana dashboard alert: order-service p99 latency > 2000ms
   
2. ASSESS (2 minutes)
   kubectl get pods -n production | grep order-service
   # See if pods are crashing/restarting
   
   kubectl get events -n production --sort-by='.lastTimestamp'
   # Check for pod evictions, node pressure, etc
   
   kubectl top pods -n production -l app=order-service
   # CPU/memory usage on high? Memory leak?
   
3. GATHER DATA (5 minutes)
   # Logs with trace IDs
   kubectl logs -n production -l app=order-service --tail=100 | grep ERROR
   
   # Jaeger: Find slow traces
   # Query: latency > 2s, service=order-service
   # Result: Traces show db queries taking 1500ms
   
   # Prometheus: Check database
   rate(pg_query_duration_seconds_sum{job="postgres"}[5m]) / 
     rate(pg_query_duration_seconds_count[5m])
   # Database p99 latency also high → root cause!
   
4. DIAGNOSE (5 minutes)
   # Connect to postgres pod
   kubectl exec -it postgres-0 -- psql -U postgres -d orders
   
   # Check for slow queries
   SELECT query, calls, mean_time, max_time FROM pg_stat_statements
   ORDER BY mean_time DESC LIMIT 5;
   
   # Result: SELECT * FROM orders (no WHERE clause!) doing full table scan
   # 10 million rows × full table scan × 100 concurrent queries = 1500ms each
   
5. FIX (5 minutes)
   # Option A: Add index (long-term)
   CREATE INDEX idx_orders_user_id ON orders(user_id);
   
   # Option B: Immediate: Query optimization
   # Change: SELECT * FROM orders
   # To: SELECT id, user_id, status FROM orders WHERE user_id = $1
   
   # Deploy fix via git
   git commit -am "fix: optimize order query with index"
   git push
   # ArgoCD detects change, rolls out new version automatically
   
6. VERIFY (2 minutes)
   kubectl rollout status deployment/order-service -n production
   # Wait for new pods to be ready
   
   # Metrics should improve within 30s
   kubectl top pods -n production -l app=order-service
   # CPU drops, latency normalizes
   
7. POST-MORTEM (Next day)
   - Why didn't monitoring catch this earlier?
     → Add proactive alert: "Slow query detected" (> 1000ms)
   - Why wasn't this caught in staging?
     → Run production-scale load tests before release
   - Why no index in first place?
     → Add "index missing" alert for frequently-filtered columns
```

## Interview Questions for Staff-Level Kubernetes Engineers

**Junior Level:**
1. What's a Kubernetes Pod? How is it different from a container?
2. Explain Services and why they're needed
3. What's a Deployment and what problem does it solve?
4. How does Kubernetes handle rolling updates?

**Senior Level:**
5. Design a highly available PostgreSQL deployment on Kubernetes. How do you handle replication, backup, failover?
6. A service is slow. Walk through your troubleshooting process using observability
7. How would you implement canary deployments with automatic rollback? What metrics trigger rollback?
8. Explain how HPA scales based on custom metrics. How do you prevent cascading failures during scale-up?

**Staff Level:**
9. Design a multi-region Kubernetes architecture for a $100M SaaS company (high availability, disaster recovery, latency requirements)
10. Walk through a complete incident: payment service degraded 50% (high latency). Use logs, metrics, traces to diagnose. You have 15 minutes.
11. How would you implement a cluster autoscaler that predicts load spikes and provisions capacity proactively?
12. Design the observability stack for a company growing 10x in users over 12 months. How do you keep cost flat as signal grows?

## Career Progression

**Junior Kubernetes Engineer ($80K–$100K)**
- Deploy existing services to Kubernetes
- Fix simple pod crashing issues
- Update deployments, apply manifests from senior engineers
- Follow runbooks for common issues
- Skill focus: Learn Kubernetes basics, practice kubectl commands

**Senior Kubernetes Engineer ($120K–$150K)**
- Design stateful deployments (databases, message queues)
- Implement health checks, auto-scaling
- Troubleshoot complex cross-service issues
- Write playbooks/runbooks for on-call
- Mentor juniors on Kubernetes best practices

**Staff Kubernetes / Platform Engineer ($180K–$250K)**
- Design company-wide Kubernetes strategy (multi-cluster, multi-region)
- Build internal developer platform (IDP): CI/CD, secret management, observability
- Make architecture decisions: GitOps vs traditional, managed vs self-hosted
- Optimize costs ($10M infrastructure → $7M through right-sizing, auto-scaling)
- Lead on-call culture shift: monitoring/alerting/runbooks reduce MTTR from 2h → 15min

## Real Business Numbers

**Company: Uber/Spotify Scale**
```
Infrastructure Costs:
- Before Kubernetes: $10M/month manual scaling, always over-provisioned
- After Kubernetes: $7M/month (auto-scaling, 40% savings)
- With advanced observability: $6.5M/month (fewer incidents, better debugging)
- Staff platform engineer salary: $200K
- ROI: ($10M - $6.5M) × 12 / $200K = 210x

Incident Impact:
- Before: Payment outage → 6 hours MTTR → $50K revenue loss
- After: Same issue detected in 2 min, fixed in 15 min via observability → $0 loss
- 1 critical incident prevented per year = $500K+ saved
```

---

**Key Takeaway:** Production engineering is about building systems that:
1. Scale automatically (HPA, resource management)
2. Fail gracefully (health checks, graceful shutdown)
3. Recover automatically (RBAC, network policies, security
4. Communicate clearly (structured logs, metrics, traces)
5. Enable fast debugging (correlation IDs, dashboards, runbooks)

Master these, and you can operate systems at any scale with confidence.
