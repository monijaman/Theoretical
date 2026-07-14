# Design YouTube
[← Back to index](../readme.md)

## 1. Requirements

**Functional**
- Users upload videos; the platform transcodes them into multiple resolutions/bitrates for adaptive playback.
- Viewers stream video with adaptive bitrate (quality adjusts to network conditions) via a CDN.
- Video metadata: title, description, tags, thumbnails, channel, upload date.
- View counts, likes, comments — visible near-real-time but don't need to be exact to the second.
- Search and recommendations (briefly — the focus here is the media pipeline, not the search/ranking stack).
- Support very large catalogs (hundreds of millions of videos) and very long-tail content (most videos have few views).

**Non-functional**
- Upload should succeed reliably even for large files over unreliable networks (resumable/chunked upload).
- Playback start latency should be low (sub-second to a few seconds) regardless of viewer location — driven by CDN edge proximity, not origin capacity.
- Transcoding is resource-intensive and can be asynchronous — viewers don't expect instant availability of every resolution the second an upload finishes.
- View-count and engagement metrics can be approximate/eventually consistent at high volume — exact real-time counting at global scale is not worth the cost.
- Storage cost matters enormously at this scale — video is the single largest storage/bandwidth cost driver of the whole system.

**Assumptions**
- 500 hours of video uploaded per minute globally, 5B video views/day.
- Average video: 10 minutes, encoded into 5 renditions (144p-1080p, plus occasional 4K for a subset).
- CDN handles the overwhelming majority of playback bandwidth; origin storage/serving is the fallback for cold/rare content.

## 2. Capacity Estimation

**Upload traffic**
- 500 hours/min uploaded ÷ 60 = ~8.3 hours of raw video every second across all uploads globally. At a rough source bitrate of ~50 Mbps for high-quality raw upload footage, that's roughly `8.3 × 3600 sec × 50 Mbps` worth of encoded seconds landing per second... more simply: 500 hours/min of content, at say 1GB/hour average raw upload size, is **~500 GB/minute ≈ ~8.3 GB/sec** of raw ingest bandwidth — a genuinely large, dedicated ingest pipeline requirement, separate entirely from playback traffic.

**Storage**
- Raw + transcoded storage per video: original file (~1 GB for a 10-min upload at moderate source quality) plus 5 renditions (144p ~5MB/min, 360p ~15MB/min, 480p ~25MB/min, 720p ~50MB/min, 1080p ~100MB/min combined ≈ 2 GB/video for renditions) ≈ **~3 GB stored per 10-minute video** including the original.
- 500 hours/min × 60 = 30,000 hours/day uploaded ÷ 10 min/video = **180,000 videos/day**. At 3 GB/video ≈ **540 TB/day** ≈ **~197 PB/year** — this is why object storage with lifecycle/cold-tiering (not a traditional filesystem) is mandatory, and why storage cost optimization (deleting/compressing rarely-viewed renditions) is a first-class design concern, not an afterthought.

**Playback/bandwidth**
- 5B views/day, average watch session ~5 minutes at an average ~3 Mbps (mixed rendition popularity) → `5B × 5 min × 60 sec × 3 Mbps / 8 ≈ 5B × 300 × 0.375 MB ≈ 5.6 × 10^11 MB` — at this scale the only sane framing is aggregate egress bandwidth: roughly **~1.5 Tbps of sustained global egress**, the overwhelming majority of which must be absorbed by CDN edge caches, not the origin — origin-served bandwidth at this scale would be both financially and physically infeasible for any single provider's data centers.

**View-count writes**
- 5B views/day ÷ 86,400 ≈ **~58,000 view-increment events/sec average**, bursty around popular uploads/live moments — far too high for a naive `UPDATE videos SET view_count = view_count + 1` per view against a single row; this drives the approximate-counting design in §6.3.

## 3. High-Level Architecture

```
  ┌──────────┐
  │ Uploader  │
  └────┬─────┘
       │ chunked upload
 ┌─────▼───────────┐
 │ Upload Service    │──▶ Raw storage (object store, "incoming" bucket)
 │ (resumable, chunked)│
 └─────┬───────────┘
       │ publish "video uploaded" event
  ┌────▼─────┐
  │  Kafka    │
  └────┬─────┘
       │
 ┌─────▼──────────────┐
 │ Transcoding Pipeline  │  splits into segments, encodes N renditions in parallel
 │ (distributed workers) │  (per §6.1)
 └─────┬──────────────┘
       │ writes renditions
 ┌─────▼───────────────┐          ┌─────────────────┐
 │ Object Storage         │◀───────│ Metadata Service  │──▶ Metadata DB
 │ (transcoded renditions, │        │ (title, tags,      │   (video info,
 │  manifests)             │        │  status, owner)     │    status, channel)
 └─────┬───────────────┘          └─────────────────┘
       │ origin pull (cache miss only)
  ┌────▼─────┐
  │   CDN     │──▶ Viewer (adaptive bitrate player, HLS/DASH)
  └──────────┘
       ▲
       │ async view/engagement events
 ┌─────┴──────────────┐
 │ View-Count Service   │  approximate counting (§6.3)
 └────────────────────┘
```

