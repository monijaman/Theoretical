# Architecture Patterns — Practice Plan

## Purpose

Master the design and documentation of scalable, maintainable architectures by studying real-world migration patterns, event-driven systems, and serverless design—building the communication skills to present architecture decisions like a senior engineer.

## Learning Objectives

- Design and justify a Monolith → Microservices migration strategy
- Build an event-driven order processing system end-to-end
- Architect a serverless background job system using AWS Lambda
- Document architectural decisions using ADRs (Architecture Decision Records)
- Present trade-offs clearly to technical and non-technical stakeholders
- Evaluate when to use each pattern (monolith, microservices, serverless, hybrid)

## Scope

- **Design Work**: Three complete architecture case studies
- **Documentation**: ADRs, C4 diagrams, architecture decision matrices
- **Hands-On**: Prototype or build portions of each system
- **Communication**: Present findings and justify decisions like a senior

## Success Criteria (examples)

- Clear migration path documented: phasing, effort estimates, risk mitigation
- Event-driven system fully functional: order created → payment processed → email sent
- Serverless system deployed with monitoring, error handling, and cost analysis
- 3+ ADRs written explaining key architectural decisions
- Can explain trade-offs (cost, latency, complexity, team scaling) for each pattern
- Peer review: colleague/mentor validates architectural sound reasoning

## Implementation Plan (phases)

1. Foundation: Architecture Documentation Skills (1–2 days)
   - Learn ADR template (Title, Context, Decision, Consequences, Alternatives)
   - Study C4 model (Context, Container, Component, Code diagrams)
   - Review a real ADR/architecture doc (e.g., GitHub, AWS architecture blogs)
   - Practice: Write an ADR for a small decision in previous projects

2. Monolith → Microservices Migration (2–3 days)
   - **Analyze** the monolith: identify service boundaries (domain-driven design)
   - **Plan phases**:
     - Phase 1: Extract one small service (e.g., email service)
     - Phase 2: Add async messaging (RabbitMQ/RabbitMQ) between mono and service
     - Phase 3: Migrate core domains one by one (user, order, payment)
     - Phase 4: Remove monolith dependencies gradually
   - **Document**: Effort, risk, deployment strategy, rollback plan
   - **Trade-offs**: Team scaling (✓ faster iteration) vs. complexity (✗ debugging across services)
   - Deliverable: ADR + architecture diagram + week-by-week migration roadmap

3. Event-Driven Order Processing System (2–3 days)
   - **Design** the flow:
     - User submits order → `Order.Created` event
     - Payment service process payment → `Payment.Processed` or `Payment.Failed` event
     - Inventory service reserves stock → `Stock.Reserved` event
     - Email service sends confirmation → `Email.Sent` event
   - **Architecture**:
     - Kafka or RabbitMQ as event broker
     - Each service has its own DB (no shared schema)
     - Sagas for distributed transactions (choreography or orchestration)
   - **Implement** at least 2 services + event flow
   - **Test**: Happy path, payment failure, inventory stockout scenarios
   - **Document**: Service contracts (event schema), failure modes, retry policies
   - Deliverable: Working system + architectural diagram + testing report

4. Serverless Background Job System (2–3 days)
   - **Design**:
     - API → SNS topic / SQS queue
     - Lambda consumers triggered by queue
     - DynamoDB for state (idempotency), S3 for results
     - CloudWatch for monitoring and DLQ for failed jobs
   - **Implement**: 2–3 job types (e.g., PDF generation, email batch, data aggregation)
   - **Features**:
     - Automatic retries with exponential backoff
     - Idempotency (dedup key, DynamoDB for tracking)
     - Cost monitoring (lambda duration, invocations)
     - Dead letter queue for poison pills
   - **Scale**: Test behavior under burst load (1K concurrent jobs)
   - **Document**: Cost analysis (estimate monthly bill), cold start impact, scaling limits
   - Deliverable: Deployed system + cost-benefit analysis vs. self-hosted workers

5. Trade-off Analysis & Presentation (1–2 days)
   - **Compare** all three patterns:
     | Aspect | Monolith | Microservices | Serverless |
     |--------|----------|---------------|-----------|
     | Team Scaling | Slow | Fast | Very Fast |
     | Complexity | Low | High | Medium |
     | Latency | Lower | Higher | Variable (cold starts) |
     | Cost (scale) | Linear | Linear | Event-driven (low baseline) |
     | Ops Burden | Low–Medium | High | Very Low |
   - **Write** decision matrices for realistic scenarios (startup vs. scaleup vs. enterprise)
   - **Practice** a 20-min presentation: "Choosing the right architecture for [scenario]"
   - Get feedback from peer/mentor

6. Documentation & Final Review (1 day)
   - Compile all ADRs, diagrams, code, and analysis into a cohesive portfolio piece
   - Ensure diagrams are publication-ready (C4, deployment, data flow)
   - Write an executive summary explaining each pattern and when to use it
   - Self-review: Would a senior architect sign off on this? (clarity, completeness, rationale)

## Key Architectural Patterns

| Pattern           | Best For                                            | Pitfalls                                                          |
| ----------------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| **Monolith**      | Early stage, small team, high coupling              | Scaling teams, deploy risk, tech lock-in                          |
| **Microservices** | Large teams, independent scaling, polyglot          | Network latency, distributed tracing complexity, data consistency |
| **Serverless**    | Bursty workloads, low baseline cost, fast iteration | Cold starts, vendor lock-in, debugging across managed services    |
| **Event-Driven**  | Decoupling, asynchronous processing                 | Message ordering, exactly-once semantics, debugging               |
| **Hybrid**        | Gradual migration                                   | Operational complexity                                            |

## Key Documents & Diagrams

1. **C4 Context Diagram**: High-level system, external users/systems
2. **C4 Container Diagram**: Services, databases, message queues
3. **C4 Component Diagram**: Internal structure of 1–2 services
4. **Deployment Diagram**: Kubernetes, serverless, data stores
5. **Data Flow Diagram**: How events/requests flow through system
6. **ADR Document**: Decision context, alternatives, consequences

## Tools & Technologies

- **Diagramming**: Lucidchart, miro, draw.io, Graphviz
- **Event-Driven**: Kafka, RabbitMQ, AWS SNS/SQS
- **Microservices**: Docker, Kubernetes, API Gateway
- **Serverless**: AWS Lambda, DynamoDB, CloudWatch
- **Documentation**: Markdown, ADR templates, C4 PlantUML

## Deliverables

- **3 Architecture Case Studies**:
  1. Monolith → Microservices: ADR + phased roadmap + effort/risk assessment
  2. Event-Driven Order System: Code + service contracts + architectural diagram
  3. Serverless Job System: Deployed stack + cost analysis + scaling report
- **ADRs** (minimum 5): One for each major pattern decision
- **Comparison Analysis**: Decision matrix and scenario-based recommendations
- **Portfolio Presentation**: 20-min talk and supporting slides/diagrams
- **C4 Diagrams**: Context, Container, Component for each system

---

If you want, I can break the phases into task TODOs, provide ADR templates, or help with architecture diagram scaffolds.
