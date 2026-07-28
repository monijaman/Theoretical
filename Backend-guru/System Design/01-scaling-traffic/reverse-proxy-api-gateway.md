# Reverse Proxy & API Gateway

> A **Reverse Proxy** sits between clients and backend servers. It forwards requests, hides internal servers, and handles infrastructure tasks like SSL, routing, and load balancing.
>
> An **API Gateway** is a specialized Reverse Proxy designed specifically for APIs. In addition to routing, it handles authentication, rate limiting, API versioning, request transformation, and monitoring.
>
> **Think of it this way:**
>
> - Reverse Proxy = Traffic Manager
> - API Gateway = Traffic Manager + Security Guard + API Manager

---

# Why Do We Need Them?

Without a Reverse Proxy or API Gateway:

```
             Internet

        ┌──────┼──────┐
        ▼      ▼      ▼
    API 1   API 2   API 3
```

Every backend server is exposed directly to the Internet.

Problems:

- Multiple public IP addresses
- Every service manages SSL
- Authentication duplicated everywhere
- Hard to monitor traffic
- Difficult to scale

Instead, place one component in front.

```
          Internet
               │
               ▼
      Reverse Proxy / Gateway
               │
      ┌────────┴────────┐
      ▼        ▼        ▼
    API 1    API 2    API 3
```

Clients only communicate with the gateway.

Internal services remain hidden.

---

# Reverse Proxy

A Reverse Proxy receives client requests and forwards them to backend servers.

```
Client
   │
   ▼
Reverse Proxy
   │
 ┌─┴───────────┐
 ▼             ▼
API 1       API 2
```

The client never talks directly to the backend.

---

## What Does a Reverse Proxy Do?

A Reverse Proxy commonly provides:

- SSL/TLS Termination
- Load Balancing
- Request Routing
- Compression
- Caching
- Security Headers
- Logging

Its primary responsibility is moving traffic efficiently.

---

# API Gateway

An API Gateway is a Reverse Proxy with additional API-focused features.

```
                Client
                   │
                   ▼
             API Gateway
                   │
      ┌────────────┼────────────┐
      ▼            ▼            ▼
  User API    Order API    Payment API
```

Besides forwarding requests, it understands APIs and applies policies.

---

# Reverse Proxy vs API Gateway

| Feature | Reverse Proxy | API Gateway |
|----------|---------------|-------------|
| Request Forwarding | ✅ | ✅ |
| Load Balancing | ✅ | ✅ |
| SSL Termination | ✅ | ✅ |
| Authentication | Basic | Advanced |
| Rate Limiting | Limited | ✅ |
| API Keys | ❌ | ✅ |
| JWT Validation | ❌ | ✅ |
| API Versioning | Limited | ✅ |
| Request Transformation | Basic | ✅ |
| Analytics | Basic | Advanced |

Think of an API Gateway as a **superset** of a Reverse Proxy.

---

# Request Flow

```
Client
   │
 HTTPS
   │
   ▼
API Gateway
   │
Authenticate
   │
Rate Limit
   │
Routing
   │
Logging
   │
   ▼
Backend Service
```

The request passes through multiple layers before reaching your application.

---

# Core Responsibilities

## 1. SSL/TLS Termination

Instead of every service managing certificates:

```
Internet

↓

HTTPS

↓

Gateway

↓

HTTP

↓

Backend
```

The gateway decrypts HTTPS traffic.

Backend services can communicate securely inside the private network.

Advantages:

- Easier certificate management
- Better performance
- Centralized security

---

# 2. Request Routing

The gateway routes requests to different services.

Example:

```
/users

↓

User Service
```

```
/orders

↓

Order Service
```

```
/payments

↓

Payment Service
```

Clients only need to know one public URL.

---

# 3. Authentication

Instead of every service validating tokens:

```
Client

↓

JWT Token

↓

Gateway

↓

Validate

↓

Backend
```

Invalid requests are rejected immediately.

Backend services receive only authenticated requests.

---

# 4. Authorization

Authentication answers:

```
Who are you?
```

Authorization answers:

```
What are you allowed to do?
```

Example:

```
Admin

↓

Delete User
```

Allowed.

```
Guest

↓

Delete User
```

Denied.

---

# 5. Rate Limiting

Suppose one client sends:

```
10,000 Requests
```

The gateway limits traffic.

```
100 Requests / Minute
```

If exceeded:

```
HTTP 429

Too Many Requests
```

This protects backend services from overload.

---

# 6. Request Transformation

Sometimes internal APIs differ from public APIs.

Example:

Client sends:

```
/api/v1/profile
```

Gateway forwards:

```
/internal/users/profile
```

The client never knows the internal structure.

---

# 7. Response Transformation

The gateway can also modify responses.

Example:

Backend:

```
{
"id":1,
"name":"John",
"password":"..."
}
```

Gateway removes sensitive fields before sending the response.

---

# 8. API Aggregation

Without a gateway:

```
Mobile App

↓

User API

↓

Order API

↓

Notification API
```

Three network requests.

With a gateway:

```
Mobile App

↓

Gateway

↓

User API

↓

Order API

↓

Notification API

↓

One Response
```

The gateway combines multiple backend responses into a single response.

