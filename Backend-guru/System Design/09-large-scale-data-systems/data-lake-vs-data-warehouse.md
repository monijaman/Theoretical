# Data Lake vs Data Warehouse
[← Back to index](../readme.md)

## Why this matters in an interview

Any system that touches analytics, reporting, ML feature pipelines, or "give the BI team access to production data" eventually runs into this fork: do you dump raw data somewhere cheap and figure out structure later (data lake), or do you pay the cost up front to model, clean, and load it into a queryable engine (data warehouse)? Interviewers use this topic to see whether you understand the difference between storage-optimized and query-optimized systems, and whether you can reason about cost, latency, and governance trade-offs rather than reaching for a buzzword ("lakehouse") without understanding what problem it solves.

## Core distinction

| | Data Lake | Data Warehouse |
|---|---|---|
| Schema | Schema-on-read | Schema-on-write |
| Data shape | Raw, semi-structured, unstructured (JSON, logs, images, Parquet, CSV) | Structured, modeled (star/snowflake schema) |
| Load pattern | ELT (Extract, Load, Transform) | ETL (Extract, Transform, Load) |
| Cost model | Cheap storage (object storage), pay for compute per query | Storage + compute often bundled, historically pricier |
| Primary users | Data engineers, data scientists, ML pipelines | Analysts, BI tools, dashboards |
| Query performance | Variable — depends on file layout, partitioning | Consistently fast — engine optimized for SQL analytics |
| Governance | Weak by default (easy to create a "data swamp") | Strong — enforced schema, constraints, catalogs |

### Schema-on-read vs schema-on-write

**Schema-on-write** (warehouse): you define a table schema (columns, types, constraints) before loading. The ETL job transforms and validates data to conform to that schema before it lands. Query time is fast and predictable because the engine already knows the layout and can use columnar storage, statistics, and indexes tuned to it.

**Schema-on-read** (lake): you dump raw files (JSON, Avro, Parquet, plain text) into storage with no upfront schema enforcement. The schema is applied when a query engine reads the data — e.g., a Hive/Glue catalog maps files to a logical table at query time. This defers cost and decisions but pushes the burden onto every consumer to agree on how to interpret the data.

```
ETL (warehouse):        Extract → Transform → Load → Query
                                   (schema enforced here)

ELT (lake):              Extract → Load → Transform → Query
                                          (schema enforced per-query,
                                           or in a later curation step)
```

## How it works mechanically

### Data lake

```
   Sources                Storage (flat, cheap)         Query / Compute
 ┌──────────┐        ┌─────────────────────────┐      ┌──────────────────┐
 │ App logs │──────▶ │   S3 / GCS / ADLS       │◀────▶│ Athena / Presto  │
 │ CDC       │──────▶ │  (raw/, bronze/,        │      │ Trino / Spark    │
 │ IoT       │──────▶ │   curated/, gold/)      │      │ EMR / Databricks │
 │ 3rd-party │──────▶ │  Parquet/ORC + catalog  │      └──────────────────┘
 └──────────┘        └─────────────────────────┘
                              ▲
                       Glue Data Catalog / Hive
                       Metastore (schema mapping)
```

- Data lands in object storage in its original or lightly-converted form (often converted to Parquet/ORC for columnar efficiency).
- A metadata catalog (AWS Glue, Hive Metastore) tracks table definitions, partitions, and file locations without moving the data.
- Query engines (Athena, Presto/Trino, Spark SQL) read directly from object storage, applying schema at query time.
- Common "medallion" layering: bronze (raw) → silver (cleaned/deduped) → gold (aggregated, business-ready).

### Data warehouse

```
   Sources          ETL/ELT pipeline           Warehouse (MPP engine)
 ┌──────────┐    ┌───────────────────┐     ┌───────────────────────┐
 │ OLTP DBs │───▶│ Fivetran/Airflow/ │────▶│ Snowflake / Redshift / │──▶ BI tools
 │ SaaS APIs│───▶│ dbt (transform)   │     │ BigQuery               │   (Looker,
 └──────────┘    └───────────────────┘     └───────────────────────┘    Tableau)
```

- Massively parallel processing (MPP) engines store data column-oriented, pre-aggregated, and partitioned for fast SQL scans.
- Strong schema enforcement, constraints, and often a dimensional model (fact/dimension tables).
- Compute and storage are billed separately in modern cloud warehouses (Snowflake, BigQuery), letting you scale query concurrency independently of data volume.

## Real-world examples

- **AWS S3 + Glue + Athena**: classic lake stack. S3 is the storage layer, Glue Crawler infers schema and populates the Data Catalog, Athena runs serverless SQL (Presto engine) directly against S3 objects. Pay per query (per TB scanned) — no cluster to manage.
- **Snowflake**: warehouse-as-a-service. Separates storage (its own compressed columnar format) from compute (virtual warehouses you can resize independently). Supports semi-structured data (VARIANT columns for JSON) which blurs the line toward lakehouse.
- **Amazon Redshift**: classic MPP warehouse, node-based clusters, columnar storage, `COPY` command for bulk ETL loads; Redshift Spectrum lets it query data sitting in S3 directly (lake-warehouse bridge).
- **Databricks + Delta Lake**: the canonical "lakehouse" — adds a transaction log (ACID) on top of Parquet files in object storage, giving lake economics with warehouse-like reliability (schema enforcement, time travel, `MERGE` statements).
- **Google BigQuery**: warehouse with lake-like flexibility — separates storage/compute, can query external tables directly in GCS.

