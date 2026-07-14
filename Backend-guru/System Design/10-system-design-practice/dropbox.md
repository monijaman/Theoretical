# Design Dropbox
[← Back to index](../readme.md)

## 1. Requirements

**Functional**
- Sync a designated local folder to the cloud and to all of a user's other devices, automatically, without manual upload/download actions.
- Detect local file changes (create, edit, delete, rename, move) via filesystem watching, not polling the user's disk.
- Upload only the changed portions of a modified file (block-level delta sync), not the whole file again.
- Propagate changes to other devices promptly, and notify them a change happened even while idle.
- Handle the case where the same file was edited offline on two devices before either could sync.
- Maintain some version history for restore/rollback.

**Non-functional**
- Bandwidth efficiency is a first-order design goal — re-uploading a whole file for a one-line edit in a large document is unacceptable at this product's scale.
- Sync should feel "instant" for small edits and reasonably fast even for large files, without saturating a user's home internet connection.
- Correctness of the sync engine matters enormously: silently losing a local edit, or corrupting a file during sync, destroys user trust in the product's core promise.
- Devices are frequently offline (laptop closed, phone off Wi-Fi) — the system must reconcile cleanly whenever a device reconnects, with no special-casing required from the user.
- Note: this write-up is scoped specifically to file **sync**, not real-time collaborative document editing — that concern (operational transforms/CRDTs, live co-editing) is a distinct product surface covered in [google-drive.md](google-drive.md).

**Assumptions**
- 700M registered users, 1B+ linked devices, average user syncs ~10 GB across ~5,000 files.
- Average file size 2 MB; a meaningful fraction of storage is large files (videos, archives, design files) where whole-file re-upload on every edit would be especially wasteful.
- Average device is online and syncing roughly 12 hours/day; the rest of the time changes queue up for the next reconnect.

## 2. Capacity Estimation

**Storage**
- 700M users × 10 GB avg ≈ **7 EB (exabytes)** of logical user data before any deduplication or delta-storage savings — by far the largest number in this document, and the reason block-level storage (not whole-file storage) is not optional but structurally necessary.
- Block-level storage with content-addressing: assume typical files share blocks across versions (a small edit changes only a few 4MB blocks of a much larger file) and across users (common OS/app files, shared documents) — realistic production deduplication + delta savings bring effective stored bytes down by roughly 30-40% versus naive whole-file-per-version storage, i.e. saving on the order of **2+ EB**.

**Sync traffic**
- 1B devices, assume each generates on average 20 file-change events/day → 20B change-events/day ÷ 86,400 ≈ **~230,000 change-events/sec average** platform-wide, bursty around business hours across time zones.
- Delta-sync bandwidth: if only ~1% of an average 2 MB file's bytes change per edit (a typical small text/document edit) and block size is 4 MB (whole file is one block) down to more granular ~1 MB blocks for larger files, the *actual* bytes transferred per edit average roughly 50-200 KB rather than 2 MB — a **10-40x bandwidth reduction** versus whole-file re-upload, which is the single biggest efficiency win in the whole design (§6.1).

**Change-notification fan-out**
- A user with 3 linked devices needs each of their other 2 devices notified within a couple seconds of a change — 230,000 change-events/sec × ~2 other devices avg ≈ **~460,000 notification pushes/sec** platform-wide, handled over persistent connections (§6.4), not polling.

**Metadata volume**
- File metadata record (path, size, block-hash list, version, mtime) ≈ 500 bytes + block-hash-list overhead (a 2 MB file at 4 MB blocks ≈ 1 hash entry ≈ 32 bytes; large multi-GB files have proportionally more) ≈ average **~1 KB/file record**. 700M users × 5,000 files × 1 KB ≈ **~3.5 PB** of pure metadata — small relative to the 7 EB of actual content, underscoring why metadata and block storage are architected as two entirely separate services (§6.2) with very different scaling characteristics.

## 3. High-Level Architecture

