# Data Lake vs Data Warehouse

[← Back to index](../readme.md)

## Simple difference

- A **data lake** stores large amounts of raw data.
- A **data warehouse** stores cleaned, organized data for reporting.

| | Data lake | Data warehouse |
|---|---|---|
| Data | Raw or partly processed | Clean and structured |
| Main users | Data engineers and data scientists | Analysts and business teams |
| Common work | Machine learning and exploration | Reports and dashboards |
| Cost | Usually cheaper storage | Usually more expensive |
| Schema | Applied when data is read | Applied before data is stored |

## Data lake

A data lake can store tables, logs, images, videos, and other files.

```text
Applications + Logs + Devices
             ↓
         Data Lake
             ↓
    Processing or machine learning
```

Examples include Amazon S3, Azure Data Lake Storage, and Google Cloud Storage.

### Benefits

- Stores almost any type of data
- Handles very large volumes
- Keeps raw data for future uses

### Risks

- Poor organization can turn it into a “data swamp”
- Raw data is harder to query
- Governance and security need careful planning

## Data warehouse

A warehouse contains prepared data that is easy to query.

```text
Source systems → Clean and transform → Warehouse → Dashboard
```

Examples include Snowflake, Amazon Redshift, BigQuery, and Azure Synapse.

### Benefits

- Fast analytical queries
- Consistent business data
- Easy reporting and dashboards

### Costs

- Data must be cleaned first
- Less suitable for unstructured data
- Processing and storage can cost more

## Which should you choose?

Choose a **data lake** when you need raw data, exploration, or machine learning.

Choose a **data warehouse** when you need trusted reports, dashboards, and SQL analytics.

Many companies use both:

```text
Raw data → Data lake → Transform → Data warehouse → Reports
```

A **lakehouse** combines parts of both approaches: low-cost lake storage with warehouse-style tables and queries.

## Interview summary

A lake provides flexible storage for raw data. A warehouse provides clean, structured data for analytics. The choice depends on who uses the data and how prepared it needs to be.

## Related topics

- [Object Storage Architecture](object-storage-architecture.md)
- [Real-Time System Design](real-time-system-design.md)
