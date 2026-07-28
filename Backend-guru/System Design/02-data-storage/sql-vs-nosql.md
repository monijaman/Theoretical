# SQL vs NoSQL

[← Back to index](../readme.md)

## Why SQL vs NoSQL Matters

In system design interviews, the question is not:

> "Which database is better?"

The real question is:

> "Which database fits the application's access pattern?"

SQL and NoSQL make different trade-offs.

SQL optimizes for:

- Data consistency
- Relationships
- Complex queries
- Strong constraints

NoSQL optimizes for:

- Horizontal scale
- Flexible data models
- High throughput
- Specific access patterns

Choosing NoSQL because:

```
"It scales better"
```

is usually a weak answer.

A strong answer explains:

```
What data do we store?
How do we query it?
How often do we update it?
What consistency do we need?
```

---

# SQL (Relational Database)

Examples:

- PostgreSQL
- MySQL
- SQL Server
- Oracle

SQL databases store data in tables with predefined schemas.

Example:

## Users Table

```
users

id
name
email
```

## Orders Table

```
orders

id
user_id
total
```

## Order Items Table

```
order_items

order_id
product
quantity
```

Relationship:

```
Users

  |
  |
  v

Orders

  |
  |
  v

Order Items
```

---

# SQL Strengths

## 1. ACID Transactions

SQL databases provide:

- Atomicity
- Consistency
- Isolation
- Durability

Example:

Bank transfer:

```
Account A:

- $100 removed


Account B:

+ $100 added
```

Either:

```
Both succeed
```

or:

```
Both rollback
```

---

## 2. Strong Data Integrity

The database can enforce rules.

Example:

Foreign key:

```sql
orders.user_id
       |
       |
       v
users.id
```

The database prevents:

```
Order without a user
```

---

Other constraints:

```sql
UNIQUE(email)

NOT NULL(name)

CHECK(balance >= 0)
```

---

## 3. Powerful Queries

SQL supports:

- JOIN
- GROUP BY
- Aggregation
- Filtering
- Sorting

Example:

```sql
SELECT 
    users.email,
    orders.total

FROM users

JOIN orders
ON users.id = orders.user_id;
```

---

# SQL Weaknesses

## 1. Horizontal Scaling Is Harder

Scaling reads:

```
Primary Database

       |
       |
 Read Replicas
```

is easy.

Scaling writes is harder.

Eventually:

```
One database server

        |
        |
        v

Need sharding
```

Now joins become complicated.

---

## 2. Schema Changes

Changing large tables can be expensive.

Example:

Adding a column:

```
users table

100 million rows
```

requires careful migration.

---

# NoSQL

NoSQL is not one database type.

It includes several different models.

Main categories:

```
1. Key-Value

2. Document

3. Column Family

4. Graph
```

Each solves different problems.

---

# 1. Key-Value Database

Examples:

- Redis
- DynamoDB

Data is stored using a key.

Example:

```
Key:

user:123:session


Value:

{
 "cart": [
   "phone",
   "keyboard"
 ]
}
```

Access:

```
GET user:123:session
```

---

## Best For

When access is always:

```
Give me data by exact key
```

Examples:

- Sessions
- Cache
- Feature flags
- Shopping carts

---

## Advantages

- Extremely fast
- Easy horizontal scaling
- Very high throughput

---

## Weakness

Poor for:

```
Find all users where age > 30
```

because there is no relational query engine.

---

# 2. Document Database

Examples:

- MongoDB
- Couchbase
- Firestore

Stores JSON-like documents.

Example:

```json
{
  "_id": "product123",

  "name": "Laptop",

  "variants": [
    {
      "color": "black",
      "price": 900
    },
    {
      "color": "white",
      "price": 950
    }
  ]
}
```

---

## Best For

Data that naturally belongs together.

Example:

Product:

```
Product

 ├── Details

 ├── Images

 └── Variants
```

Instead of:

```
Product Table

Variant Table

Image Table
```

with multiple joins.

---

## Advantages

- Flexible schema
- Easy object mapping
- Good for rapidly changing data

---

## Weakness

Data duplication.

Example:

Customer address copied into:

```
Order 1

Order 2

Order 3
```

If address changes:

You update many documents.

---

# 3. Column-Family Database

Examples:

- Cassandra
- HBase
- Google Bigtable

Designed for massive writes.

Example:

IoT sensor data:

```
Sensor: 1001


10:00

temperature: 22


10:01

temperature: 23


10:02

temperature: 24
```

---

## Best For

- Time-series data
- Logs
- Analytics events
- IoT data

---

## Advantages

- Extremely high write throughput
- Easy horizontal scaling

---

## Weakness

Queries must match the data model.

Example:

Good:

```
Find sensor data by sensor_id
```

Bad:

```
Find all sensors with temperature > 50
```

---

# 4. Graph Database

Examples:

- Neo4j
- Amazon Neptune

Relationships are the main data.

Example:

Social network:

```
Alice

 |
 follows

Bob

 |
 follows

Charlie
```

---

Query:

"Find friends of friends"

Graph:

```
Alice
 |
 Bob
 |
Charlie
```

is natural.

---

SQL alternative:

```sql
JOIN friendships
JOIN friendships
JOIN friendships
```

becomes expensive.

---

## Best For

- Social networks
- Fraud detection
- Recommendation systems
- Knowledge graphs

---

# NewSQL

Examples:

- Google Spanner
- CockroachDB
- YugabyteDB
- TiDB

Goal:

Combine:

```
SQL
+
ACID
+
Horizontal Scaling
```

---

Architecture:

```
Application

     |
     |

Distributed SQL Database

     |
     |
Multiple Nodes
```

---

## Advantages

You get:

- SQL queries
- Transactions
- Distributed scaling

---

## Weakness

More operational complexity.

Cross-region writes are slower because data must reach consensus.

---

# SQL vs NoSQL Comparison

| Feature | SQL | Key-Value | Document | Column Family | Graph | NewSQL |
|-|-|-|-|-|-|-|
| Schema | Fixed | None | Flexible | Fixed by query | Flexible | Fixed |
| Transactions | Strong | Limited | Limited/Supported | Limited | Limited | Strong |
| Joins | Excellent | No | Limited | No | Relationship based | Excellent |
| Scaling | Vertical first | Horizontal | Horizontal | Massive scale | Relationship scale | Horizontal |
| Query Flexibility | High | Low | Medium | Low | High for graphs | High |
| Best Use | Business data | Cache | JSON objects | Huge writes | Relationships | Global SQL |

---

# Practical Decision Guide

## Choose SQL When:

You need:

```
Users
Orders
Payments
Invoices
Accounts
```

Because:

- Data relationships matter
- Transactions matter
- Correctness matters

Example:

E-commerce checkout.

---

## Choose Key-Value When:

You need:

```
Get this exact thing quickly
```

Examples:

- Sessions
- Cache
- Tokens

---

## Choose Document When:

Your data looks like:

```
A complete object
```

Examples:

- Product catalog
- CMS
- User profiles

---

## Choose Column Family When:

You have:

```
Millions of writes per second
```

Examples:

- Logs
- Metrics
- IoT

---

## Choose Graph When:

Your question is:

```
Who is connected to whom?
```

Examples:

- Recommendations
- Fraud networks

---

# Common Interview Questions

## Q: Should I always choose NoSQL for large systems?

No.

Most systems should start with SQL.

Example:

PostgreSQL can handle:

- Millions of rows
- Thousands of queries per second

without problems.

Choose NoSQL only when a specific requirement demands it.

---

# Q: MongoDB vs PostgreSQL JSONB?

PostgreSQL JSONB gives:

```
Relational database

+

Flexible JSON fields
```

Example:

```sql
users

id
name
metadata JSONB
```

Use MongoDB when most of your data is naturally document-based.

Use PostgreSQL when relationships and transactions dominate.

---

# Q: Does NoSQL mean no schema?

No.

The schema still exists.

The difference:

SQL:

```
Database enforces schema
```

NoSQL:

```
Application enforces schema
```

The responsibility moves from:

```
Database

        |

Application
```

---

# Q: Is eventual consistency only a NoSQL feature?

No.

Consistency depends on the database design.

Examples:

NoSQL:

```
MongoDB
Strong reads from primary
```

SQL:

```
Distributed SQL systems
May use replication delays
```

---

# Q: When choose Graph over SQL?

Choose Graph when queries involve variable-depth relationships.

Example:

```
Find fraud network within 5 connections
```

Graph:

```
Fast traversal
```

SQL:

```
Many recursive joins
```

---

# Simple Rule To Remember

```
Business Transactions
        |
        v
SQL


Exact Key Lookup
        |
        v
Key-Value


JSON/Object Data
        |
        v
Document


Massive Writes
        |
        v
Column Family


Relationship Queries
        |
        v
Graph


SQL + Global Scale
        |
        v
NewSQL
```

---

# Interview Answer

A strong system design answer:

> "I would start with a relational database unless the access pattern clearly requires another model. SQL gives strong consistency, transactions, and flexible querying. I would introduce NoSQL only for specific workloads like caching, high-volume event ingestion, document storage, or relationship-heavy queries."

## Related topics
- [Database Sharding](database-sharding.md)
- [Database Partitioning](database-partitioning.md)
- [Database Replication](database-replication.md)
- [Database Indexing](database-indexing.md)
- [CAP Theorem](../03-consistency-distributed/cap-theorem.md)
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
