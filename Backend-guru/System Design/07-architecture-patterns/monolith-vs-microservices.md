# Monolith vs. Microservices
[← Back to index](../readme.md)

## What it is and why it's asked

This isn't a "which is better" question — it's a maturity check. Junior answers pick a side ("microservices scale better" / "monoliths are simpler"). The answer that signals real experience is that this is an organizational decision as much as a technical one, that a modular monolith is a legitimate and often-correct destination rather than just a stepping stone, and that plenty of well-known companies have gone from monolith to microservices *and back toward consolidation* when they split too finely. Interviewers ask this to see if you'll default to "microservices" because it's the trendier answer, or reason from the actual constraints: team size, domain clarity, and organizational structure.

## The modular monolith: the underrated middle ground

A modular monolith is a single deployable unit internally organized into clearly separated modules with enforced boundaries (separate packages/namespaces, no reaching across module internals, each module owning its own tables or schema within one database) — you get most of the maintainability benefits people reach for microservices to get, without paying the distributed-systems tax.

```
Monolith (tangled):              Modular monolith:                Microservices:
+-------------------+            +-------------------+            +--------+ +--------+
| everything talks   |           | Orders  | Billing  |            | Orders | | Billing|
| to everything,     |           | module  | module   |            | service| | service|
| shared mutable      |          | (own    | (own     |            +--------+ +--------+
| state everywhere   |           |  tables)|  tables) |                 \      /
+-------------------+            +-------------------+                  network calls
  one deploy, no                   one deploy, clear                one deploy per service,
  internal boundaries              internal boundaries                full operational tax
```

The modular monolith gives you: one deployment pipeline, one process to debug (real stack traces, no distributed tracing required), ACID transactions across module boundaries when you genuinely need them, and — critically — module boundaries that are *cheap to get wrong and fix*, because refactoring a package boundary inside one codebase is a same-day change, while refactoring a service boundary means renegotiating an API contract, migrating data, and coordinating a cutover across teams. This makes it the right place to discover your real bounded contexts before paying to enforce them over a network.

## Conway's Law and team-topology alignment

Conway's Law: *organizations design systems that mirror their own communication structure.* If you have three teams that rarely talk to each other, you will end up with three services (or three tangled modules pretending to be one thing) whether you plan it or not — the org chart leaks into the architecture regardless of the diagram you drew.

The actionable version of this (from Team Topologies) is to design the *organization* deliberately and let architecture follow: if you want service boundaries that match "Team A owns Orders end-to-end, Team B owns Billing end-to-end," you need Team A and Team B to actually be structured, staffed, and empowered to own those slices independently — you're scaling the org structure, and the software boundaries are a consequence of that, not the primary lever. Introducing microservices without first having independent, empowered teams to own each one just produces distributed spaghetti with extra latency: multiple people from multiple teams still have to coordinate to ship a change, except now it's across a network with versioned APIs.

## The "premature microservices" anti-pattern

For an early-stage startup, splitting into microservices before product-market fit is usually a mistake, for reasons distinct from "microservices are hard":

- **The domain is still moving.** You don't yet know where the real bounded contexts are — the boundary you draw today (e.g., "Users" and "Billing" as separate services) will likely be wrong in three months once you understand the business better, and moving a boundary across a network (renegotiating APIs, migrating data ownership) is far more expensive than moving it inside one codebase.
- **The team is too small to own N services.** Microservices assume you have enough engineers that splitting into independently-owned units is a net win; a five-person startup running twelve services means every engineer is on-call for infrastructure they don't fully understand, multiplied twelve times.
- **You pay the full operational tax on day one** — service discovery, distributed tracing, N CI/CD pipelines, saga-based consistency — for scaling problems you don't have yet. A monolith can usually be scaled a very long way (vertically, and horizontally behind a load balancer) before its limits are the actual bottleneck to the business.

The pragmatic default for most new products: build a modular monolith with clean internal boundaries, and only extract a service when there's a concrete forcing function — a genuinely different scaling profile (e.g., a video-transcoding workload vs. the rest of the app), a compliance/isolation requirement, or an independent team that needs to own and deploy that slice on its own cadence.

## Migration path: the strangler fig pattern

When a monolith does need to be decomposed, the standard technique is incremental replacement rather than a rewrite — named after strangler fig vines that grow around a host tree and gradually replace it.

```
Step 1:                          Step 2:                          Step 3:
[ Router/Proxy ]                 [ Router/Proxy ]                 [ Router/Proxy ]
       |                                |     \                          |
[ Monolith: all features ]      [ Monolith: most features ] [ Billing Svc ]  [ Monolith: remaining features ]
                                       (Billing extracted,
                                        proxy routes /billing/* to new service)
```

