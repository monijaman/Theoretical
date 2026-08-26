# Multi-Tenant Architecture
[← Back to index](../readme.md)

## What it is and why it's asked

A **multi-tenant architecture** allows a single application deployment to serve multiple independent customers (called **tenants**) while keeping each tenant's data isolated. A tenant might be a company, organization, workspace, school, or customer account.

Nearly every modern B2B SaaS product—Salesforce, Slack, Shopify, GitHub Enterprise, Notion, Jira—uses some form of multi-tenancy.

Interviewers ask this topic because "multi-tenant" isn't one architecture. The real engineering decision is **how much isolation each tenant needs versus how much operational cost you're willing to pay**. The answer depends on security, compliance, scalability, and customer requirements.

---

# Why Multi-Tenancy Exists

Without multi-tenancy, every customer gets their own deployment.

```text
Customer A
    |
 App A
    |
 DB A

Customer B
    |
 App B
    |
 DB B

Customer C
    |
 App C
    |
 DB C
```

Easy to isolate.

Very expensive.

Every deployment must be:

- updated
- monitored
- backed up
- scaled
- patched

Instead, SaaS companies usually run one platform that serves everyone.

```text
          Customer A
          Customer B
          Customer C
               |
         Shared Application
               |
        Shared Infrastructure
```

Now the challenge becomes:

> How do we keep Customer A from ever seeing Customer B's data?

That is the entire multi-tenant problem.

---

# The Three Isolation Models

There are three common approaches.

```text
Strong Isolation
↑
|
|  Silo
|
|  Bridge
|
|  Pool
|
↓
Lower Cost
```

---

# 1. Silo Model (Database Per Tenant)

Every tenant receives its own dedicated database.

```text
Tenant A

App
 |
DB A


Tenant B

App
 |
DB B


Tenant C

App
 |
DB C
```

Sometimes enterprise customers even receive dedicated application servers.

### Advantages

- Strongest security
- Physical isolation
- No noisy neighbors
- Easy backup/restore
- Easy tenant deletion
- Meets strict compliance requirements

### Disadvantages

- Expensive
- Thousands of databases to maintain
- Schema migrations become slower
- Monitoring becomes harder
- Infrastructure costs grow linearly

If there are 10,000 tenants:

```text
10,000 databases
```

Someone has to migrate all of them.

---

# 2. Pool Model (Shared Database)

All tenants share one database.

Every row contains a tenant identifier.

Example:

```text
Orders

id
tenant_id
customer
amount
status
```

Every query must include the tenant filter.

```sql
SELECT *
FROM orders
WHERE tenant_id = 'acme'
AND status = 'pending';
```

Architecture:

```text
Tenant A
Tenant B
Tenant C
     |
 Shared App
     |
 Shared Database
```

This is by far the most common SaaS model.

### Advantages

- Lowest cost
- Easy deployments
- One schema migration
- Excellent hardware utilization
- Easy horizontal scaling

### Disadvantages

- One missing tenant filter leaks data
- Tenants share CPU
- Tenants share memory
- Tenants share connection pools
- Noisy neighbors become possible

---

# 3. Bridge Model (Hybrid)

Most tenants share infrastructure.

Enterprise customers receive dedicated infrastructure.

```text
               Small Customers
                      |
                Shared Database

Enterprise Customer
        |
 Dedicated Database
```

This is how many mature SaaS products operate.

Typical pricing:

```text
Starter
Professional
Business
Enterprise
```

Enterprise usually pays for dedicated infrastructure.

---

# Isolation Comparison

```text
Isolation

Silo
██████████████

Bridge
██████████

Pool
██████
```

Cost moves in the opposite direction.

```text
Cost

Pool
██

Bridge
██████

Silo
██████████████
```

Higher isolation almost always means higher operational cost.

---

# Tenant Identification

Every request must identify the tenant.

Common approaches:

### Subdomain

```text
acme.example.com
```

↓

```text
Tenant = Acme
```

### JWT Claim

```json
{
  "tenantId": "acme"
}
```

### API Key

```text
Authorization:
Bearer abc123...
```

↓

Lookup tenant.

### Custom Header

```text
X-Tenant-ID: acme
```

Common for internal APIs.

---

# Tenant Routing

Once the tenant is identified, the application decides where the data lives.

```text
Incoming Request
        |
Tenant Resolver
        |
Tenant Registry
        |
+--------+--------+
|                 |
Pool DB      Dedicated DB
```

The registry might contain:

```text
tenant

↓

database host

↓

schema

↓

region

↓

plan
```

For example:

```text
Acme

↓

db-east-1

Enterprise

↓

Dedicated
```

Whereas:

```text
SmallCorp

↓

shared-db-03

Starter

↓

Pool
```

This routing decision happens before executing business logic.

---

# The Noisy Neighbor Problem

In pooled databases, every tenant shares resources.

Imagine:

```text
Connection Pool

100 Connections
```

One customer starts generating a huge report.

```text
Tenant A

Uses 80 connections
```

Now everyone else competes for only 20.

```text
Tenant B

Slow

Tenant C

Slow

Tenant D

Timeouts
```

Nothing is wrong with their applications.

Another tenant consumed the shared resources.

---

# Mitigating Noisy Neighbors

Common strategies include:

- Per-tenant rate limiting
- Connection pool quotas
- Query timeouts
- Read replicas for analytics
- Background job queues
- Resource isolation
- Dedicated databases for heavy tenants

