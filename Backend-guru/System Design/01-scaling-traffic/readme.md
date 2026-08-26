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