A routing layer sits in front of the monolith; new functionality (or a carved-out slice of existing functionality) is built as a standalone service, and the router is updated to send matching requests to the new service instead of the monolith, one capability at a time. The monolith keeps running and serving everything not yet migrated, so the system stays shippable and rollback-able throughout — there's no "big bang" cutover where the whole system is at risk simultaneously. This is slower than a rewrite but dramatically de-risks the migration, since each extracted slice can be validated in production before the next one starts.

## Real-world postmortems: going too fine-grained, then consolidating

- **Amazon** is the canonical example of successful decomposition — famously moving from a large monolith to service-oriented architecture in the early 2000s (the "API mandate"), which enabled independent team ownership at massive scale and is often credited as a precursor to AWS itself (internal service APIs became sellable external products).
- **Segment** published a widely-cited postmortem on going too fine-grained: they split their data pipeline into a microservice per destination integration, and ended up with over 140 services that were individually simple but collectively an operational nightmare — inconsistent load across services, complex deployment coordination, and a small team unable to keep up with the operational surface area. They consolidated back down to a single, well-structured service that handled routing to destinations internally.
- **Uber** has similarly discussed the pain of runaway service proliferation (thousands of microservices at peak) making it hard to reason about ownership, causing duplicated logic across teams, and complicating reliability — driving investment in domain-oriented microservice architecture (DOMA) to regroup services around clearer domain boundaries rather than continuing to split indefinitely.

The consistent lesson across these: the number of services is not itself a success metric, and "too fine-grained" is a real, common failure mode with the same operational symptoms as a poorly-decomposed monolith — just distributed across a network instead of contained in one process.

## Trade-offs summary

| | Monolith (incl. modular) | Microservices |
|---|---|---|
| Best team size | Small-to-medium, or large with strong internal module discipline | Large, with independent teams per service |
| Domain maturity needed | Low — boundaries are cheap to fix later | High — wrong boundaries are expensive to fix later |
| Deployment | Single pipeline, all-or-nothing | Independent per service, needs N pipelines |
| Data consistency | ACID transactions available across modules | Sagas, eventual consistency across services |
| Refactoring a boundary | Same-day, in-codebase change | Cross-team API renegotiation + data migration |
| Operational overhead | Low | High (tracing, discovery, service mesh, on-call surface) |
| Failure mode when wrong | Tangled, hard-to-change "big ball of mud" | Distributed spaghetti with the same coupling, plus network latency |

## Common interview follow-ups

**Q: How do you decide when a startup is "ready" for microservices?**
When there's a concrete forcing function — an independent team that needs to own and deploy a slice on its own cadence, a genuinely different scaling profile for one component, or a compliance/isolation requirement — not a fixed headcount or revenue number. Absent a forcing function, a modular monolith usually keeps serving the business fine.

**Q: If Conway's Law says architecture mirrors org structure, how do you use that deliberately?**
Design team boundaries around the bounded contexts you want as service boundaries first — staff a team to own "Billing" end-to-end — and let the corresponding service emerge from that team's ownership, rather than drawing service boundaries on a whiteboard and hoping teams reorganize to match them later.

**Q: What's the practical first step in a strangler fig migration?**
Put a routing layer (reverse proxy, API gateway) in front of the monolith first, before extracting anything — this is what lets you incrementally redirect specific routes/capabilities to new services one at a time while the monolith keeps serving everything else, with an easy rollback (route back to the monolith) if the new service misbehaves.

**Q: Segment and Uber both over-split into microservices — does that mean microservices were the wrong call for them?**
Not inherently — both are large, high-scale organizations where service-oriented architecture makes sense in principle. The failure was granularity and boundary choice (splitting by destination-integration or by narrow technical unit instead of by coherent domain), which is a design mistake independent of whether "monolith vs. microservices" was the right axis to debate.

**Q: Can a modular monolith scale as well as microservices?**
For most workloads, yes, further than people assume — vertical scaling plus horizontal scaling behind a load balancer (with a shared or read-replica'd database) handles a very large range of real traffic. It breaks down specifically when different modules need genuinely different scaling knobs (e.g., one workload is CPU-bound and bursty, another is I/O-bound and steady) or independent deploy cadences — that's the actual signal to extract a service, not raw request volume alone.

**Q: How do database-per-service principles fit into "premature microservices" concerns?**
They compound the cost of getting boundaries wrong early: splitting the database before the domain is understood means a wrong boundary requires a data migration to fix, not just a code refactor — one more reason to defer physical service (and database) separation until the bounded contexts have proven stable inside a modular monolith first.

## Related topics
- [Microservices Architecture](microservices-architecture.md)
- [Multi-Tenant Architecture](multi-tenant-architecture.md)
- [Event-Driven Architecture](../05-messaging-event-driven/event-driven-architecture.md)
- [Database Sharding](../02-data-storage/database-sharding.md)
- [Distributed Transactions](../02-data-storage/distributed-transactions.md)
