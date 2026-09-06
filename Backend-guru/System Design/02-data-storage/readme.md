# 2. Data & Storage

This section focuses on how data is stored, moved, and scaled across systems.

## What this section covers

- Replication: keeping copies of data for availability and read scale
- Sharding: splitting data across machines
- Partitioning: organizing data for better access patterns
- SQL vs NoSQL: choosing the right storage model
- Indexing: making reads faster
- Connection pooling: reusing database connections efficiently
- Distributed transactions: handling consistency across services
- Migration at scale: changing storage safely

## How to study it

1. Start with the storage model choice: SQL or NoSQL.
2. Then learn how replication and sharding change behavior at scale.
3. Finally, connect these ideas to consistency and latency trade-offs.

## Suggested starting point

- [Database Replication](database-replication.md)

## All Topics in This Folder

- [Database Connection Pooling](database-connection-pooling.md)
- [Database Indexing](database-indexing.md)
- [Database Migration at Scale](database-migration-at-scale.md)
- [Database Partitioning](database-partitioning.md)
- [Database Replication](database-replication.md)
- [Database Sharding](database-sharding.md)
- [Distributed Transactions](distributed-transactions.md)
- [SQL vs NoSQL](sql-vs-nosql.md)

## Practice Check

Choose a storage model for orders. Explain one index, how replicas affect reads, and what would justify sharding.

[System Design guide](../readme.md) · [Backend learning guide](../../readme.md)