**Walkthrough**
1. The uploader sends the file in chunks (resumable — a dropped connection resumes from the last acknowledged chunk, not from zero) to the Upload Service, which assembles it into raw object storage and marks the video `processing`.
2. A "video uploaded" event triggers the Transcoding Pipeline, which splits the source into segments and fans out encoding jobs across a distributed worker pool to produce each target rendition in parallel, then reassembles/packages them into a streaming format (HLS/DASH) with a manifest describing available quality levels.
3. Once at least the lower/default renditions are ready, the Metadata Service flips the video to `available` — playback can start before every rendition (e.g. 4K) finishes, a soft/staged availability model rather than all-or-nothing.
4. Viewers request playback; the video player fetches the manifest and requests segments from the nearest CDN edge, which serves from cache if present or pulls from origin object storage on a miss and caches it for subsequent viewers in that region.
5. The player's adaptive bitrate logic monitors buffer health/bandwidth and switches renditions (segment by segment) to avoid stalling — this is client-side logic reading a standard manifest format, not a server push.
6. View/engagement events stream asynchronously to the View-Count Service, decoupled entirely from the playback path so counting logic never adds latency to actually watching the video.

## 4. API Design

```
POST /api/v1/uploads/init
Request: { "filename": "trip.mp4", "size_bytes": 1073741824, "channel_id": "c_42" }
Response: 201
{ "upload_id": "u_9f21", "chunk_size": 8388608, "upload_urls": ["https://ingest.../chunk/0", "..."] }

PUT /api/v1/uploads/{upload_id}/chunks/{index}
Body: <binary chunk>
Response: 200 { "chunk_index": 3, "received": true }

POST /api/v1/uploads/{upload_id}/complete
Response: 202 { "video_id": "v_88213", "status": "processing" }

GET /api/v1/videos/{id}
Response: 200
{
  "video_id": "v_88213",
  "status": "available",
  "title": "My trip vlog",
  "duration_seconds": 612,
  "renditions_ready": ["144p", "360p", "480p", "720p", "1080p"],
  "manifest_url": "https://cdn.example.com/v88213/master.m3u8",
  "view_count_approx": 128400
}

POST /api/v1/videos/{id}/view
Request: { "viewer_session_id": "s_772", "watched_seconds": 45 }
Response: 202 { "recorded": true }
```

## 5. Data Model & Storage Choice

```
videos (metadata — relational-friendly)
  video_id        PK
  channel_id       indexed
  title, description, tags
  status           (processing|available|failed|removed)
  duration_seconds
  created_at

renditions
  video_id, quality   composite key
  storage_path
  bitrate, resolution
  ready             boolean

view_counts (approximate, high write volume)
  video_id → shard-local counters, periodically merged (§6.3)

raw + transcoded video bytes → Object Storage (not a database at all)
  bucket layout: /raw/{video_id}/source.mp4
                 /processed/{video_id}/{quality}/segment_*.ts + manifest
```

Video **bytes themselves never belong in a database** — they belong in [object-storage-architecture](../09-large-scale-data-systems/object-storage-architecture.md) (S3-style), which is built for exactly this access pattern: large immutable blobs, addressed by key, served through a CDN. This is really a "storage tier" decision that precedes the SQL-vs-NoSQL question.

`videos` metadata is comparatively small in volume (180,000 new rows/day, not hundreds of thousands of writes/sec) with genuine relational shape (a video belongs to a channel, has tags, has renditions) — a relational database (or a document store, either is defensible) fits fine here per [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md); this is not a workload where NoSQL's horizontal-write-scaling advantage is actually needed, unlike the view-count or raw-bytes tiers.

`view_counts` is the one metadata-adjacent piece that needs NoSQL-style, sharded, high-write-throughput handling — see §6.3.

## 6. Deep Dive

### 6.1 Chunked upload and the transcoding pipeline

Large uploads are split client-side into fixed-size chunks (e.g. 8 MB), each uploaded independently with its own ack, so a network interruption only requires re-sending the last incomplete chunk, not the whole file — standard resumable-upload practice (this is effectively what S3 multipart upload and tus.io implement). The server tracks which chunk indices have been received and only marks the upload complete once all are present and reassembled.

Transcoding is the most compute-intensive stage and must be **parallelized within a single video**, not just across videos, or a long video ties up one worker for its full runtime: split the source into short segments (a few seconds each) and distribute segment-encoding jobs for a given rendition across many workers concurrently, then concatenate/package the encoded segments plus a manifest at the end. Each target rendition (144p...1080p, 4K) is an independent parallel job track, so a viewer can get lower-quality renditions available for playback well before the highest-quality one finishes — staged availability (§3 step 3) rather than waiting on the slowest rendition.

### 6.2 CDN-based delivery and adaptive bitrate streaming