Many SaaS companies automatically promote very large customers into dedicated infrastructure.

---

# Row-Level Security (RLS)

The biggest danger in pooled databases is forgetting the tenant filter.

Suppose a developer writes:

```sql
SELECT *
FROM orders;
```

Without filtering by tenant:

```text
Every customer's data
```

A catastrophic security incident.

PostgreSQL supports **Row-Level Security (RLS)**.

```sql
ALTER TABLE orders
ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_policy
ON orders
USING (
    tenant_id =
    current_setting('app.current_tenant')::uuid
);
```

The application sets:

```sql
SET app.current_tenant = 'tenant-123';
```

Now even this query:

```sql
SELECT *
FROM orders;
```

returns only that tenant's rows.

The database itself enforces isolation.

This is much safer than relying solely on application code.

---

# Data Residency

Some countries require customer data to remain inside specific geographic regions.

Example:

```text
EU Customer

↓

EU Database

↓

EU Region
```

Another customer:

```text
US Customer

↓

US Database

↓

US Region
```

This is called **data residency**.

A single shared database often cannot satisfy these legal requirements.

---

# Compliance Requirements

Enterprise customers may require:

- HIPAA
- SOC 2
- ISO 27001
- PCI DSS
- FedRAMP
- GDPR

Many of these contracts strongly prefer—or explicitly require—physical data isolation.

Dedicated databases make compliance audits significantly easier.

---

# Tenant Migration

Eventually a tenant may outgrow the shared pool.

Migration usually looks like this:

```text
Shared Database

↓

Copy Tenant Data

↓

Dedicated Database

↓

Update Tenant Registry

↓

Future Requests

↓

Dedicated Database
```

The application changes only the routing.

The tenant continues using the same API.

---

# Typical SaaS Evolution

```text
Startup

↓

Shared Database

↓

Growth

↓

Bridge Model

↓

Enterprise

↓

Dedicated Infrastructure
```

Most companies evolve naturally through these stages.

---

# Comparison Table

| Feature | Silo | Pool | Bridge |
|----------|-------|-------|--------|
| Database | One per tenant | Shared | Mixed |
| Isolation | Excellent | Logical only | Mixed |
| Cost | High | Low | Medium |
| Performance Isolation | Excellent | Shared | Mixed |
| Compliance | Excellent | Limited | Excellent for dedicated tenants |
| Operational Complexity | High | Low | High |
| Scalability | Moderate | Excellent | Excellent |
| Typical Customers | Enterprise | SMB | Mixed SaaS |

---

# When to Choose Each

## Choose Silo when

- Enterprise customers
- Government
- Banking
- Healthcare
- Strong compliance
- Data residency
- Dedicated performance

## Choose Pool when

- SaaS startup
- Thousands of small customers
- Cost efficiency matters
- Fast product development
- No strict compliance

## Choose Bridge when

- Large SaaS platform
- Mix of enterprise and SMB customers
- Need both cost efficiency and dedicated isolation

This is the architecture most mature SaaS companies eventually adopt.

---

# Best Practices

- Always identify the tenant early in the request lifecycle.
- Never trust client-provided tenant IDs without authentication.
- Enforce Row-Level Security (RLS) where supported.
- Use automated tests to verify tenant isolation.
- Apply per-tenant rate limits and quotas.
- Encrypt tenant data at rest and in transit.
- Log tenant context for auditing.
- Design for tenant migration from day one.
- Monitor noisy-neighbor behavior.
- Keep the tenant-routing layer highly available and heavily cached.

---

# Common Interview Questions

### Q: What's the biggest risk in a pooled database?

Cross-tenant data leakage caused by missing or incorrect tenant filters.

Prevent it with:

- Row-Level Security
- automated testing
- code reviews
- tenant-aware ORM patterns
- security monitoring

---

### Q: How do you move one tenant to its own database?

1. Create a dedicated database.
2. Copy that tenant's data.
3. Update the tenant registry.
4. Route future requests to the new database.
5. Remove the tenant's data from the shared pool.

The application API remains unchanged.

---

### Q: Does multi-tenancy conflict with microservices?

No.

They solve different problems.

- **Microservices** decide how services are split by business capability.
- **Multi-tenancy** decides how customers share each service's infrastructure.

A single microservice can use:

- pooled tenants,
- dedicated tenants,
- or a hybrid approach.

---

### Q: Can Row-Level Security replace dedicated databases?

No.

RLS prevents accidental cross-tenant data access, but it cannot solve:

- noisy-neighbor resource contention,
- data residency requirements,
- independent backup and restore,
- physical isolation requirements,
- certain compliance obligations.

Dedicated databases are still required for many enterprise workloads.

---

### Q: What should a new SaaS product start with?

Usually a **pooled model**.

It offers:

- lower operational cost,
- faster development,
- simpler deployments,
- efficient infrastructure utilization.

Implement Row-Level Security from the beginning, and migrate large or compliance-sensitive tenants to dedicated infrastructure only when a clear business or technical requirement arises.

---

## Rule of Thumb

> **Start pooled, design for migration, and isolate only when a customer, workload, or regulation justifies the additional operational cost.**

## Related topics
- [Microservices Architecture](microservices-architecture.md)
- [Monolith vs. Microservices](monolith-vs-microservices.md)
- [Database Sharding](../02-data-storage/database-sharding.md)
- [Multi-Tenant SaaS (practice)](../10-system-design-practice/multi-tenant-saas.md)
- [Strong vs. Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
