# Database Connection Pooling

[← Back to index](../readme.md)

## Why This Topic Matters

Database connection pooling is a common system design and backend interview topic because it tests whether you understand:

- Why creating too many database connections is dangerous
- How applications reuse database connections efficiently
- Why microservices and serverless systems create connection problems
- How to protect a database from traffic spikes

A common beginner mistake is:

> "If my application is slow, I will just create more database connections."

This usually makes the problem worse.

A database can only handle a limited number of active connections. More connections do not always mean more performance.

---

# What Is a Database Connection?

A database connection is a communication channel between your application and the database.

Example:

```
User Request
     |
     ↓
Backend API
     |
     ↓
Database Connection
     |
     ↓
PostgreSQL / MySQL
```

Every query needs a connection:

```text
Application
    |
    |---- Open connection
    |
    |---- Execute query
    |
    |---- Close connection
```

The problem is:

Opening a connection is expensive.

---

# Why Opening a Connection Is Expensive

A database connection is not just opening a network socket.

Several expensive operations happen:

```
1. TCP handshake
   Client ↔ Database communication setup

2. TLS handshake (if enabled)
   Encryption negotiation

3. Authentication
   Database checks username/password/permissions

4. Server resource allocation
   Database creates memory/process resources

5. Session initialization
   Loads settings, caches, temporary state
```

For PostgreSQL specifically:

- Each connection creates a separate backend process
- Each process consumes memory
- More processes create more CPU scheduling overhead

Example:

```
1000 database connections

=

1000 PostgreSQL backend processes

=

More memory usage
More context switching
More CPU overhead
```

Eventually performance goes down.

---

# The Problem Without Connection Pooling

Imagine every API request creates a new connection.

```
Request 1
   |
   ├── Open DB connection
   ├── Run query
   └── Close connection


Request 2
   |
   ├── Open DB connection
   ├── Run query
   └── Close connection


Request 3
   |
   ├── Open DB connection
   ├── Run query
   └── Close connection
```

The application keeps paying the connection setup cost.

---

# The Solution: Connection Pooling

A connection pool keeps a group of reusable database connections.

Instead of creating a new connection every time:

```
Application starts

        |
        ↓

Create 20 database connections

        |
        ↓

Keep them alive


Request comes:

        |
        ↓

Borrow connection from pool

        |
        ↓

Execute query

        |
        ↓

Return connection to pool
```

The connection is reused.

---

## Without Pooling

```
Request
   |
   ↓
Create connection
   |
   ↓
Query
   |
   ↓
Destroy connection
```

Connection setup happens repeatedly.

---

## With Pooling

```
Application

    |
    |
Connection Pool

    |
    |
Database


Request:

Borrow connection
       |
       ↓
Execute query
       |
       ↓
Return connection
```

The expensive connection creation happens only once.

---

# Connection Pool Size

A common mistake:

> "More connections = more performance"

Wrong.

A database has limited CPU and memory.

Example:

```
Database server:

8 CPU cores

Connection pool:

500 connections
```

Most connections will not execute work.

They will just compete for:

- CPU
- Memory
- Locks
- Disk access

The database becomes slower.

---

# How To Think About Pool Size

A good starting formula:

```
pool size ≈ (CPU cores × 2) + disk count
```

Example:

Database:

```
CPU cores = 8
SSD storage = 1
```

Calculation:

```
(8 × 2) + 1

= 17 connections
```

Usually you may start around:

```
20 connections
```

Then measure.

---

# The Real Formula: Little's Law

A more practical approach:

```
L = λ × W
```

Where:

```
L = required connections

λ = requests per second

W = average query time in seconds
```

Example:

Your application:

```
2000 queries/sec

Average query time:

5 milliseconds

0.005 seconds
```

Calculation:

```
2000 × 0.005

= 10 connections
```

You need around:

```
10 active connections
```

plus some extra capacity.

---

# PgBouncer

## What Is PgBouncer?

PgBouncer is a lightweight connection pooler for PostgreSQL.

It sits between your application and PostgreSQL.

Architecture:

```
Many Applications

       |
       ↓

    PgBouncer

       |
       ↓

 PostgreSQL
```

Instead of:

```
1000 application connections

        ↓

1000 database connections
```

You get:

```
1000 application connections

        ↓

PgBouncer

        ↓

50 real database connections
```

---

# PgBouncer Pooling Modes

## 1. Session Pooling

A client keeps the same database connection.

Example:

```
User A
 |
 |
Database connection #1
 |
 |
Until logout
```

Advantages:

✅ Supports all PostgreSQL features

Works with:

- Session variables
- Prepared statements
- LISTEN/NOTIFY
- Advisory locks


Disadvantages:

❌ Less connection reduction

Because each client keeps a real connection.

---

## 2. Transaction Pooling

A connection is borrowed only during a transaction.

Example:

```
Client A

BEGIN
 |
Query
 |
COMMIT

Connection returned


Client B

BEGIN
 |
Query
 |
COMMIT

Same connection reused
```

