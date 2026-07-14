# Object Storage Architecture
[← Back to index](../readme.md)

## Why this matters in an interview

Almost every large-scale design eventually needs to store blobs — images, videos, backups, logs, ML model artifacts, data lake files — at a scale where a filesystem on a single box or a database `BLOB` column falls apart. Object storage (S3, GCS, Azure Blob) is the default answer, and interviewers use it to check whether you understand *why* it scales where block/file storage doesn't, how it achieves "11 nines" of durability without being prohibitively expensive, and whether you know the practical primitives (multipart upload, presigned URLs) that let clients talk to it directly instead of routing gigabytes of file traffic through your application servers.

## Object vs. block vs. file storage

These are three different storage abstractions, and confusing them is a common interview stumble.

```
Block storage                 File storage                  Object storage
┌─────────────┐              ┌─────────────┐               ┌─────────────┐
│ Raw blocks   │              │ /home/user/  │               │ bucket/     │
│ (LBA 0..N)   │              │   docs/a.txt │               │   key1      │
│ attached to  │              │   photos/    │               │   key2      │
│ ONE server   │              │     b.jpg    │               │   key3      │
│ via SAN/EBS  │              │ hierarchical │               │ flat        │
│              │              │ POSIX paths  │               │ namespace   │
└─────────────┘              └─────────────┘               └─────────────┘
  EBS, SAN LUNs                NFS, HDFS, EFS                S3, GCS, Azure Blob
  low-level, OS                folder hierarchy,             key → blob + metadata,
  formats a filesystem         POSIX semantics                accessed via HTTP API
  on top                       (rename, append,               (PUT/GET/DELETE),
                                partial writes)                whole-object replace only
```

- **Block storage** exposes raw addressable blocks to an OS, which formats a filesystem on top (e.g., AWS EBS attached to an EC2 instance). Fast, low-latency, but tied to a single attached machine at a time and not natively shareable across a fleet.
- **File storage** exposes a hierarchical namespace with POSIX-like semantics — you can open a file, seek, append, rename a directory (NFS, EFS, HDFS — see [Distributed File Systems](distributed-file-systems.md)).
- **Object storage** exposes a **flat namespace**: a bucket contains keys, each key maps to an immutable blob plus metadata, accessed over HTTP (`PUT /bucket/key`, `GET /bucket/key`). There's no real directory tree — the "folders" you see in the S3 console are just key names with `/` in them, rendered as if they were nested. You cannot append to or partially modify an object; you replace it wholesale.

This last point is the crux of why object storage scales so well: whole-object semantics with no partial in-place mutation make it trivial to shard, replicate, and cache without worrying about concurrent partial writes to the same file.

## S3-style architecture: flat namespace, erasure coding, "11 nines"

A bucket's namespace is just `key → object` — no directory inodes to maintain, no path-traversal locking. This lets requests be routed and load-balanced purely by hashing the key, spreading any given prefix across an enormous number of storage nodes with no central metadata bottleneck for path resolution (unlike HDFS's NameNode — see [Distributed File Systems](distributed-file-systems.md)).

```
PUT s3://my-bucket/images/user123/avatar.png
        │
        ▼
  Hash(key) determines partition/storage nodes
        │
        ▼
  Object split into erasure-coded shards, written
  across multiple disks / racks / (for S3, multiple AZs)

  Example: 6 data shards + 3 parity shards (Reed-Solomon-style)
  → any 3 of the 9 shards can be lost and the object is
    still fully reconstructable
```

Durability ("11 nines," i.e., 99.999999999% annual durability for S3 Standard) doesn't come from simple 3x replication alone — it comes from **erasure coding**: the object is split into data shards plus computed parity shards spread across independent failure domains (disks, racks, and for S3, separate Availability Zones). You can lose several shards and still reconstruct the object, at much better storage-efficiency than N-way full replication (e.g., 6+3 erasure coding gives similar or better durability than 3x replication at 1.5x overhead instead of 3x).

### Consistency history — S3's 2020 change is a real, citable example

For its first ~14 years, S3 was famously **eventually consistent** for overwrite PUTs and deletes (a GET immediately after an overwrite could return either the old or new version) and only strongly consistent for new-key PUTs in some regions. In **December 2020**, AWS made S3 **strongly read-after-write consistent** for all operations, in all regions, at no extra cost or performance penalty — achieved by re-architecting metadata handling rather than by relaxing any other guarantee. This is a genuinely good interview reference point: it shows a real system moving along the consistency spectrum in production at massive scale, and that "eventually consistent" is an engineering choice tied to a specific metadata design, not a law of physics for object stores in general.

## Multipart upload

Uploading a large file (video, backup archive, multi-GB dataset) as one HTTP PUT is fragile — one network blip and the whole transfer restarts. **Multipart upload** splits the object into independently-uploaded parts (typically 5 MB–5 GB each for S3) that the storage service reassembles server-side.

```
1. InitiateMultipartUpload  → returns uploadId
2. UploadPart(uploadId, partNumber=1, bytes) → returns ETag1   ┐
   UploadPart(uploadId, partNumber=2, bytes) → returns ETag2   ├─ parallel,
   UploadPart(uploadId, partNumber=3, bytes) → returns ETag3   ┘  independently retryable
3. CompleteMultipartUpload(uploadId, [ETag1, ETag2, ETag3])
     → S3 assembles the parts into one object atomically
```

