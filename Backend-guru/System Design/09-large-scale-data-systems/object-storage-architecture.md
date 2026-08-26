# Object Storage Architecture

[← Back to index](../readme.md)

## Why this matters in an interview

Almost every large-scale design eventually needs to store blobs — images, videos, backups, logs, ML model artifacts, data lake files — at a scale where a filesystem on a single box or a database `BLOB` column falls apart. Object storage (S3, GCS, Azure Blob) is the default answer, and interviewers use it to check whether you understand *why* it scales where block/file storage doesn't, how it achieves "11 nines" of durability without being prohibitively expensive, and whether you know the practical primitives (multipart upload, presigned URLs) that let clients talk to it directly instead of routing gigabytes of file traffic through your application servers.

## Object vs. block vs. file storage

These are three different storage abstractions, and confusing them is a common interview stumble.

```text
Block storage                 File storage                  Object storage
┌─────────────┐              ┌─────────────┐               ┌─────────────┐
│ Raw blocks   │              │ /home/user/ │               │ bucket/     │
│ (LBA 0..N)   │              │   docs/a.txt│               │   key1      │
│ attached to  │              │   photos/   │               │   key2      │
│ ONE server   │              │     b.jpg   │               │   key3      │
│ via SAN/EBS  │              │ hierarchical│               │ flat        │
│              │              │ POSIX paths │               │ namespace   │
└─────────────┘              └─────────────┘               └─────────────┘
  EBS, SAN LUNs                NFS, HDFS, EFS                S3, GCS, Azure Blob
  low-level, OS                folder hierarchy,             key → blob + metadata,
  formats filesystem           POSIX semantics               accessed via HTTP API
  on top                       (rename, append,              (PUT/GET/DELETE),
                               partial writes)               whole-object replace only
```

- **Block storage** exposes raw addressable blocks to an OS, which formats a filesystem on top (e.g., AWS EBS attached to an EC2 instance). Fast, low-latency, but tied to a single attached machine at a time and not natively shareable across a fleet.
- **File storage** exposes a hierarchical namespace with POSIX-like semantics — you can open a file, seek, append, rename a directory (NFS, EFS, HDFS).
- **Object storage** exposes a **flat namespace**: a bucket contains keys, each key maps to an immutable blob plus metadata, accessed over HTTP (`PUT`, `GET`, `DELETE`). There is no real directory tree — folders are simply prefixes in object keys. Objects are replaced as a whole rather than modified in place.

Whole-object semantics are a major reason object storage scales so well: there are no partial-write coordination problems, making sharding, replication, and caching much simpler.

## S3-style architecture: flat namespace, erasure coding, "11 nines"

Instead of directory metadata, requests are routed by hashing the object key.

```text
PUT s3://my-bucket/images/user123/avatar.png
                │
                ▼
        Hash(key) selects partition
                │
                ▼
      Object split into erasure-coded shards
      distributed across disks, racks,
      and multiple Availability Zones

Example:
6 data shards + 3 parity shards

Lose any 3 shards
        │
        ▼
Object can still be reconstructed
```

Rather than storing three complete copies of every object, modern object stores typically rely heavily on **erasure coding**, which provides equivalent durability with much lower storage overhead.

For example:

- 3× replication → 300% storage usage
- 6+3 erasure coding → roughly 150% storage usage

while still surviving multiple simultaneous failures.

### S3 consistency evolution

Historically:

- New object PUTs were read-after-write consistent.
- Overwrites and deletes were eventually consistent.

In **December 2020**, Amazon S3 became **strongly read-after-write consistent** for all operations in every region.

This is a useful interview example because it demonstrates that eventual consistency is an implementation decision—not an unavoidable property of object storage.

## Multipart upload

Uploading multi-gigabyte files using one HTTP request is fragile.

Instead, object stores support multipart uploads.

```text
1. InitiateMultipartUpload
        │
        ▼
     uploadId

2.
UploadPart #1 ───────────► ETag1
UploadPart #2 ───────────► ETag2
UploadPart #3 ───────────► ETag3

(all uploads happen in parallel)

3.
CompleteMultipartUpload
(uploadId, ETags)

        │
        ▼
Object assembled atomically
```