Video is pre-segmented into a few-second chunks per rendition, described by a manifest (HLS `.m3u8` or DASH `.mpd`) listing available quality levels and their segment URLs. The player downloads the manifest once, then requests segments individually, continuously estimating available bandwidth and current buffer health to decide whether to step up or down a quality level for the *next* segment — this is why encoding must produce segments aligned across renditions (same segment boundaries at every quality level), so a mid-stream quality switch doesn't skip or repeat content.

The CDN is what makes the ~1.5 Tbps egress figure (§2) survivable: edge nodes cache segments close to viewers, and only a cache miss ever reaches origin object storage — for popular content this cache hit rate approaches 100%, meaning origin storage really only needs to sustain traffic for the long tail of rarely-watched videos, not the aggregate global viewing load. See [CDN Architecture](../04-caching/cdn-architecture.md).

### 6.3 View-count at scale (approximate counting)

A naive single-row atomic increment per view (`UPDATE ... SET count = count + 1`) becomes a hot-row bottleneck for any popular video at ~58,000 writes/sec average (far higher for a single viral video specifically). Two complementary techniques handle this:

- **Sharded counters**: split a video's count into N sub-counters (e.g. hashed by viewer session), incremented independently and summed on read — spreads write contention across N rows instead of one hot row.
- **Approximate/batched aggregation**: view events stream through Kafka and are aggregated in short windows (e.g. every 10-30 seconds) by a stream processor, which then applies a single batched increment per video per window instead of one write per individual view — trading exact real-time accuracy (the displayed count can lag reality by up to the window size) for a 100-1000x reduction in write volume against the durable store.

Together these mean the publicly displayed view count is always slightly approximate and slightly delayed — an explicit, acceptable trade given the non-functional requirement that engagement metrics don't need real-time exactness.

### 6.4 Recommendation system (brief)

Recommendations sit entirely outside the upload/playback critical path — they're computed offline/near-line from aggregated watch history, engagement signals, and content metadata (collaborative filtering and/or learned embeddings over user and video vectors), producing a ranked candidate list per user that's refreshed periodically (not recomputed synchronously per page load). Architecturally this is its own subsystem reading from the same view/engagement event stream the counting service consumes, but writing to a separate recommendation-serving store optimized for fast per-user candidate retrieval — worth noting as a boundary, not building out in depth here since the media pipeline is this write-up's focus.

## 7. Bottlenecks & Scaling

- **10x upload volume**: transcoding worker pool scales horizontally (it's already embarrassingly parallel per segment); ingest bandwidth needs proportionally more regional upload endpoints so uploaders aren't all routed to one distant ingest point.
- **Storage cost growth (197 PB/year and climbing)**: tier renditions by access frequency — demote rarely-watched videos' higher renditions (or even re-transcode on first request instead of storing 4K for a video with 10 lifetime views) to cold/cheaper storage classes; this is as much a cost-engineering problem as a scaling one.
- **A single video goes viral overnight**: CDN absorbs the read-side spike almost entirely by design; the write-side risk is the view-count and comment/engagement pipelines for that one video specifically — sharded counters (§6.3) are what prevent a single hot video from becoming a hot database row.
- **Transcoding backlog during upload spikes (e.g. a major live event driving mass uploads afterward)**: queue depth becomes the backpressure signal; prioritize by uploader tier or by videos closer to their scheduled/expected publish time rather than strict FIFO.
- **Regional playback latency**: expand CDN edge presence in underserved regions; for origin-servable regions with few edge nodes, consider regional origin replicas of hot content ahead of demand (e.g. before a scheduled major release), per [multi-region-architecture](../09-large-scale-data-systems/multi-region-architecture.md).

## 8. Trade-offs & Alternatives

- **Staged rendition availability vs all-or-nothing publish**: lets viewers start watching sooner at the cost of a brief window where only lower qualities are selectable — clearly the right trade for user experience.
- **Approximate view counts vs exact real-time counts**: gave up to-the-second accuracy for a large reduction in write amplification against the durable store; acceptable because no product or billing decision depends on exact real-time counts (unlike, say, ad-impression billing, which would need a stricter accounting path).
- **CDN-first delivery vs origin-served streaming**: adds CDN operational cost and cache-invalidation complexity (e.g. handling takedowns) in exchange for the only viable way to serve ~1.5 Tbps of global egress without an infeasible origin buildout.
- **Object storage for bytes, relational/document store for metadata, sharded counters for engagement**: three different storage technologies for three different access patterns, rather than forcing one database to do everything — more moving parts operationally, but each tier is used for what it's actually good at.

## Related topics
- [Object Storage Architecture](../09-large-scale-data-systems/object-storage-architecture.md)
- [CDN Architecture](../04-caching/cdn-architecture.md)
- [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md)
- [Database Sharding](../02-data-storage/database-sharding.md)
- [Message Queues](../05-messaging-event-driven/message-queues.md)
- [Event-Driven Architecture](../05-messaging-event-driven/event-driven-architecture.md)
- [Caching Strategies](../04-caching/caching-strategies.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
- [Netflix](netflix.md)