Benefits: parts upload in parallel (higher aggregate throughput), a failed part retries alone instead of restarting the whole upload, and upload can begin before the full file is even finalized on the client side (useful for streaming uploads). This is the standard mechanism behind resumable upload UIs in Google Drive/Dropbox-style products.

## Presigned URLs: letting clients talk to storage directly

Routing every file upload/download through your application servers means your servers pay the bandwidth and connection-holding cost of every large file transfer — a needless bottleneck when the storage service can serve clients directly.

```
Without presigned URL:                  With presigned URL:

Client → App server → S3                Client → App server (asks for permission)
         (proxies bytes,                            │ App server returns a
          scales with                                │ presigned URL (time-limited,
          upload volume)                              │ signed with app's credentials)
                                                       ▼
                                          Client → S3 directly (PUT/GET)
                                          App server bandwidth: ~0
```

A **presigned URL** is a normal S3 URL with a signature and expiry embedded in the query string, generated by the application (which holds the real credentials) and handed to the client. The client can `PUT` or `GET` directly against that URL until it expires, without ever holding real AWS credentials and without the app server touching the file bytes at all. This is the standard pattern for "upload your profile photo" or "download your generated report" flows at scale.

## Object storage as the data lake backing store

Object storage's flat namespace, cheap per-GB cost, and effectively unlimited capacity are exactly why it became the default storage layer under data lakes and lakehouses: raw files land as objects (often Parquet/ORC), a catalog (Glue/Hive Metastore) maps logical tables to key prefixes, and compute engines (Athena, Spark, Trino) read objects directly over HTTP range requests rather than needing a POSIX filesystem mount. See [Data Lake vs Data Warehouse](data-lake-vs-data-warehouse.md) for the query-engine side of this.

## Trade-offs summary

| | Object Storage (S3/GCS) | Block Storage (EBS) | File Storage (NFS/HDFS) |
|---|---|---|---|
| Namespace | Flat (bucket + key) | Raw blocks, OS formats it | Hierarchical, POSIX paths |
| Mutation | Whole-object replace only | In-place byte-level writes | Append/partial writes, rename |
| Attach model | HTTP API, any client, any region | One server (or few) at a time | Shared mount across many clients |
| Scale | Effectively unlimited, per-object | Limited to attached volume size | Limited by NameNode/metadata server |
| Latency | Higher (HTTP overhead) | Lowest (near-local disk) | Medium |
| Typical use | Blobs, backups, data lake, static assets | Databases, VM root disks | Legacy shared filesystems, Hadoop/Spark |

## Common interview follow-ups

**Q: Why can't you just mount S3 as a filesystem and get file-storage semantics for free?**
S3 has no native support for partial in-place writes, atomic renames of a directory tree, or file locking — tools that "mount" S3 (like s3fs) emulate these by re-uploading whole objects or maintaining shadow metadata, which is slow and semantically leaky compared to a real POSIX filesystem; it's a compatibility shim, not equivalent architecture.

**Q: How does erasure coding differ from simple replication, and why does it matter at scale?**
Replication stores N full copies (e.g., 3x = 200% storage overhead to survive 2 failures); erasure coding splits data into k data shards + m parity shards where any k of the k+m shards reconstruct the object, achieving similar or better durability at roughly (m/k) overhead instead of (N-1)x — at hundreds of exabytes of data, that efficiency difference is the majority of the storage cost.

**Q: What are the risks of a presigned URL, and how do you mitigate them?**
Anyone holding the URL before it expires can use it, so you set short expiries (minutes, not days), scope the signature to a specific key and HTTP method, and for uploads, validate the resulting object server-side (size, content-type, virus scan) after the client reports completion since the app server never saw the bytes in transit.

**Q: Why did it take S3 until 2020 to become strongly consistent, and why wasn't it strongly consistent from the start?**
Early distributed object stores traded strict consistency for higher availability and lower latency across a globally distributed metadata layer — a classic AP-leaning choice; AWS's 2020 change came from re-engineering internal metadata indexing (not from relaxing partition tolerance or availability), showing that read-after-write consistency at that scale was an engineering problem that got solved over time, not an inherent limit of the object storage model.

**Q: When would you still choose block or file storage over object storage?**
Use block storage when you need low-latency, in-place random writes for a single attached server, such as a database's data files; use file storage when multiple processes need POSIX semantics like append-in-place, byte-range locks, or directory renames, such as legacy Hadoop/Spark jobs or shared home directories — object storage's whole-object-replace model is a poor fit for either.

**Q: How would you serve a very large file (multi-GB video) for download efficiently from object storage?**
Use HTTP range requests so clients (or a CDN in front of the bucket) can fetch and cache byte ranges independently, enabling seeking and parallel/resumable downloads, and put a CDN in front of the bucket so repeat reads are served from edge caches instead of hitting origin storage on every request.

## Related topics
- [Data Lake vs Data Warehouse](data-lake-vs-data-warehouse.md) — object storage is the typical backing store for the lake layer
- [Distributed File Systems](distributed-file-systems.md) — the file-storage alternative, and why HDFS differs architecturally from S3
- [CDN Architecture](../04-caching/cdn-architecture.md) — how object storage origins are fronted by edge caches for large-file delivery
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md) — the model that explains S3's pre-2020 vs post-2020 behavior
- [Google Drive Design](../10-system-design-practice/google-drive.md) — a full system built directly on object storage primitives (chunking, presigned-style uploads)