Benefits:

- Parallel uploads
- Resume failed parts only
- Higher throughput
- Better reliability on unstable networks

## Presigned URLs

Large uploads should bypass your application servers.

```text
Without presigned URL

Client
   │
   ▼
Application Server
   │
   ▼
S3

Application server transfers every byte.


With presigned URL

Client
   │
   ▼
Application Server
(request upload permission)

   │
   ▼
Presigned URL

   │
   ▼
Client ─────────────► S3

Application server transfers almost zero bytes.
```

The application generates a temporary signed URL.

The client uploads or downloads directly from object storage without receiving permanent cloud credentials.

Advantages:

- Lower server bandwidth
- Better scalability
- Faster uploads
- Simpler horizontal scaling

## Object storage as the data lake foundation

Modern data lakes are built directly on object storage.

```text
Applications
        │
        ▼
Parquet / ORC files
        │
        ▼
S3 Bucket
        │
        ▼
Glue Catalog / Hive Metastore
        │
        ▼
Athena
Spark
Trino
Presto
```

Storage is separated from compute.

Multiple engines can read the same objects without copying data.

## Trade-offs summary

| | Object Storage | Block Storage | File Storage |
|---|---|---|---|
| Namespace | Flat bucket/key | Raw blocks | Hierarchical filesystem |
| Updates | Replace entire object | Random writes | Partial writes & append |
| Access | HTTP API | Attached disk | Shared filesystem |
| Scalability | Extremely high | Volume limited | Metadata limited |
| Latency | Higher | Lowest | Medium |
| Best use | Images, backups, data lakes | Databases, VM disks | Shared filesystems, Hadoop |

## Common interview follow-ups

**Q: Why can't S3 simply behave like a filesystem?**

Because S3 has no native support for:

- partial writes,
- file locking,
- atomic directory renames,
- POSIX semantics.

Filesystem adapters emulate these features by re-uploading objects or maintaining extra metadata, which is slower and not equivalent to a true filesystem.

---

**Q: Why is erasure coding preferred over replication?**

Replication stores complete copies.

Erasure coding stores parity information.

It achieves similar durability with dramatically lower storage overhead, making enormous storage systems far more cost-efficient.

---

**Q: What are the security risks of presigned URLs?**

Anyone possessing the URL before expiration can use it.

Mitigations include:

- short expiration times,
- limiting to one HTTP method,
- restricting to one object key,
- validating uploaded files afterward (size, MIME type, malware scan).

---

**Q: Why wasn't S3 strongly consistent from day one?**

Early distributed object stores optimized for availability and low-latency metadata operations, accepting eventual consistency for overwrites.

AWS later redesigned S3's metadata architecture to provide strong consistency without sacrificing performance.

---

**Q: When should block or file storage be used instead?**

Choose:

- **Block storage** for databases, VM disks, and workloads needing random low-latency writes.
- **File storage** when applications require POSIX semantics, shared mounts, append operations, or directory operations.
- **Object storage** for immutable blobs, backups, media, logs, archives, and data lakes.

---

**Q: How do you efficiently serve a multi-GB video?**

Use:

- HTTP Range Requests,
- multipart downloads,
- a CDN in front of the bucket,
- edge caching,

allowing users to seek within the video and resume downloads without fetching the entire object again.
## Related topics
- [Data Lake vs Data Warehouse](data-lake-vs-data-warehouse.md) — object storage is the typical backing store for the lake layer
- [Distributed File Systems](distributed-file-systems.md) — the file-storage alternative, and why HDFS differs architecturally from S3
- [CDN Architecture](../04-caching/cdn-architecture.md) — how object storage origins are fronted by edge caches for large-file delivery
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md) — the model that explains S3's pre-2020 vs post-2020 behavior
- [Google Drive Design](../10-system-design-practice/google-drive.md) — a full system built directly on object storage primitives (chunking, presigned-style uploads)
