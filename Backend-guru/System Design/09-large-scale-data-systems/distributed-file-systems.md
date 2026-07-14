# Distributed File Systems
[← Back to index](../readme.md)

## Why this matters in an interview

Before object storage ate the world, "how do you store more data than fits on one machine, with a hierarchy and file semantics multiple processes can share" was solved by distributed file systems — HDFS being the canonical example that powered the entire first generation of "big data" (Hadoop, early Spark). Interviewers ask about DFS architecture to check whether you understand the metadata-server-plus-data-nodes pattern (which reappears constantly — it's the same shape as a database's control plane/data plane split), where that pattern's single point of failure lives, and whether you can articulate why most new systems now reach for object storage instead — and where DFS is still the right tool.

## HDFS architecture: NameNode + DataNodes

HDFS (Hadoop Distributed File System) splits the concerns of **metadata** (what files exist, which blocks they're made of, where those blocks live) from **data** (the actual block bytes) across two node types.

```
                    ┌─────────────────────┐
                    │      NameNode        │
                    │  (metadata only)     │
                    │                       │
                    │ /user/alice/data.csv  │
                    │   → block1 (128MB)    │
                    │      replicas: DN1,   │
                    │               DN3,    │
                    │               DN5     │
                    │   → block2 (128MB)    │
                    │      replicas: DN2,   │
                    │               DN4,    │
                    │               DN6     │
                    └──────────┬────────────┘
                               │ metadata ops
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
        ┌──────────┐    ┌──────────┐      ┌──────────┐
        │ DataNode1 │    │ DataNode2 │ ... │ DataNodeN │
        │ block1    │    │ block1    │      │ block2    │
        │ (replica) │    │ (replica) │      │ (replica) │
        └──────────┘    └──────────┘      └──────────┘

  Client reads/writes block data directly to/from DataNodes,
  after asking the NameNode "which DataNodes hold this block?"
```

- **NameNode**: holds the entire filesystem namespace (directory tree, permissions, file-to-block mapping) **in memory** for speed, persisted via an edit log + periodic checkpoint (fsimage) to disk. Every file open, block lookup, and directory listing goes through it.
- **DataNodes**: store the actual 128MB (default) blocks on local disk, and only handle block read/write I/O and periodic heartbeats/block reports back to the NameNode — they hold no filesystem-tree knowledge themselves.
- A file is split into fixed-size blocks, and each block is replicated (default **replication factor 3**) across different DataNodes — and HDFS is rack-aware, deliberately placing replicas across different racks so a single rack failure (top-of-rack switch, power) doesn't lose all copies of a block.

### Why the NameNode was historically a single point of failure

In classic Hadoop 1.x, there was exactly one NameNode. If it crashed, the entire filesystem became unavailable — DataNodes still had the block bytes on disk, but nothing could resolve a path to a block list, so nothing was readable or writable until the NameNode restarted and rebuilt its in-memory state from the fsimage + edit log. This is a textbook "control plane down = everything down" failure mode, structurally identical to the etcd/ZooKeeper coordination-node problem discussed in [High Availability](../08-reliability-operations/high-availability.md).

**HDFS High Availability (HA) NameNode** fixed this (Hadoop 2.x+):

```
        Active NameNode  ──── shared edit log ────  Standby NameNode
        (serves all            (JournalNodes,          (replays edit log
         metadata ops)          quorum-based)            continuously, hot-standby)
              │                                                │
              ▼                                                ▼
        DataNodes send block reports to BOTH NameNodes
        (so Standby can take over instantly with full state)

        ZooKeeper (or similar) used for leader election /
        automatic failover detection
```

An active/standby pair shares an edit log via a quorum of JournalNodes (itself a small Paxos-like replicated log), and the standby continuously replays it so its in-memory state stays current. ZooKeeper handles failure detection and triggers automatic failover, promoting the standby with no manual intervention and (ideally) no data loss — the same active-passive failover pattern used broadly in [Disaster Recovery](../08-reliability-operations/disaster-recovery.md).

## Block size trade-offs

HDFS's default block size (128MB, historically 64MB) is enormous compared to a local filesystem's 4KB blocks, and that's deliberate:

- **Large blocks minimize metadata overhead**: the NameNode holds one metadata entry per block in memory; a 1TB file at 128MB blocks is ~8,000 block entries, but at 4KB blocks it would be ~250 million entries — the NameNode's RAM is the hard scaling ceiling for the whole cluster's total file count, so large blocks are what makes petabyte-scale namespaces fit in NameNode memory at all.
- **Large blocks amortize seek time**: HDFS is optimized for large sequential scans (a MapReduce/Spark job reading a whole file), where the cost of one disk seek is trivial relative to reading 128MB sequentially afterward. Small blocks would mean proportionally more seeks per byte read.
- **The cost**: small files are actively bad for HDFS — a million small files still cost a million NameNode metadata entries even though total data volume is tiny (the infamous "small files problem"), and each occupies a full block slot with wasted DataNode space if under the block size. Systems ingesting many small files (e.g., IoT events) typically batch/compact them into larger files before landing in HDFS.

## How this differs from object storage

```
HDFS / DFS                                  Object storage (S3)
───────────────────────────                 ───────────────────────────
Hierarchical namespace                       Flat namespace (bucket + key)
(directories, POSIX-like paths)              ("folders" are cosmetic key prefixes)

Append supported                             No append — whole-object replace only
(write once, append-friendly)

Central metadata server (NameNode)           No central metadata server —
= scaling ceiling + failure domain           key hashing routes requests,
                                              scales near-linearly

Client talks to metadata server first,       Client talks directly to storage
then directly to data nodes for bytes        nodes via HTTP, metadata resolved
                                              per-request via hashing

Designed for: colocated compute              Designed for: durable, cheap,
(MapReduce/Spark run ON the DataNodes         infinitely scalable storage,
 for data locality)                           accessed by decoupled compute
```

The deepest architectural difference is **data locality**: HDFS was built so compute (MapReduce, Spark) runs *on the same physical nodes* as the data blocks, minimizing network transfer for large scans. Object storage assumes compute and storage are **decoupled** — Athena/Spark/Trino read S3 over the network as a matter of course, trading data-locality speed for elastic, independent scaling of storage and compute (see [Data Lake vs Data Warehouse](data-lake-vs-data-warehouse.md)).

## Where DFS is still used vs. where object storage replaced it

- **Still HDFS/DFS territory**: on-prem Hadoop/Spark clusters where hardware is owned rather than rented and colocating compute with storage genuinely reduces network cost; legacy data pipelines built years ago on the Hadoop ecosystem that haven't been migrated; some HPC environments needing POSIX append semantics.
- **Replaced by object storage**: cloud-native data lakes (S3 + Athena/Spark-on-EMR, GCS + BigQuery/Dataproc) where elastic, pay-per-use compute that can be spun up and torn down independently of storage is more valuable than data locality — the cloud's cheap, fast internal networking largely erased HDFS's locality advantage, and object storage's operational simplicity (no NameNode to keep highly available, near-infinite scale, no small-files-in-memory ceiling) won out for new builds.
- Cloud Hadoop distributions (EMR, Dataproc, HDInsight) increasingly run Spark/Hive directly against S3/GCS instead of HDFS, using HDFS only as ephemeral local scratch storage for a running job.

## Trade-offs summary

| | HDFS / Distributed File System | Object Storage (S3-style) |
|---|---|---|
| Namespace | Hierarchical, POSIX-like | Flat, key-based |
| Write semantics | Write-once, append supported | Whole-object replace only |
| Metadata | Central NameNode (RAM-bound scaling ceiling) | Distributed, hashed — no central bottleneck |
| Failure mode | NameNode down = cluster down (mitigated by HA pair) | No single metadata SPOF |
| Best fit | On-prem Hadoop/Spark, data-locality-sensitive jobs | Cloud-native lakes, decoupled compute/storage |
| Small-file handling | Poor (NameNode memory pressure) | Fine (flat, no shared metadata tree) |

## Common interview follow-ups

**Q: Why does the NameNode need so much memory, and what happens as the cluster grows?**
The NameNode keeps the entire namespace (every file, directory, and block-location mapping) in RAM for fast metadata operations, so total memory bounds total file+block count cluster-wide, regardless of how many DataNodes you add for raw storage capacity — this is why the "small files problem" is a memory scaling issue, not a disk one, and why very large HDFS deployments obsess over keeping file counts down (e.g., using Hadoop Archives or compaction jobs).

**Q: How does HDFS decide where to place block replicas?**
It's rack-aware: by default it places one replica on the writer's local node (or a random node if off-cluster), a second replica on a different rack, and a third replica on a different node in that second rack — this balances write bandwidth (fewer cross-rack hops needed) against fault tolerance (surviving a full rack/switch failure).

**Q: If HDFS HA solves the NameNode SPOF, why do people still say object storage is simpler operationally?**
HA NameNode requires running and monitoring an active/standby pair, a JournalNode quorum, and a failover controller (ZooKeeper) — real infrastructure you have to operate correctly; S3-style object storage's decentralized metadata design means there's no equivalent component to keep highly available at all, since no single node resolves the whole namespace, which is a meaningfully smaller operational surface.

**Q: How would you migrate an existing HDFS-based Hadoop pipeline to run against S3 instead?**
Point Spark/Hive at `s3a://` paths instead of `hdfs://` paths (most engines abstract the filesystem behind a URI scheme), validate that job performance holds up despite losing data locality (often masked by fast cloud networking), and keep HDFS as fast ephemeral scratch space for intermediate shuffle data within a job even after the source/sink data lives in S3.

**Q: Why is block size so much larger in HDFS than a typical local filesystem?**
HDFS is optimized for large sequential reads/writes by big batch jobs rather than small random I/O, so large blocks (128MB) both reduce the number of metadata entries the NameNode must track per file and amortize the fixed cost of a disk seek over far more sequentially-read bytes — the trade-off is that small files waste block space and namespace memory disproportionately.

**Q: What's the practical difference in how a client reads a file in HDFS vs. S3?**
In HDFS, the client asks the NameNode for the block locations of a file, then opens direct connections to the relevant DataNodes to stream block bytes; in S3, the client sends a single HTTP GET for a key directly to the storage service, and there's no separate "ask for locations first" round trip because routing is handled by consistent hashing internally, invisible to the client.

## Related topics
- [Object Storage Architecture](object-storage-architecture.md) — the flat, decoupled alternative that replaced HDFS in most new cloud designs
- [Data Lake vs Data Warehouse](data-lake-vs-data-warehouse.md) — HDFS and S3 as alternative storage layers under the same lake architecture
- [High Availability](../08-reliability-operations/high-availability.md) — the active/standby failover pattern behind HA NameNode
- [Disaster Recovery](../08-reliability-operations/disaster-recovery.md) — recovery planning for control-plane components like the NameNode
- [Database Sharding](../02-data-storage/database-sharding.md) — the same central-metadata-server scaling ceiling appears in sharded databases' config servers