Benefits:

✅ Huge connection reduction

Example:

```
5000 application connections

can use

100 real database connections
```

---

## Transaction Pooling Trade-off

The database connection can change between transactions.

Example:

```
Transaction 1

Connection #1

SET search_path='company_a'


Transaction 2

Connection #2

(search_path is missing)
```

Session data does not survive.

Avoid relying on:

- Temporary tables
- Session variables
- Advisory locks
- Some prepared statements

---

# Connection Problems in Microservices

Microservices make this problem worse.

Example:

```
Service A

20 containers

Each has 20 connections


= 400 connections


Service B

15 containers

Each has 20 connections


= 300 connections


Service C

10 containers

Each has 20 connections


= 200 connections
```

Total:

```
400 + 300 + 200

= 900 connections
```

But database supports:

```
300 connections
```

Result:

```
New connections rejected

↓

API failures

↓

Timeouts

↓

System outage
```

---

# Solutions for Microservices

## Option 1: Shared Connection Pooler

Example:

```
Services

    |
    ↓

PgBouncer

    |
    ↓

Database
```

Benefits:

- Central connection management
- Prevents database overload
- Works well with many services

---

## Option 2: Limit Each Service Pool

Example:

Instead of:

```
20 services

× 50 connections

= 1000 connections
```

Use:

```
20 services

× 10 connections

= 200 connections
```

---

# Serverless Connection Problems

Serverless systems like AWS Lambda are especially risky.

Why?

Because Lambda can create thousands of execution environments quickly.

Example:

```
Traffic spike

↓

Lambda creates 2000 instances

↓

Each instance opens database connection

↓

2000 database connections

↓

Database limit = 500

↓

Connection failures
```

---

# Solutions for Serverless

## 1. RDS Proxy

AWS RDS Proxy manages connections between Lambda and the database.

Architecture:

```
Lambda Functions

       |
       ↓

   RDS Proxy

       |
       ↓

 PostgreSQL
```

Benefits:

- Reuses connections
- Handles traffic spikes
- Reduces database pressure

---

## 2. PgBouncer

Alternative:

```
Lambda

   ↓

PgBouncer

   ↓

Database
```

---

## 3. Reuse Connections in Warm Lambda Instances

Example:

Bad:

```javascript
handler() {

   createDatabaseConnection()

   query()

}
```

Better:

```javascript
const connection =
   createConnection()


handler() {

   query(connection)

}
```

This helps warm executions reuse connections.

But:

It does not completely solve the problem because new Lambda instances can still appear.

---

# Connection Pool Comparison

| Approach | Reduces Connections | Supports Session Features | Best For |
|---|---|---|---|
| Application Pool | Limited | Yes | Monoliths |
| PgBouncer Session Mode | Medium | Yes | Applications needing sessions |
| PgBouncer Transaction Mode | High | No | Microservices |
| RDS Proxy | High | Partial | AWS Lambda/serverless |

---

# Common Interview Questions

## Q: Why not increase database max_connections?

Because connections consume resources.

More connections cause:

- More memory usage
- More CPU scheduling
- More lock contention

Pooling solves the real problem:

> Too many clients competing for limited database execution capacity.

---

## Q: What breaks with transaction pooling?

Anything depending on session state.

Examples:

```
SET commands
Temporary tables
Advisory locks
Prepared statements
```

The next transaction may use another connection.

---

## Q: How do you size a pool?

Use:

1. Query workload
2. Average query time
3. Database CPU capacity
4. Load testing

Do not blindly increase the pool.

---

## Q: Why is Lambda worse than normal servers?

Traditional servers:

```
10 servers

× 20 connections

= 200 connections
```

Lambda:

```
Traffic spike

2000 execution environments

× 1 connection

= 2000 connections
```

The scaling happens much faster.

---

## Q: How do you detect connection exhaustion?

Monitor:

### Database side

```
Active connections

/

max_connections
```

Example:

```
250 / 300

= 83%
```

Alert before reaching 100%.

---

### Application side

Monitor:

- Connection pool waiting time
- Connection timeout errors
- Query latency
- Database CPU
- Lock waits

A growing pool wait time is usually the first warning sign.

---

# Key Takeaways

Remember these points for interviews:

1. Opening database connections is expensive.
2. Connection pooling reuses existing connections.
3. Bigger pools do not always improve performance.
4. Database capacity is limited by CPU, memory, and locks.
5. Microservices multiply connection usage.
6. Serverless creates connection storms.
7. PgBouncer and RDS Proxy protect databases from connection overload.
8. Transaction pooling gives the biggest scalability improvement but removes session guarantees.

## Related topics
- [Database Replication](database-replication.md)
- [Database Sharding](database-sharding.md)
- [CAP Theorem](../03-consistency-distributed/cap-theorem.md)
- [Circuit Breaker Pattern](../01-scaling-traffic/circuit-breaker-pattern.md)
- [Backpressure](../01-scaling-traffic/backpressure.md)
