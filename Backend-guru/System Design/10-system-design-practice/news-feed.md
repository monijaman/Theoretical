# Design a News Feed
[← Back to index](../readme.md)

## 1. Requirements

**Functional**
- Users follow other users/pages; posting a piece of content should eventually appear in followers' feeds.
- Feed is reverse-chronological-ish but ranked (not strictly chronological — relevance matters).
- Support pagination/infinite scroll without duplicate or skipped items as new posts arrive mid-scroll.
- Support likes/comments counts visible inline, updated live-ish.
- Handle "celebrity" accounts with tens of millions of followers without degrading the system for everyone else.

**Non-functional**
- Feed load latency: low hundreds of milliseconds p99 for the first page.
- Write (post creation) should be fast for the poster regardless of their follower count — a celebrity posting must not hang waiting for fan-out to complete.
- Eventually consistent is fine: a follower seeing a new post a few seconds late is acceptable; a follower never seeing it at all is not.
- Scale to a very skewed social graph (power-law follower distribution).

**Assumptions**
- 1B users, 200M DAU, average user follows 300 accounts, average posts/user/day = 0.5 → 500M posts/day platform-wide.
- Follower distribution is heavily skewed: 99% of users have under 10k followers; a small set of celebrity accounts have 10M-100M+ followers.
- Average feed request fetches 20 posts per page; average DAU checks feed 10 times/day.

## 2. Capacity Estimation

**Traffic**
- Posts: 500M/day ÷ 86,400 ≈ **~5,800 writes/sec** average, assume 5x peak → ~29,000/sec.
- Feed reads: 200M DAU × 10 checks/day = 2B feed reads/day ÷ 86,400 ≈ **~23,000 reads/sec** average, peak (evenings) 3-4x → ~80,000-90,000/sec. Read:write ratio here (~4:1) is far less skewed than URL-shortener-style systems — feed systems are read-heavy but not read-*dominant* in the same extreme way, because posting is itself a common action.

**Fan-out volume (the real cost driver)**
- Average user: 300 followers → posting to a follower's feed is 300 fan-out writes; at 5,800 posts/sec that's ~1.7M fan-out writes/sec if done eagerly for everyone — this is the number that makes naive fan-out-on-write for celebrities infeasible: one celebrity post to 50M followers is 50M writes for a single post, potentially taking many minutes even with parallelism, and would dominate the whole write pipeline's capacity.

**Storage**
- Post record: id, author_id, content (~300 bytes avg text, media referenced by URL), timestamp, counts ≈ **500 bytes/row**.
- 500M/day × 500 bytes ≈ **250 GB/day** ≈ **~90 TB/year** for posts alone.
- Precomputed feed entries (fan-out-on-write model): if the average user's feed cache holds the last 500 entries × (post_id + score, ~20 bytes) = 10 KB/user × 1B users ≈ **10 TB** total feed-cache storage — notably *larger* in aggregate than the posts themselves, because the same post is duplicated across every follower's feed. This duplication cost is the central trade-off discussed in §6.1.

**Cache/serving**
- Hot-path feed reads at ~90,000/sec peak must be served from a cache (Redis) holding each active user's precomputed feed list — a DB-per-read-request design could not sustain this QPS at acceptable latency.

## 3. High-Level Architecture

```
   ┌──────────┐
   │  Author   │
   └────┬─────┘
        │ create post
  ┌─────▼──────┐
  │ Post Service│──▶ Post Store (durable, sharded by post_id/author_id)
  └─────┬──────┘
        │ publish "new post" event
   ┌────▼─────┐
   │  Kafka    │
   └────┬─────┘
        │
  ┌─────▼────────────┐
  │  Fan-out Worker    │   decides push (write to followers' feed caches)
  │  (checks follower   │   vs pull (celebrity — skip eager fan-out)
  │   count / graph)   │
  └───┬───────────┬────┘
      │ push        │ (celebrity posts skip this path)
 ┌────▼─────┐       │
 │ Feed Cache│       │
 │ (Redis,   │       │
 │  per-user  │       │
 │  sorted set)│      │
 └────┬─────┘       │
      │              │
  ┌───▼──────────────▼────┐
  │   Feed Read Service     │  merges: precomputed feed + on-the-fly celebrity posts
  └───────────┬────────────┘
              │
        ┌─────▼─────┐
        │  Client    │
        └───────────┘
```

