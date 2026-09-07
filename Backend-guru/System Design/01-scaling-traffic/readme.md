# 1. Scaling & Traffic Management

This section covers the first layer of system design: how to keep services available and responsive when traffic grows.

## What this section covers

- Load balancing: distributing traffic across multiple instances
- Reverse proxy and API gateway: centralizing routing, auth, and edge logic
- Scaling: choosing between vertical and horizontal growth
- Rate limiting: protecting services from overload and abuse
- Backpressure and circuit breakers: preventing cascading failures
- Retries and exponential backoff: recovering safely from transient failures

## How to study it

1. Learn the core idea of each topic in plain English first.
2. Then connect them to real failures: overload, slow dependencies, and cascading outages.
3. Practice explaining why one approach is better than another in an interview.

## Suggested starting point

- [Load Balancing](load-balancing.md)

## All Topics in This Folder

- [Backpressure (Easy to Understand)](backpressure.md)
- [Load Balancing](circuit-breaker-pattern.md)
- [Horizontal vs Vertical Scaling](horizontal-vs-vertical-scaling.md)
- [Load Balancing](load-balancing.md)
- [Rate Limiting](rate-limiting.md)
- [Retry & Exponential Backoff](retry-exponential-backoff.md)
- [Reverse Proxy & API Gateway](reverse-proxy-api-gateway.md)

## Practice Check

Sketch how a traffic spike reaches your API. Choose where to balance requests, limit demand, and stop retries from amplifying overload.

[System Design guide](../readme.md) · [Backend learning guide](../../readme.md)
