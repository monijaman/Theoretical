How Load Balancer Works (Simple Flow)
Client sends request → example.com
Request hits Load Balancer
Load Balancer decides which backend server should handle it
Forwards request → Server A / B / C
Returns response → Client

👉 Think of it like a traffic police officer directing cars to less crowded roads.

⚙️ Types of Load Balancers (by layer)
1. Layer 4 (Transport Level)
Works on IP + Port (TCP/UDP)
Doesn’t inspect request content
Faster, lower overhead

Examples:

HAProxy (L4 mode)
NGINX (stream module)

👉 Best for: high performance, simple routing

2. Layer 7 (Application Level)
Works on HTTP/HTTPS
Can inspect:
URL (/api/users)
Headers
Cookies

Examples:

NGINX
Envoy

👉 Best for:

API routing
Microservices
A/B testing
🔁 Load Balancing Algorithms
1. Round Robin
Requests go one by one to servers
A → B → C → A → B → C

✔ Simple
❌ Not good if servers have different capacity

2. Least Connections
Sends request to server with fewest active connections

✔ Better for real-time systems
❌ Slightly more complex

3. Weighted Round Robin
Assign weight (power) to servers
A (weight 3), B (weight 1)
→ A, A, A, B

✔ Handles different server strengths
❌ Needs tuning

4. IP Hash
Same user always goes to same server

✔ Good for session persistence
❌ Not flexible

🏗️ Technologies Used
🔹 Software Load Balancers
NGINX
HAProxy
Envoy

👉 Used in:

Node.js / Next.js apps
Microservices architecture
🔹 Cloud Load Balancers
Amazon Web Services → ALB / NLB
Google Cloud Platform → Cloud Load Balancer
Microsoft Azure → Azure Load Balancer

👉 Fully managed, auto-scaling

🔹 Hardware Load Balancers
Physical devices (e.g., F5)
High performance but expensive
🔐 Extra Features
SSL termination (HTTPS handling)
Health checks (remove dead servers)
Sticky sessions
Rate limiting
Caching (sometimes)
✅ Pros
🚀 Scalability
Easily add/remove servers
🛡️ High Availability
If one server fails → traffic goes to others
⚡ Performance
Distributes load → faster response
🔄 Zero Downtime Deployment
Rolling updates possible
❌ Cons
💸 Cost
Cloud LB can be expensive
🧩 Complexity
More components to manage
⚠️ Single Point of Failure (if not configured well)
Need redundant load balancers
🐞 Debugging Harder
Traffic is distributed → tracing issues is harder
🏗️ Real-World Architecture Example
User
  ↓
Load Balancer (NGINX / AWS ALB)
  ↓
-------------------------
|   App Server 1        |
|   App Server 2        |
|   App Server 3        |
-------------------------
  ↓
Database
💡 Pro Insight (for interviews)

If you want to sound senior:

Combine Load Balancer + Auto Scaling
Use Layer 7 for microservices
Add CDN (e.g., CloudFront) before LB
Use health checks + circuit breakers

If you want, I can:

Show NGINX config example
Design a system architecture for your Next.js + Node app
Or explain how load balancing works with Kubernetes (very important)