**Walkthrough**
1. A user creates a post; the Post Service durably stores it and publishes a "new post" event to Kafka — the author's request completes immediately at this point, regardless of what happens next.
2. A Fan-out Worker consumes the event and checks the author's follower count. For normal users (the vast majority), it pushes the post id into every follower's precomputed feed cache (a Redis sorted set keyed by user_id, scored by rank/time) — this is **fan-out-on-write**.
3. For celebrity authors (follower count above a threshold, e.g. 1M), fan-out-on-write is skipped entirely — pushing to tens of millions of feed caches for one post is too expensive and too slow. Instead the post is simply marked for **fan-out-on-read**.
4. When a follower requests their feed, the Feed Read Service reads their precomputed feed cache (fast path, covers all normal accounts they follow) *and* separately fetches recent posts from any celebrities they follow (a small, bounded list per user), merging and re-ranking the two sets at read time.
5. This **hybrid** approach means the expensive path (fan-out) only happens for accounts where it's cheap (few followers), and the expensive-to-avoid path (fan-in at read time) only happens for the rare celebrity case, where read-time cost is bounded by "how many celebrities does this one user follow," not by the celebrity's follower count.

## 4. API Design

```
POST /api/v1/posts
Request:
{ "author_id": "u_42", "content": { "type": "text", "body": "shipped a new feature today" } }
Response: 201
{ "post_id": "p_9931", "created_at": "2026-07-14T09:00:00Z" }

GET /api/v1/feed?cursor={opaque_cursor}&limit=20
Response: 200
{
  "posts": [
    { "post_id": "p_9931", "author_id": "u_42", "content": {...}, "like_count": 128, "created_at": "..." },
    ...
  ],
  "next_cursor": "eyJyYW5rIjoxMjM0LCJwb3N0X2lkIjoicF85OTMwIn0="
}

POST /api/v1/posts/{id}/like
Response: 200 { "like_count": 129 }
```

**Cursor-based pagination**, not offset-based: the cursor encodes the last-seen rank score and post_id (`{"rank": 1234, "post_id": "p_9930"}`, base64-opaque to the client). This avoids the classic offset-pagination bug where new posts arriving mid-scroll shift everyone else's positions, causing skipped or duplicated items — cursor pagination instead says "give me everything ranked below this exact point," which is stable regardless of what's inserted above it.

## 5. Data Model & Storage Choice

```
posts (sharded by post_id, e.g. Snowflake-encoded for time locality)
  post_id        PK
  author_id      indexed
  content
  created_at
  like_count, comment_count   (denormalized counters, updated async)

follows
  follower_id, followee_id    composite key, both directions indexed
                              (need "who do I follow" and "who follows me")

feed_cache (Redis, per user — the fast path)
  key = "feed:{user_id}"
  value = sorted set { post_id → rank_score }, capped at ~500-1000 entries
```

`posts` and `follows` are high-volume, simple-access-pattern data (point lookups, and for `follows`, listing all rows for one side of the relationship) — both fit a wide-column/key-value NoSQL store well, per [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md): no need for joins (the fan-out worker resolves "who follows this author" as a simple partitioned lookup, not a SQL join), and horizontal scalability matters more than relational query flexibility at this volume. The `follows` table specifically needs careful sharding (by follower_id for "who do I follow," and a separate index/table by followee_id for "who follows me" — see [database-sharding](../02-data-storage/database-sharding.md)) since both access directions are needed for different operations (feed reads vs fan-out).

The `feed_cache` is explicitly ephemeral and reconstructible (it can always be rebuilt by re-querying `posts`/`follows` if lost) — this is the textbook justification for keeping it in Redis rather than treating it as a durable system of record: losing it is a performance blip, not a data-loss incident.

## 6. Deep Dive

### 6.1 Fan-out-on-write vs fan-out-on-read vs hybrid

**Fan-out-on-write (push)**: on post creation, immediately write the post id into every follower's feed cache. Feed reads are then just a single cache lookup — extremely fast. The cost is concentrated at write time and scales with follower count: fine for a typical user (hundreds of followers), catastrophic for a celebrity (tens of millions) — a single post could take minutes to fully propagate and would flood the fan-out worker pool, starving fan-out for everyone else's posts in the meantime.

**Fan-out-on-read (pull)**: feed reads query "recent posts from everyone I follow" at request time, merging on the fly. Writes are trivially cheap (just store the post once), but reads become expensive — a user following 300 accounts requires querying/merging 300 sources on every feed load, and a user following a celebrity means that query touches the celebrity's very large post history at read time too, though at least this cost is paid per-*reader*, not per-*follower-of-the-poster*, which is the crucial asymmetry that makes it viable for the celebrity case specifically.