```
   ┌──────────┐
   │  Desktop   │  local filesystem watcher (inotify/FSEvents/ReadDirectoryChangesW)
   │  Sync Client│
   └─────┬─────┘
         │ detects change → computes block hashes locally
   ┌─────▼───────────────┐
   │  Sync Protocol Client │  diffs local block hashes vs last-known-synced manifest
   └─────┬───────────────┘
         │ upload only new/changed blocks
   ┌─────▼─────────┐          ┌──────────────────┐
   │ Block Storage    │◀─────────│  Metadata Service   │──▶ Metadata DB
   │ Service           │  hash    │  (file tree, version,│   (path, version,
   │ (content-addressed)│  refs   │   block-hash manifest)│    block manifests)
   └─────┬─────────┘          └─────────┬──────────┘
         │                              │ publish "file changed" event
   ┌─────▼─────────┐            ┌───────▼────────┐
   │ Object Storage   │            │  Notification    │──▶ other linked devices
   │ (actual blocks)   │            │  Service (long-poll│   (push change events)
   └────────────────┘            │  / WebSocket)      │
                                  └────────────────┘
```

**Walkthrough**
1. The Sync Client watches the local sync folder via the OS's native file-change notification API (inotify on Linux, FSEvents on macOS, ReadDirectoryChangesW on Windows) — never polling the filesystem, which would be both slow to detect changes and wasteful of disk I/O.
2. On a detected change, the client splits the modified file into fixed or content-defined blocks and computes each block's hash, then diffs against the manifest of the last-known-synced version of that file (kept locally) to determine exactly which blocks actually changed.
3. Only the new/changed blocks are uploaded to the Block Storage Service; unchanged blocks are simply referenced by hash in the new manifest — this is the core of delta sync (§6.1).
4. The Metadata Service records the new version's manifest (ordered list of block hashes) against the file's path, and publishes a "file changed" event.
5. The Notification Service pushes that event to the user's other linked, currently-connected devices over a long-lived connection (§6.4); a device that's offline simply picks up the change on its next reconnect by asking "what's changed since my last-known version."
6. The recipient device's Sync Client fetches only the blocks it doesn't already have locally (comparing the incoming manifest's hashes against its own local block cache), reconstructs the file, and writes it to the local filesystem — again, never re-downloading unchanged blocks.

## 4. API Design

```
POST /api/v1/sync/manifest-diff
Request:
{
  "file_path": "/Projects/report.docx",
  "known_version": 12,
  "local_block_hashes": ["h1", "h2", "h3_new", "h4"]
}
Response: 200
{
  "server_version": 13,
  "blocks_to_upload": ["h3_new"],          // hashes the server doesn't already have
  "blocks_you_need": []                    // hashes present server-side but missing locally (pull case)
}

PUT /api/v1/blocks/{hash}
Body: <binary block, up to ~4MB>
Response: 201 { "stored": true, "ref_count": 1 }

POST /api/v1/sync/commit
Request:
{ "file_path": "/Projects/report.docx", "block_manifest": ["h1", "h2", "h3_new", "h4"], "base_version": 12 }
Response: 200 { "new_version": 13 }
          409 { "error": "version_conflict", "server_version": 14 }   // someone else committed first

GET /api/v1/sync/changes?since_version=13&device_id=d_laptop
Response: 200
{ "changes": [ { "file_path": "/Projects/report.docx", "version": 14, "block_manifest": [...] } ] }

WS /sync/notifications?device_id=d_laptop
  server → client: { "type": "file_changed", "file_path": "/Projects/report.docx", "version": 14 }
```

## 5. Data Model & Storage Choice

```
files (metadata service — per-user file tree)
  user_id, file_path     composite key
  current_version
  block_manifest          (ordered array of block hashes)
  mtime, size
  deleted                 boolean (tombstone, not hard-delete, for a grace period)

file_versions (bounded history)
  user_id, file_path, version   composite key
  block_manifest (as of this version)
  created_at, device_id (which device committed this version)

blocks (block storage service — global, content-addressed)
  block_hash       PK
  storage_location
  ref_count        (garbage-collected when it hits zero across all files/users)

device_sync_state (per device, tracks sync cursor)
  device_id → { last_synced_version_per_file, or a global sequence cursor }
```

The **metadata service** and **block storage service** are deliberately separate systems with very different scaling shapes, and conflating them is the single most common design mistake in a naive answer to this problem: metadata is small (~3.5 PB total, §2), relationally-shaped (a file has a path, a version history, a manifest — natural foreign-key relationships), and needs point lookups plus small range queries ("what changed since version X") — a solid fit for a relational or lightly-relational NoSQL store per [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md). Block storage is enormous (7+ EB, §2), purely content-addressed key-value (hash → bytes, immutable, globally deduplicated), and needs to scale independently on completely different axes (raw byte throughput and storage density, not query flexibility) — this is squarely an object storage / [distributed file systems](../09-large-scale-data-systems/distributed-file-systems.md) concern. Scaling one should never require scaling the other in lockstep, which is exactly why they're drawn as separate services in §3.

## 6. Deep Dive

### 6.1 Block-level diffing and delta sync

Files are split into blocks — either fixed-size (simpler, but a single byte inserted at the start of a file shifts every subsequent block's boundary, causing every block after the insertion point to appear "changed" even though the content is the same, just shifted) or content-defined chunking (a rolling hash determines block boundaries based on content patterns, so an insertion only affects the blocks immediately around it — the same technique used by tools like rsync). Content-defined chunking is the more bandwidth-efficient choice for real-world edit patterns (insertions/deletions in the middle of a file, not just appends), at the cost of slightly more CPU spent computing rolling hashes locally on every sync check. Either way, the client always computes hashes for its local blocks and only transmits blocks whose hash the server doesn't already have (per the `manifest-diff` endpoint in §4) — this is what produces the 10-40x bandwidth reduction estimated in §2, and is the entire reason this system is viable for large files over consumer internet connections.

### 6.2 Metadata service vs block storage service separation

Beyond the storage-shape argument in §5, this separation also isolates failure domains and scaling operations: the metadata service can be scaled/sharded by user_id (a natural partition key, since one user's file tree is never queried against another's) while the block storage service scales by content-hash prefix, entirely independent of any particular user — a single user with an enormous number of files doesn't create a block-storage hotspot, and a single very-large, widely-shared block (e.g. a common OS installer file millions of users happen to have) doesn't create a metadata-service hotspot. Keeping these concerns architecturally separate means a spike in one (e.g. a burst of new file uploads driving block-storage write load) doesn't directly threaten the other (metadata lookups continue unaffected).

### 6.3 Conflict handling for offline, concurrent edits

The hardest correctness problem: a laptop and a phone both have the same file, both go offline, both are edited differently, and both later try to sync. This is fundamentally different from Google Docs-style real-time collaboration (see [google-drive.md](google-drive.md)'s OT/CRDT discussion) because there is no live session to transform operations against — by the time either device reconnects, the divergence has already fully happened with no coordination in between.

The sync commit protocol (§4's `sync/commit`) uses **optimistic concurrency**: each commit specifies the `base_version` it was built from; if the server's current version for that file has already moved past that base (because the other device committed first), the commit is rejected with `409 version_conflict` rather than silently overwriting the other device's changes. On receiving this conflict, the client does **not** attempt an automatic content-level merge (safe, general-purpose auto-merging of arbitrary binary/document content isn't reliably possible) — instead, following the well-established Dropbox convention, it renames its local divergent version to something like `report (device_id's conflicted copy 2026-07-14).docx`, uploads that as a new, separate file, and then syncs normally against the server's winning version. This trades a moment of user annoyance (two files where they expected one) for the much more important guarantee that **no edit is ever silently lost** — the losing device's work is fully preserved, just renamed, rather than discarded.

### 6.4 Change notification to other devices (long-poll / WebSocket)

Online devices hold a persistent connection (WebSocket, or long-polling as a fallback for restrictive network environments that block WebSocket upgrades) to the Notification Service; a committed change is pushed to all of a user's other connected devices within roughly a second, prompting each to immediately request the specific delta (via `sync/changes`) rather than a full re-scan of the entire account. A device that's offline when the change happens misses the push entirely, by design — this is fine, because on reconnect it queries `sync/changes?since_version=X` using its last-known sync cursor (`device_sync_state`), which deterministically returns everything it missed regardless of how long it was offline; the push notification is purely a latency optimization for the online case, never the sole mechanism of consistency, which is what makes "device was asleep for three weeks" a non-special case rather than a separate code path.

## 7. Bottlenecks & Scaling

- **10x sync events (2.3M/sec)**: metadata service shards by user_id scale horizontally without cross-shard coordination (per §6.2); notification fan-out scales by sharding persistent connections across more Notification Service nodes, similar to the connection-scaling problem in [chat-system.md](chat-system.md).
- **A single very large file edited frequently (e.g. a large design file with autosave every few seconds)**: content-defined chunking bounds the delta size regardless of file size, but very frequent small edits to the same file can still generate a lot of small version-commit overhead — client-side debouncing/batching of rapid successive edits before committing reduces this.
- **Block storage garbage collection at exabyte scale**: `ref_count`-based collection must be handled carefully under concurrent commits (two files referencing the same block, one being deleted while the other still needs it) — reference counting updates need to be atomic/transactional at the per-block level, or use a mark-and-sweep style periodic GC pass instead of naive live ref-counting if atomicity at this scale proves too costly.
- **Reconnect storms after a regional outage**: many devices querying `sync/changes` simultaneously on reconnect can spike metadata service read load; apply jittered backoff client-side and prioritize by how long a device has been offline (longer-offline devices likely have smaller absolute deltas relative to total account size, in most usage patterns, and can be deprioritized slightly without much user-perceptible harm) — or simply scale reads horizontally since the query itself is cheap and well-indexed.
- **Cross-region device pairs (traveler with devices registered from two different home regions)**: metadata writes need a single authoritative region per user account to keep `base_version` conflict-detection correct; route all of a given user's sync traffic to their home region rather than attempting multi-region active-active writes for the same file tree, accepting some added latency for the traveling case in exchange for correctness simplicity, per [strong-vs-eventual-consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md).

## 8. Trade-offs & Alternatives

- **Rename-and-preserve conflict handling vs automatic content merge**: chose the simpler, always-safe option (never lose data, occasionally produce a duplicate file) over attempting automatic merges, which are unreliable for arbitrary file types and could silently produce corrupted or incorrect merged content — an unacceptable failure mode for a product whose entire value proposition is "your files are safe."
- **Content-defined chunking vs fixed-size blocks**: better bandwidth efficiency for realistic mid-file edits, at the cost of extra client-side CPU to compute rolling hashes on every sync check — worth it given how much more the design saves in network bandwidth, which is the scarcer resource for most users (especially on mobile data).
- **Push notification as a latency optimization, not the consistency mechanism**: keeps the "device offline for weeks" case simple (just a longer catch-up query, not a special code path) at the cost of needing a separate, robust `sync/changes` pull mechanism anyway — but that mechanism is needed regardless, so this isn't really extra cost, just correctly assigning responsibility.
- **Separate metadata and block storage services vs one unified store**: more operational surface area (two systems to run, monitor, and scale independently) in exchange for each being scaled/optimized for its own, very different access pattern — bundling them would force one system to compromise on both axes.

## Related topics
- [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md)
- [Distributed File Systems](../09-large-scale-data-systems/distributed-file-systems.md)
- [Object Storage Architecture](../09-large-scale-data-systems/object-storage-architecture.md)
- [Database Sharding](../02-data-storage/database-sharding.md)
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
- [WebSockets vs SSE vs Long Polling](../06-communication-protocols/websockets-vs-sse-vs-long-polling.md)
- [Event-Driven Architecture](../05-messaging-event-driven/event-driven-architecture.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
- [Google Drive](google-drive.md)
- [Chat System](chat-system.md)
