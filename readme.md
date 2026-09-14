# 🚀 Complete Interview Preparation Curriculum

Master full-stack engineering with production-ready content covering frontend, backend, system design, and career progression.

---

## ✨ CURRICULUM STATUS: 100% COMPLETE ✅

**12/12 Core Modules Comprehensively Enhanced**

### Frontend Guru ✅ (5 modules, 10,000+ lines)

- ✅ Design Systems & Component Libraries
- ✅ Edge, Platform Engineering & Testing
- ✅ Frontend Performance Engineering
- ✅ Frontend Security & Reliability
- ✅ Testing Strategy

### Backend Guru ✅ (7 modules, 14,000+ lines)

- ✅ Architecture Patterns
- ✅ Distributed Systems Concepts
- ✅ Redis Deep Dive
- ✅ RabbitMQ + Event-Driven Architecture
- ✅ Kubernetes + Observability + Production Engineering
- ✅ Observability & Reliability
- ✅ Production Simulation & Chaos Engineering

**Total Content:** 20,000+ lines | **Code Examples:** 200+ | **Case Studies:** 15+ companies

---

## 📊 Quick Navigation

| Category                  | Content                                                                                                                  | Status      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------- |
| **Frontend Design**       | [Design Systems](./Frontend-guru/Design%20Systems%20%26%20Component%20Libraries/readme.md)                               | ✅ Complete |
| **Frontend Optimization** | [Performance Engineering](./Frontend-guru/Frontend%20Performance%20Engineering/readme.md)                                | ✅ Complete |
| **Backend Architecture**  | [Architecture Patterns](./Backend-guru/Architecture%20Patterns/readme.md)                                                | ✅ Complete |
| **System Design**         | [Distributed Systems](./Backend-guru/Distributed%20Systems%20Concepts/readme.md)                                         | ✅ Complete |
| **PDF Interview Resources** | [Grouped PDF & Markdown Resources](#pdf-interview-resources)                                                               | ✅ Complete |
| **Caching**               | [Redis Deep Dive](./Backend-guru/Redis%20Deep%20Dive/readme.md)                                                          | ✅ Complete |
| **Event-Driven**          | [RabbitMQ + Events](./Backend-guru/RabbitMQ%20%2B%20Event-Driven%20Architecture/readme.md)                               | ✅ Complete |
| **Production Ops**        | [Kubernetes + Observability](./Backend-guru/Kubernetes%20%2B%20Observability%20%2B%20Production%20Engineering/readme.md) | ✅ Complete |
| **Monitoring**            | [Observability & Reliability](./Backend-guru/Observability%20%26%20Reliability/readme.md)                                | ✅ Complete |
| **Testing @ Scale**       | [Production Simulation](./Backend-guru/Production%20Simulation/readme.md)                                                | ✅ Complete |
| **Status Report**         | [Full Curriculum Status](./CURRICULUM_STATUS.md)                                                                         | ✅ Complete |
| **AI Engineering**        | Context handling, memory, and prompt boundaries                                                                       | ✅ Complete |

---

## 🎯 What You'll Learn

### By the End of This Curriculum

**Architecture & Design:**

- Design systems for 100M+ users
- Choose between monolith/microservices/serverless
- Implement event-driven architectures

**Production Operations:**

- Deploy to Kubernetes with auto-scaling
- Implement observability (logs/metrics/traces)
- Lead incident response

**Performance & Security:**

- Optimize frontend Core Web Vitals
- Secure against XSS/CSRF attacks
- Build resilient distributed systems

**Career Growth:**

- Interview at staff engineering level
- Lead technical architecture decisions
- Mentor engineering teams

---

## 📈 Content Highlights

---

## Context Handling

Context handling is the practice of selecting, organizing, and maintaining the information an AI system needs to produce accurate and consistent responses. It includes conversation history, user instructions, retrieved documents, tool results, and relevant application state.

### Key Practices

- Keep only relevant context to reduce noise and token usage.
- Separate system instructions, user input, retrieved data, and tool results.
- Preserve important conversation state across turns.
- Prioritize trusted and recent information when context conflicts.
- Never treat private model reasoning as user-visible context.

### Example

```text
System instructions → User request → Relevant conversation history
→ Retrieved documents → Tool results → Final response
```

Good context handling improves reliability, reduces hallucinations, and helps AI applications remain consistent as conversations become longer.

---

## Senior Backend Interview Question: Exactly-Once Payments

### Question

A client sends:

```http
POST /payments
Idempotency-Key: abc123
```

The application follows this flow:

1. Check whether the key was already processed.
2. Charge the payment provider.
3. Mark the key as completed.

The provider successfully charges the customer, but the application crashes before saving that the key was completed. The client retries with the same `Idempotency-Key`.

What happens? Do you charge the customer again? How do you make this safe across retries, crashes, and concurrent requests?

### Answer

With the naive flow, the customer **can be charged twice**. The retry cannot find a completed record, so the application may call the provider again.

A database transaction alone cannot solve this because your database and the external payment provider do not share one atomic transaction. Use all of the following:

- Create a durable `payment_attempts` record before charging. Give `idempotency_key` a database `UNIQUE` or `PRIMARY KEY` constraint so concurrent requests cannot create separate attempts.
- Store a hash of the important request fields, such as customer, amount, and currency. Reject the request if the same key is reused with different input.
- Send the **same idempotency key to the payment provider** on every attempt. If the first charge succeeded, the provider returns the original result instead of charging again.
- Store states such as `PROCESSING`, `COMPLETED`, `FAILED`, and `UNKNOWN`, together with the provider transaction ID and original response.
- Return the stored response when a completed request is retried. If an attempt is still processing, wait briefly or return `202 Accepted`/`409 Conflict` instead of starting another independent charge.
- Recover stale or unknown attempts by retrying or querying the provider with the same key. Use provider webhooks and a reconciliation worker to repair local state after crashes or timeouts.

```text
Request with abc123
        │
        ▼
Atomically insert PROCESSING record
        │
        ├── COMPLETED → return the stored response
        ├── PROCESSING → wait or report that it is in progress
        └── New record → charge provider using abc123
                                  │
                                  ▼
                     save result as COMPLETED
```

Redis can help with caching or coordination, but it should not be the payment source of truth because keys can expire or be evicted and locks can expire. The durable record belongs in the database.

Strict exactly-once execution is generally impossible across two independent systems. This design provides an **effectively-once payment outcome**, provided the payment provider supports idempotency or lookup through a unique merchant reference. If it supports neither, a crash or timeout can leave an ambiguous result; reconcile it instead of blindly retrying.

**Interview-ready answer:**

> The naive implementation can double-charge because the provider charge and our database update are not atomic. I would create a durable payment-attempt row with a unique idempotency key and request hash, then pass the same key to the provider. The database constraint controls concurrent requests, while provider-side idempotency closes the crash window. Completed retries return the stored response, and unknown attempts are recovered through provider lookup, webhooks, and reconciliation. That gives us an effectively-once business outcome rather than a literal distributed exactly-once transaction.

For the extended explanation and implementation example, see [Idempotency in APIs](./Backend-guru/Interview/readme.md#21-idempotency-in-apis).

---

## 📚 PDF Interview Resources

A curated collection of interview PDFs and markdowns is available in the [PDFS folder](./PDFS/). Resources are grouped by topic for easy access:

### JavaScript
- [JavaScript Interview Questions (PDF)](./PDFS/JavaScript%20Interview%20Questions.pdf)
- [core JavaScript questions (PDF)](./PDFS/core%20JavaScript%20questions.pdf)
- [js-cheat-sheet (PDF)](./PDFS/js-cheat-sheet.pdf)
- [js-cheet-sheet (PDF)](./PDFS/js-cheet-sheet.pdf)
- [6 killer functions - js (PDF)](./PDFS/6%20killer%20functions%20-%20js%20.pdf)
- [Master Efficient JavaScript Coding with Debouncing and Throttling (PDF)](./PDFS/Master%20Efficient%20JavaScript%20Coding%20with%20Debouncing%20and%20Throttling.pdf)
- [Top 5 JavaScript Design Patterns (PDF)](./PDFS/Top%205%20JavaScript%20Design%20Patterns.pdf)
- [JavaScript Web APIs (PDF)](./PDFS/JavaScript%20Web%20APIs.pdf)
- [Is JavaScript Single-Threaded or Multi-Threaded (PDF)](./PDFS/Is%20JavaScript%20Single-Threaded%20or%20Multi-Threaded.pdf)

### React
- [Avoid Common React Mistakes (PDF)](./PDFS/Avoid%20Common%20React%20Mistakes.pdf)
- [most-asked-react-questions (PDF)](./PDFS/most-asked-react-questions.pdf)
- [React 19- New Hooks And New Patterns (PDF)](./PDFS/React%2019-%20New%20Hooks%20And%20New%20Patterns.pdf)
- [react cheet-sheet (PDF)](./PDFS/react%20cheet-sheet.pdf)
- [React JS vs Next JS- Which One Should You Choose (PDF)](./PDFS/React%20JS%20vs%20Next%20JS-%20Which%20One%20Should%20You%20Choose.pdf)
- [React.js Interview with These Must-Know Questions (PDF)](./PDFS/React.js%20Interview%20with%20These%20Must-Know%20Questions.pdf)
- [react-questions (PDF)](./PDFS/react-questions.pdf)

### TypeScript
- [Mastering TypeScript Key Concepts (PDF)](./PDFS/Mastering%20TypeScript%20Key%20Concepts%20.pdf)
- [typescript-beginner-guide (PDF)](./PDFS/typescript-beginner-guide.pdf)
- [type-script-complete-guite (PDF)](./PDFS/type-script-complete-guite.pdf)

### SQL & Database
- [50-sql (PDF)](./PDFS/50-sql.pdf)
- [advanced-sql (PDF)](./PDFS/advanced-sql.pdf)
- [advanced-sql-2 (PDF)](./PDFS/advanced-sql-2.pdf)
- [leetcode-sql (PDF)](./PDFS/leetcode-sql.pdf)
- [level up your SQL (PDF)](./PDFS/level%20up%20your%20SQL.pdf)
- [sql-beginner-advanced-100+ (PDF)](./PDFS/sql-beginner-advanced-100%2B.pdf)
- [50+ practical SQL interview questio (PDF)](./PDFS/50+%20practical%20SQL%20interview%20questio.pdf)
- [sql-basics (PDF)](./PDFS/sql-basics.pdf)
- [top-sql-interview-questions.md](./PDFS/top-sql-interview-questions.md)
- [sql.md](./PDFS/sql.md)

### DSA & Coding
- [dsa-notes (PDF)](./PDFS/dsa-notes.pdf)
- [50 important DSA problems (PDF)](./PDFS/50%20important%20DSA%20problems.pdf)
- [Zero to Advanced DSA- 30 Days Challenge (PDF)](./PDFS/Zero%20to%20Advanced%20DSA-%2030%20Days%20Challenge.pdf)
- [20-dsa (PDF)](./PDFS/20-dsa.pdf)
- [Topic-Wise DSA Interview (PDF)](./PDFS/Topic-Wise%20DSA%20Interview.pdf)
- [moreproblems.md](./PDFS/moreproblems.md)
- [problem1.md](./PDFS/problem1.md)

### System Design & Backend
- [100-aws (PDF)](./PDFS/100-aws.pdf)
- [MongoDB — 120 Interview Questions & Answers (PDF)](./PDFS/MongoDB%20—%20120%20Interview%20Questions%20%26%20Answers.pdf)
- [x-𝗦𝘆𝘀𝘁𝗲𝗺 𝗗𝗲𝘀𝗶𝗴𝗻 (PDF)](./PDFS/x-𝗦𝘆𝘀𝘁𝗲𝗺%20𝗗𝗲𝘀𝗶𝗴𝗻.pdf)
- [𝐁𝐚𝐜𝐤𝐞𝐧𝐝 𝐒𝐩𝐞𝐜𝐢𝐚𝐥𝐢𝐬𝐭𝐬 (PDF)](./PDFS/𝐁𝐚𝐜𝐤𝐞𝐧𝐝%20𝐒𝐩𝐞𝐜𝐢𝐚𝐥𝐢𝐬𝐭𝐬.pdf)

### Career & General
- [guide on coding interviews (PDF)](./PDFS/guide%20on%20coding%20interviews.pdf)
- [Stop Winging It in Job Interviews (PDF)](./PDFS/Stop%20Winging%20It%20in%20Job%20Interviews.pdf)
- [Crack interviews without DSA (PDF)](./PDFS/C𝗿𝗮𝗰𝗸%20𝗶𝗻𝘁𝗲𝗿𝘃𝗶𝗲𝘄𝘀%20𝘄𝗶𝘁𝗵𝗼𝘂𝘁%20𝗗𝗦𝗔.pdf)

_For the full list and parsed content, see the [PDFS folder](./PDFS/) and [parsed/](./PDFS/parsed/) directory._

---

### Real-World Case Studies

- **Netflix:** $2.4M/month savings through Kubernetes
- **Google:** Error budget philosophy for reliability
- **Uber:** Scaling challenges across regions
- **Capital One:** 10x ROI on chaos engineering
- **Stripe:** Payment processing reliability

### Production-Grade Code

- 200+ working code examples
- Real failure scenarios included
- Both good ❌ and bad ✅ patterns
- Business metrics for each pattern

### Career Progression

- Junior role expectations & skills
- Mid-level technical depth
- Senior architectural thinking
- Staff-level leadership

---

## 🚀 Getting Started

# Title

## Subtitle

- Item 1
- Item 2
  - Sub-item

/_
Enter your query below.
Please append a semicolon ";" at the end of the query
_/

WITH MonthlyTotals AS (
SELECT
YEAR(o.orderdate) AS year,
MONTH(o.orderdate) AS month,
o.customerid,
SUM(od.unitprice \* od.quantity) AS total_monthly_spending
FROM
orders o
JOIN
order_details od ON o.orderid = od.orderid
GROUP BY
year, month, o.customerid
),
MaxMonthlySpending AS (
SELECT
year,
month,
MAX(total_monthly_spending) AS max_spending
FROM
MonthlyTotals
GROUP BY
year, month
)
SELECT
mt.year,
mt.month,
mt.customerid,
mt.total_monthly_spending
FROM
MonthlyTotals mt
JOIN
MaxMonthlySpending mms ON mt.year = mms.year AND mt.month = mms.month
WHERE
mt.total_monthly_spending = mms.max_spending
ORDER BY
mt.year, mt.month, mt.customerid;
