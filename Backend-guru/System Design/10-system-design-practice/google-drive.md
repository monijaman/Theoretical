# Design Google Drive
[← Back to index](../readme.md)

## 1. Requirements

**Functional**
- Upload/store files and folders; support large files via chunked upload.
- Deduplicate identical content across users/uploads via content hashing.
- File versioning: keep prior versions, allow restore.
- Share files/folders with specific users or via link, with granular permissions (viewer/commenter/editor).
- Real-time collaborative editing of documents by multiple simultaneous users (the defining feature versus a plain file-sync tool).
- Sync client that reconciles local and server state, handling conflicts sanely.

**Non-functional**
- Collaborative edits must converge to the same document state for all participants without an explicit merge step by the user — this is the hardest requirement in the system.
- Sharing/permission checks must be enforced on every access, including nested folder inheritance, without being a bottleneck on every read.
- Storage efficiency matters at scale — deduplication of identical content (common: shared templates, forwarded attachments) meaningfully reduces total stored bytes.
- Availability strongly preferred over strict consistency for file metadata browsing; strong consistency required for the "who can access this" permission check specifically.
- Versioning storage growth must be bounded (can't keep every keystroke forever at full cost).

**Assumptions**
- 1B users, 2B files/folders, average file 2 MB, documents (Docs/Sheets-style) a meaningful minority actively co-edited.
- Average collaborative document session: 3-5 concurrent editors, occasionally up to dozens.
- Sharing graph is large but each individual file's ACL is small (a handful to low hundreds of grantees, rarely more).

## 2. Capacity Estimation

**Storage**
- 2B files × 2 MB avg ≈ **4 PB** raw for a single copy of current content — before versioning and before deduplication savings.
- Content-hash dedup: assume ~15-20% of uploaded bytes are exact duplicates of already-stored content (shared templates, forwarded attachments, common images) — dedup saves roughly **600 GB - 800 GB per PB**, i.e. hundreds of TB overall, a material and basically-free storage win from a single content-hash lookup at upload time (§6.1).
- Versioning: assume average 5 retained versions per file, but most versions are small deltas rather than full copies (see [dropbox.md](dropbox.md) for block-level delta mechanics, which apply here too) — practically, version storage adds roughly 20-30% on top of current-content storage rather than a full 5x multiplier, because only changed blocks are stored per version.

**Traffic**
- Assume 200M DAU, average 10 file operations/day (opens, edits, shares) → 2B ops/day ÷ 86,400 ≈ **~23,000 ops/sec** average, peak (business hours concentration) 4-5x → ~100,000/sec.
- Collaborative editing traffic is a distinct, much higher-frequency stream: an active co-editing session generates an edit event roughly every keystroke/small-batch (assume batched every ~200-500ms per active editor) — at, say, 2M concurrent active collaborative sessions × 3 avg editors × 1 event/300ms ≈ **~20,000 edit-events/sec** sustained just for real-time collaboration, separate from and additive to general file-op traffic.

**Permission check load**
- Every file access requires a permission check, often needing to walk folder ancestry for inherited permissions. At ~100,000 ops/sec peak, a naive per-request DB walk up a folder tree would multiply read load by tree depth (avg. maybe 3-4 levels) — this is why permission resolution must be cached/denormalized (§6.3), not computed fresh on every access.

## 3. High-Level Architecture

```
   ┌──────────┐
   │  Client   │ (web/desktop/mobile)
   └────┬─────┘
        │ chunked upload / API calls
  ┌─────▼───────────┐
  │  File Service     │──▶ Metadata DB (file tree, ACLs, version pointers)
  └─────┬───────────┘
        │ content hash lookup
  ┌─────▼───────────┐        ┌────────────────┐
  │ Dedup/Block Store  │───────▶│ Object Storage   │  (actual bytes, content-addressed)
  │ (hash → block map)  │        │ (blocks/chunks)  │
  └────────────────┘        └────────────────┘

  ┌──────────────────────────────────────────┐
  │        Real-Time Collaboration Layer         │
  │  ┌────────────┐   ┌────────────┐            │
  │  │ Editor client│◀─▶│ Editor client│  (WebSocket, per-doc session)
  │  └──────┬─────┘   └──────┬─────┘            │
  │         └───────┬─────────┘                   │
  │           ┌──────▼──────┐                     │
  │           │ Collab Server │  OT/CRDT engine,     │
  │           │ (per-doc)      │  operation log        │
  │           └──────┬──────┘                     │
  └──────────────────┼──────────────────────────┘
                      │ periodic snapshot
              ┌───────▼────────┐
              │ Document Store   │  (durable snapshots + operation log)
              └────────────────┘
```

**Walkthrough**
1. On upload, the client (or server, for browser uploads) computes a content hash per chunk/block; the File Service checks the Dedup/Block Store — if a block with this hash already exists anywhere in the system, it's referenced rather than re-stored, and only genuinely new blocks are written to Object Storage.
2. Metadata (file name, folder location, owner, ACL, pointer to current version's block list) is written to the Metadata DB — this is a small, structured record kept separate from the bulk bytes.
3. Sharing a file/folder updates its ACL entry; permission resolution for nested folders is denormalized/cached (§6.3) so a read doesn't need to walk the folder tree live on every access.
4. Opening a collaborative document (Docs/Sheets-style) establishes a WebSocket session to a Collab Server responsible for that document; concurrent editors' operations are transformed/merged (OT or CRDT, §6.2) so every client converges to the same final document state without manual merge conflicts.
5. The Collab Server periodically snapshots the current document state (plus the operation log since the last snapshot) to the Document Store, so a crash or reload doesn't require replaying the document's entire edit history from the beginning.
6. Desktop/mobile sync clients periodically reconcile local file state against server metadata, pulling changed blocks and pushing local edits — conflicts when the same file was edited offline on two devices are handled per the general conflict-resolution approach detailed in [dropbox.md](dropbox.md#63-conflict-handling-for-offline-concurrent-edits), since the underlying sync-engine problem is the same regardless of which product surface triggers it.

## 4. API Design

```
POST /api/v1/files/upload/init
Request: { "name": "report.pdf", "parent_folder_id": "f_10", "size_bytes": 5242880 }
Response: 201 { "upload_id": "u_772", "chunk_size": 1048576 }

PUT /api/v1/files/upload/{upload_id}/chunks/{index}
Body: <binary>, Header: X-Content-Hash: sha256:...
Response: 200 { "deduped": false, "stored": true }

POST /api/v1/files/upload/{upload_id}/complete
Response: 200 { "file_id": "file_9931", "version": 1 }

POST /api/v1/files/{id}/share
Request:
{
  "grantee": { "type": "user", "id": "u_204" },
  "role": "editor",                  // viewer | commenter | editor
  "notify": true
}
Response: 200 { "shared": true }

GET /api/v1/files/{id}/versions
Response: 200
{ "versions": [ { "version": 3, "created_at": "...", "size_bytes": 5300000 }, { "version": 2, "..."} ] }

POST /api/v1/files/{id}/restore
Request: { "version": 2 }
Response: 200 { "restored_to_version": 2, "new_version": 4 }

WS /collab/{document_id}
  client → server: { "type": "op", "op": {...}, "base_version": 128 }
  server → client: { "type": "op_applied", "op": {...}, "version": 129, "author": "u_204" }
```

## 5. Data Model & Storage Choice

```
files (metadata — relational-shaped: tree structure, ownership, ACLs)
  file_id          PK
  parent_folder_id  indexed (tree structure)
  name, owner_id
  current_version
  content_hash_root  (points to block manifest for current version)

acl_entries
  file_id, grantee_id   composite key
  role                  (viewer|commenter|editor|owner)
  inherited_from         (nullable — folder_id if inherited, null if explicit)

versions
  file_id, version_number   composite key
  block_manifest             (ordered list of block hashes composing this version)
  created_at, author_id

blocks (content-addressed, globally deduped)
  content_hash    PK
  storage_location
  ref_count        (for garbage collection when no version references it anymore)

document_ops (collaborative documents only — operation log)
  document_id, sequence_number   composite key
  operation, author_id, applied_at
```

`files`, `acl_entries`, and folder structure are genuinely relational — parent/child tree traversal, permission inheritance, and ownership are naturally expressed with foreign keys and indexed lookups, so a relational database (or a document store modeling the same relationships) is the right fit here per [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md); this is *not* a workload that primarily needs NoSQL's horizontal write scale, since metadata write volume is modest relative to the platform's read/collaboration traffic.

`blocks` (content-addressed storage) is the one place a key-value model is unambiguously correct: lookups are always by hash, values are immutable once written (a hash never changes what it points to), and `ref_count` enables safe garbage collection — this maps directly onto object storage with a thin key-value index in front, not a relational table.

`document_ops` is an append-only log with a strictly ordered sequence per document — a wide-column/log-oriented store (or even a well-partitioned relational table, since volume per document is bounded) works, with periodic snapshotting (§3 step 5) preventing the log from growing unbounded for long-lived documents.

## 6. Deep Dive

### 6.1 Chunked upload and content-hash deduplication

Files are split into content-defined or fixed-size chunks; each chunk's hash (SHA-256, typically) is computed client-side before upload. The client can ask the server "do you already have blocks with these hashes?" *before* uploading the bytes — for any hash the server confirms it already has (from any user, since block storage is global and content-addressed, not per-user), the client skips uploading that chunk entirely and the server just adds a manifest reference. This is what produces the storage savings estimated in §2, and importantly it also speeds up upload of duplicate content dramatically (near-instant "upload" of a file that's already fully present elsewhere in the system). Care is needed around a hash-collision-as-security-issue edge case: a strong hash (SHA-256) makes accidental collision statistically negligible, but a production system typically still verifies via a secondary check before treating two different uploads as identical content, to close off any adversarial crafted-collision concern.

### 6.2 Real-time collaborative editing (OT/CRDTs, conceptual)

Multiple users editing the same document concurrently need every client's view to converge to an identical final state, without users manually resolving merge conflicts the way a version-control system would ask them to. Two established families of algorithms solve this:

- **Operational Transformation (OT)**: each edit is expressed as an operation (e.g. "insert 'x' at position 5"); when two operations happen concurrently against the same base version, the server transforms one against the other so both can be applied in either order and still produce the same result (e.g. if operation B was based on a document state that operation A has since changed, B's position offsets are adjusted before applying). This requires a central server to serialize and transform operations against a canonical version history — naturally fitting the per-document Collab Server in §3.
- **CRDTs (Conflict-free Replicated Data Types)**: data structures designed so that any two replicas, having applied the same set of operations in *any* order, converge to the same state automatically, without a central transform step — better suited to peer-to-peer or offline-first collaboration, at the cost of somewhat higher per-operation metadata overhead (e.g. unique ids per character/element in some text CRDT designs) than OT's simpler operation stream.

For a centrally-served product like Drive (a server is already in the loop for every session), OT is the more common historical choice (as used by Google Docs) because the server naturally serves as the single source of truth for transformation order; CRDTs shine more where true offline/peer-to-peer editing without a central authority is a hard requirement. Either way, the architectural consequence is the same: a stateful, per-document coordination point (the Collab Server) is unavoidable — this is fundamentally different from the mostly-stateless request/response services elsewhere in this design, and is why it's drawn as its own subsystem in §3 rather than folded into the general File Service.

### 6.3 Sharing/ACL model and permission inheritance

A file's effective permissions come from two sources: explicit grants on the file itself, and inherited grants from ancestor folders. Walking the folder tree on every single access check would be far too slow at the read volumes in §2, so permissions are **denormalized at write time**: when a folder's sharing changes, a background job propagates/materializes the effective grant down to descendant files' `acl_entries` (marked `inherited_from`), so a read-time permission check is always a single lookup (`does this grantee have an entry for this file_id`), never a live tree walk. The trade is that a folder-sharing change isn't instantaneously reflected on every deeply-nested descendant — a brief propagation delay (typically sub-second to a few seconds even for large trees, via an async fan-out job) — an acceptable eventual-consistency window for a permission *addition*, though permission *revocation* often warrants a stronger, faster-propagating path or an explicit "invalidate all sessions for this file" signal, since access that should have been revoked lingering even briefly is a more serious problem than a grant appearing a moment late.

## 7. Bottlenecks & Scaling

- **10x concurrent collaborative sessions**: Collab Servers shard by document_id, so scaling is mostly horizontal — the harder problem is a single *very* heavily co-edited document (dozens+ concurrent editors), which increases operation-transform volume per document; batching/coalescing rapid small operations before broadcast helps bound this.
- **Dedup lookup becomes a bottleneck itself at extreme upload volume**: the hash→block index must be a fast, horizontally-sharded key-value store (sharded by hash prefix) rather than a single table, or the dedup check itself becomes slower than just uploading the redundant bytes would have been.
- **Permission propagation lag for very large shared folders (e.g. an org-wide folder with millions of descendant files)**: the async fan-out job (§6.3) can take a while to fully propagate; prioritize propagating to files actually being accessed (lazy/on-demand resolution with a cache, falling back to a live tree walk only on a cache miss) rather than requiring the entire fan-out to complete before any access reflects the change.
- **Version storage growth**: bound retained version history (e.g. keep all versions for 30 days, then thin to daily/weekly snapshots) rather than retaining every version indefinitely at full granularity.
- **Cross-region collaboration latency**: route a document's Collab Server session to the region closest to the majority of its active editors, and accept that a minority of far-region editors see slightly higher operation-round-trip latency — moving the whole session per edit isn't practical, so this is a "optimize for the common case" trade.

## 8. Trade-offs & Alternatives

- **OT vs CRDT for collaborative editing**: OT chosen (conceptually) for its natural fit with an already-central server and simpler per-operation overhead; CRDTs would be the better choice if true offline peer-to-peer editing (no server in the loop at all) were a hard requirement, which it isn't for a primarily-online product like Drive.
- **Global content-addressed dedup vs per-user storage**: cross-user dedup yields real storage savings but means block storage's `ref_count` and garbage-collection logic must be bulletproof (a bug that decrements a ref_count incorrectly could delete a block another user still needs) — more operational risk in exchange for meaningfully lower storage cost at this scale.
- **Denormalized/cached permission inheritance vs live tree-walk-per-check**: massively faster reads, at the cost of a genuine (if usually brief) eventual-consistency window on permission changes — mitigated with faster-path revocation but not eliminated entirely.
- **Relational metadata store vs NoSQL for the file tree**: chose relational for natural tree/ACL modeling and because metadata write volume doesn't demand NoSQL's horizontal write scaling — the bytes themselves (object storage) and the collaboration log are where different storage technologies earn their place instead.

## Related topics
- [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md)
- [Object Storage Architecture](../09-large-scale-data-systems/object-storage-architecture.md)
- [Database Sharding](../02-data-storage/database-sharding.md)
- [Caching Strategies](../04-caching/caching-strategies.md)
- [Cache Invalidation](../04-caching/cache-invalidation.md)
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
- [Event-Driven Architecture](../05-messaging-event-driven/event-driven-architecture.md)
- [WebSockets vs SSE vs Long Polling](../06-communication-protocols/websockets-vs-sse-vs-long-polling.md)
- [Distributed File Systems](../09-large-scale-data-systems/distributed-file-systems.md)
- [Dropbox](dropbox.md)