**Hybrid (chosen)**: fan-out-on-write for the 99% of authors with a normal follower count (keeps reads fast for everyone, keeps write cost bounded since follower counts are small), fan-out-on-read only for the rare celebrity accounts (keeps celebrity posts affordable to create, at the cost of a slightly more expensive read merge — but only for the bounded number of celebrities a given user follows, not the celebrity's follower count). This asymmetric design is the standard answer to the celebrity problem and directly reflects the power-law shape of real social graphs.

### 6.2 The celebrity/hot-user problem in more detail

Beyond just picking hybrid fan-out, the threshold itself needs care: a hard cutoff (e.g. exactly 1M followers) creates a cliff where an account just below/above the line behaves very differently. A softer approach buckets authors into tiers (e.g. fan out immediately for <10k followers, fan out asynchronously with lower priority for 10k-1M, skip fan-out entirely above 1M) so the transition is graceful and so borderline accounts don't cause sudden load spikes when they cross the threshold. Celebrity posts read at request time also benefit from being cached themselves (a celebrity's last N posts sit in a shared, non-per-user cache, since many different followers are all merging in the *same* small set of recent posts) — this turns an O(followers) fan-out-on-write cost into an O(1) shared cache read on the merge path.

### 6.3 Feed ranking (brief)

Pure reverse-chronological ranking is simple but not what most modern feeds actually do — a ranking model scores candidate posts using signals like recency, poster affinity (how often this user engages with that poster), predicted engagement probability, and content type diversity. Architecturally, ranking is a separate concern layered on top of the *candidate generation* problem described in §6.1: fan-out (write or read) decides *which posts are candidates*, a ranking service scores and orders them. This separation lets ranking models evolve (new signals, A/B tested weights) without touching the fan-out infrastructure, and lets candidate generation stay simple and fast since it never has to run an ML model inline.

### 6.4 Cursor-based pagination in a live, mutating feed

Because new posts are constantly being inserted above whatever a user is currently scrolled to, offset-based pagination (`LIMIT 20 OFFSET 40`) breaks: items shift and either repeat or get skipped as the underlying ordered set changes between page requests. A cursor encodes a stable position — typically the rank score of the last item seen — so "give me the next page" really means "give me everything ranked strictly after this point," which stays correct regardless of insertions above that point. The trade-off is that cursors can't jump to an arbitrary page number (no "go to page 5"), which is an acceptable and standard trade for infinite-scroll UIs.

## 7. Bottlenecks & Scaling

- **10x posting volume**: fan-out worker pool scales horizontally by partitioning on author_id; the hybrid celebrity threshold needs re-tuning as normal-user follower counts also grow — what's "normal" today may need a higher cutoff at 10x scale.
- **A celebrity threshold crossing (viral overnight growth)**: monitor follower-count growth and move accounts between fan-out tiers proactively rather than reactively, since a sudden spike in fan-out cost for a previously-normal account can appear with little warning.
- **Feed cache memory growth**: 10 TB of precomputed feed data (§2) grows with user base; cap per-user cached entries (e.g. 500-1000) and evict beyond that, relying on fan-out-on-read merge for anything older, per [cache-eviction-policies](../04-caching/cache-eviction-policies.md).
- **Hot celebrity post read-merge storms**: cache the celebrity's recent posts in a shared (not per-follower) cache tier so a viral celebrity post doesn't multiply DB reads by follower count at merge time.
- **Cross-region feed consistency**: a post created in one region should appear in followers' feeds globally within seconds; replicate the "new post" event stream across regions asynchronously, accepting eventual consistency, per [strong-vs-eventual-consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md).

## 8. Trade-offs & Alternatives

- **Hybrid fan-out vs pure push or pure pull**: chosen specifically to handle the power-law follower distribution — pure push is unworkable for celebrities, pure pull is unnecessarily expensive for the 99% of normal accounts where push is cheap and gives faster reads.
- **Storage duplication (10 TB feed cache vs 90 TB/year of posts) vs a single source of truth queried live**: accepted duplication because it converts an expensive fan-in query into an O(1) cache read for the overwhelming majority of feed loads — the classic space-for-latency trade.
- **Eventually consistent fan-out vs synchronous**: a follower seeing a new post a few seconds late is invisible to the user in practice (they weren't staring at an empty feed waiting), so async fan-out via Kafka was chosen over blocking the post-creation request on fan-out completion.
- **Ranking layered on top of candidate generation vs baked into fan-out**: keeps the expensive/tricky fan-out infrastructure simple and stable, at the cost of an extra scoring pass at read time — worth it because ranking models change far more often than the fan-out architecture should.

## Related topics
- [Database Sharding](../02-data-storage/database-sharding.md)
- [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md)
- [Caching Strategies](../04-caching/caching-strategies.md)
- [Cache Eviction Policies](../04-caching/cache-eviction-policies.md)
- [Message Queues](../05-messaging-event-driven/message-queues.md)
- [Event-Driven Architecture](../05-messaging-event-driven/event-driven-architecture.md)
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
- [Chat System](chat-system.md)