This reduces network traffic and improves performance.

---

# 9. Logging & Monitoring

Every request passes through the gateway.

This allows centralized:

- Request Logs
- Error Logs
- Response Time
- Traffic Metrics
- User Activity

Instead of configuring every service separately.

---

# 10. Caching

Frequently requested data can be cached.

```
Client

↓

Gateway

↓

Cache

↓

Backend
```

If data already exists in cache:

```
Return Cached Response
```

Backend is never called.

This reduces latency and server load.

---

# Reverse Proxy Examples

## Nginx

- Reverse Proxy
- Load Balancer
- SSL Termination
- Static File Serving

Very popular for websites.

---

## HAProxy

- High-performance proxy
- Excellent Layer 4 & Layer 7 Load Balancing

Often used in enterprise systems.

---

## Envoy

Modern cloud-native proxy.

Common in:

- Kubernetes
- Istio
- Service Mesh

---

# API Gateway Examples

## Kong

Open-source API Gateway.

Features:

- Authentication
- JWT
- Rate Limiting
- Logging
- Plugins

---

## AWS API Gateway

Fully managed.

Supports:

- REST APIs
- HTTP APIs
- WebSockets
- Lambda Integration
- IAM Authentication

---

## Apigee

Enterprise API management platform by Google.

Provides:

- Analytics
- Monetization
- Security
- Developer Portal

---

# Reverse Proxy + API Gateway Together

Many production systems use both.

```
              Internet
                   │
                   ▼
            Reverse Proxy
             (Nginx)
                   │
                   ▼
            API Gateway
             (Kong)
                   │
         ┌─────────┴─────────┐
         ▼         ▼         ▼
      User     Order     Payment
      Service   Service    Service
```

The Reverse Proxy handles traffic and SSL.

The API Gateway handles API policies.

---

# Best Practices

✅ Use HTTPS everywhere

✅ Authenticate requests at the gateway

✅ Apply rate limiting

✅ Keep gateway stateless

✅ Log every request

✅ Use health checks

✅ Monitor latency

---

# Common Mistakes

❌ Business logic inside the gateway

❌ No authentication

❌ No rate limiting

❌ Exposing backend services directly

❌ Hardcoding service IP addresses

---

# Real-World Examples

### Netflix

Uses API Gateways to route traffic to thousands of microservices.

---

### Amazon

Public APIs are protected by API Gateways before reaching backend services.

---

### Kubernetes

Common setup:

- Nginx Ingress Controller
- Kong Gateway
- Envoy Gateway
- Traefik

---

# Reverse Proxy vs API Gateway vs Load Balancer

| Feature | Reverse Proxy | API Gateway | Load Balancer |
|----------|---------------|-------------|---------------|
| Routes Requests | ✅ | ✅ | ✅ |
| Load Balancing | ✅ | ✅ | ✅ |
| SSL Termination | ✅ | ✅ | Sometimes |
| Authentication | ❌ | ✅ | ❌ |
| API Keys | ❌ | ✅ | ❌ |
| Rate Limiting | Limited | ✅ | Limited |
| API Versioning | ❌ | ✅ | ❌ |
| Traffic Distribution | Basic | Basic | Primary Purpose |

---

# Interview Questions

## What's the difference between a Reverse Proxy and an API Gateway?

A Reverse Proxy focuses on routing traffic and infrastructure concerns.

An API Gateway includes those capabilities plus API-specific features like authentication, rate limiting, API versioning, request transformation, and analytics.

---

## Why use an API Gateway?

To centralize common API concerns such as:

- Authentication
- Authorization
- Rate Limiting
- Logging
- Routing
- Monitoring

This keeps backend services simpler.

---

## Can Nginx be used as an API Gateway?

Yes.

With additional modules or tools like OpenResty, Nginx can provide many API Gateway features.

However, dedicated gateways such as Kong or AWS API Gateway offer these capabilities out of the box.

---

## Should business logic be implemented inside the API Gateway?

Generally, no.

The gateway should focus on infrastructure concerns.

Business logic belongs in backend services.

---

## How does an API Gateway improve security?

It validates requests before they reach backend services.

Examples include:

- JWT validation
- API Key verification
- OAuth authentication
- Rate Limiting
- IP filtering

---

# Key Takeaways

- A **Reverse Proxy** sits between clients and backend servers to manage traffic.
- An **API Gateway** is a specialized Reverse Proxy for APIs with additional capabilities.
- Reverse Proxies focus on routing, SSL termination, and load balancing.
- API Gateways add authentication, rate limiting, API versioning, request transformation, and monitoring.
- Large microservice architectures typically expose only the API Gateway to the public Internet.
- Keeping business logic out of the gateway makes systems easier to maintain and scale.

---
 

## Related topics

- [Load Balancing](load-balancing.md)
- [Rate Limiting](rate-limiting.md)
- [Microservices Architecture](../07-architecture-patterns/microservices-architecture.md)
- [Distributed Tracing](../08-reliability-operations/distributed-tracing.md)
- [REST vs GraphQL vs gRPC](../06-communication-protocols/rest-vs-graphql-vs-grpc.md)
- [API Gateway (practice problem)](../10-system-design-practice/api-gateway.md)