## Lakehouse convergence

The "lakehouse" pattern (Delta Lake, Apache Iceberg, Apache Hudi) emerged to close the gap:

- Adds a **transaction log** (metadata layer) over plain files in object storage, giving ACID guarantees, schema enforcement/evolution, and time travel — things only warehouses used to offer.
- Keeps the **cheap, open, decoupled storage** of a lake (plain Parquet files anyone can read, no vendor lock-in).
- Enables both BI-style SQL queries and ML/Spark workloads against the *same* copy of data, avoiding the classic "lake for data science, warehouse for BI" duplication.

```
Iceberg/Delta table = Parquet files (data) + transaction log (metadata)
                       ─────────────────────────────────────────────
                       snapshot 1 → snapshot 2 → snapshot 3 (time travel)
```

## Trade-offs

- **Use a lake when**: data is highly varied/unstructured, volume is huge and cost-sensitive, consumers include ML/data science who want raw access, or you don't yet know all future query patterns.
- **Use a warehouse when**: you need consistent low-latency SQL for dashboards, strong governance/schema contracts, and your primary consumers are analysts running repeatable BI queries.
- **Lake downsides**: easy to become a "data swamp" (no governance, duplicate/undocumented datasets); query performance depends heavily on file format and partitioning discipline; without a lakehouse layer, no ACID transactions (concurrent writers can corrupt reads).
- **Warehouse downsides**: schema rigidity slows ingestion of novel data; historically higher storage cost per TB; scaling raw ingestion of unstructured data (images, logs) is awkward.
- **Lakehouse downsides**: added architectural complexity (managing table format versions, compaction jobs); still maturing tooling compared to decades-old warehouse ecosystems; performance for pure BI workloads can lag a purpose-built warehouse for very high-concurrency dashboards.

## Illustrative snippet — Athena querying a lake table

```sql
-- Table defined once in Glue Catalog, backed by Parquet files in S3
CREATE EXTERNAL TABLE orders (
  order_id string,
  user_id string,
  amount double,
  created_at timestamp
)
PARTITIONED BY (dt string)
STORED AS PARQUET
LOCATION 's3://data-lake/gold/orders/';

-- Schema-on-read: Athena applies this schema only at query time
SELECT dt, SUM(amount) FROM orders WHERE dt = '2026-07-01' GROUP BY dt;
```

## Common interview follow-ups

**Q: How do you prevent a data lake from becoming a "data swamp"?**
Enforce a layered structure (bronze/silver/gold), maintain a data catalog with ownership and documentation, apply schema validation at the silver layer even though raw ingestion is schema-less, and set retention/lifecycle policies so stale raw data gets archived or deleted.

**Q: Why would you pick Delta Lake/Iceberg over just querying raw Parquet files with Athena?**
Raw Parquet in S3 has no transaction guarantees — concurrent writers can leave partial files, and there's no way to atomically swap a set of files or roll back a bad write. A table format adds a metadata/transaction log giving atomic commits, schema evolution, and time travel, at the cost of extra tooling to manage compaction and log cleanup.

**Q: How does compute/storage separation in Snowflake/BigQuery change cost and scaling behavior versus Redshift's classic node model?**
In Redshift's older architecture, storage and compute live on the same nodes, so scaling for more storage means paying for more compute you may not need. Snowflake/BigQuery decouple them: you store data once and spin up independent, differently-sized compute clusters (or serverless slots) per workload, so a heavy nightly ETL job and lightweight dashboard queries don't contend for the same resources.

**Q: How would you migrate a system currently on a data warehouse to a lakehouse without downtime?**
Dual-write or CDC-replicate warehouse tables into Delta/Iceberg tables in parallel, validate query parity (row counts, aggregate checksums) against the warehouse, gradually cut over BI tools table-by-table, and keep the warehouse as a read fallback until confidence is high — this is the same phased-cutover pattern used in database migrations generally.

**Q: When would you deliberately choose ETL over ELT even with cheap lake storage available?**
When downstream consumers require strict, validated schemas immediately (e.g., regulated financial reporting) and you can't tolerate malformed or PII-laden raw data sitting even briefly in a shared lake — transforming/redacting before load reduces compliance and data-quality blast radius.

## Related topics

- [Database Sharding](../02-data-storage/database-sharding.md)
- [Database Partitioning](../02-data-storage/database-partitioning.md)
- [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md)
- [Object Storage Architecture](./object-storage-architecture.md)
- [Distributed File Systems](./distributed-file-systems.md)
- [Event Sourcing](../05-messaging-event-driven/event-sourcing.md)
- [CQRS Pattern](../05-messaging-event-driven/cqrs-pattern.md)
