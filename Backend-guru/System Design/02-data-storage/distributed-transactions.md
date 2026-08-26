# Distributed Transactions

[← Back to index](../readme.md)

## Why Distributed Transactions Matter

A normal database transaction is simple:

```sql
BEGIN;

UPDATE account 
SET balance = balance - 100;

COMMIT;
```

The database guarantees:

- Either everything happens ✅
- Or nothing happens ❌

This is called **ACID atomicity**.

---

## The Problem in Microservices

In a microservice architecture, one business action often touches multiple services.

Example: Buying a product.

```
Customer clicks Buy

        |
        |
        +--> Payment Service
        |        |
        |        Database
        |
        +--> Inventory Service
        |        |
        |        Database
        |
        +--> Shipping Service
                 |
                 Database
```

Each service owns its own database.

There is no global:

```
BEGIN TRANSACTION
```

across all services.

---

## Example Failure

Order flow:

```
1. Payment Service
   Charge $50

2. Inventory Service
   Reduce stock

3. Shipping Service
   Create shipment
```

Suppose:

```
Payment:
SUCCESS ✅

Inventory:
SUCCESS ✅

Shipping:
FAILED ❌
```

Now:

```
Customer paid
but order cannot complete
```

A normal database rollback cannot help because:

```
Payment DB
Inventory DB
Shipping DB

are independent systems
```

This is the distributed transaction problem.

---

# Solution 1: Two-Phase Commit (2PC)

Two-Phase Commit tries to make multiple databases behave like one transaction.

It introduces a:

```
Transaction Coordinator
```

Architecture:

```
                 Coordinator

              /       |       \

        Payment   Inventory   Shipping
           DB         DB          DB
```

---

# Phase 1: Prepare Phase

The coordinator asks every service:

> "Can you commit?"

---

## Payment Service

Request:

```
Can you charge $50?
```

Response:

```
YES
```

The service:

- Locks required records
- Writes transaction information
- Waits for final decision

---

## Inventory Service

Request:

```
Can you reduce stock?
```

Response:

```
YES
```

The service:

- Locks inventory
- Writes transaction log
- Waits

---

## Shipping Service

Request:

```
Can you create shipment?
```

Response:

```
NO
```

Example:

```
Courier unavailable
```

---

# Phase 2: Commit or Abort

Coordinator checks responses.

Example:

```
Payment      YES
Inventory    YES
Shipping     NO
```

Because one service failed:

```
ABORT
```

Coordinator sends:

```
Payment:
Rollback

Inventory:
Rollback

Shipping:
Nothing
```

---

# The Major Problem With 2PC

## Coordinator Failure

Imagine:

```
Payment      YES
Inventory    YES
Shipping     YES
```

The coordinator receives all responses.

Before sending:

```
COMMIT
```

the coordinator crashes.

Now services are stuck.

Example:

```
Payment:

"I promised to commit"


Inventory:

"I promised to commit"


Shipping:

"I promised to commit"
```

They cannot decide:

```
COMMIT?
```

or

```
ROLLBACK?
```

So they keep locks.

---

## Blocking Problem

Resources remain unavailable:

```
Payment records locked

Inventory rows locked

Shipping records locked
```

until the coordinator recovers.

This is the fundamental weakness of 2PC.

---

# Why Microservices Avoid 2PC

Microservices usually avoid 2PC because:

## 1. Long Lock Duration

Locks remain while waiting for network communication.

Example:

```
Inventory service slow

        |
        v

Payment records stay locked
```

---

## 2. Tight Coupling

Every participant must support the same protocol.

Example:

```
Payment
Inventory
Shipping
```

must all understand:

```
prepare()
commit()
rollback()
```

---

## 3. Poor Availability

A single unavailable service can block the entire transaction.

Example:

```
Shipping Service Down

        |
        v

Order cannot complete
```

---

# Solution 2: Saga Pattern

Saga breaks one distributed transaction into multiple local transactions.

Each service commits independently.

Instead of rollback:

```
Undo with compensation
```

---

Example:

```
Step 1:
Payment.charge($50)

SUCCESS


Step 2:
Inventory.reserve()

SUCCESS


Step 3:
Shipping.create()

FAILED
```

Now we compensate.

---

## Compensation

A compensation is not a database rollback.

It is a new business transaction that reverses the previous action.

Example:

Original:

```
Charge $50
```

Compensation:

```
Refund $50
```

Not:

```
Delete payment record
```

because money movement already happened.

---

Flow:

```
Shipping Failed

        |
        v

Restore Inventory

        |
        v

Refund Payment
```

---

# Types of Saga

There are two common approaches.

---

# 1. Choreography Saga

No central controller.

Services communicate using events.

Example:

```
Payment Service

charge()

      |
      |
PaymentCompleted Event

      |
      v

Inventory Service

reserve()

      |
      |
StockReserved Event

      |
      v

Shipping Service

ship()
```

---

## Advantages

- Highly decoupled
- No central coordinator

---

## Disadvantages

The workflow becomes difficult to understand.

Example:

```
Payment Service
       |
       |
       +--> Inventory
       |
       +--> Fraud
       |
       +--> Notification
       |
       +--> Analytics
```

Finding the state of an order becomes difficult.

---

# 2. Orchestration Saga

A central orchestrator controls the workflow.

Architecture:

```
              Saga Orchestrator


        /          |          \

   Payment    Inventory    Shipping
```

The orchestrator executes:

```
1. Charge payment

2. Reserve inventory

3. Create shipment
```

If shipping fails:

```
1. Cancel inventory

2. Refund payment
```

---

## Advantages

- Easy to monitor
- Easy to debug
- Workflow is explicit
- Easier retry handling

Example:

Saga state:

```
Order ID: 123

Payment:
COMPLETED

Inventory:
COMPLETED

Shipping:
FAILED

Compensation:
RUNNING
```

---

Most production systems prefer:

```
Saga Orchestration
```

for complex workflows.

---

# TCC: Try-Confirm-Cancel

TCC is a special type of Saga.

It introduces a temporary reservation state.

Common examples:

- Airline seats
- Hotel rooms
- Inventory reservation

---

## Try

Reserve resource.

Example:

```
Seat A10

Status:
HELD
```

---

## Confirm

Everything succeeds.

Convert reservation into final state.

```
Seat A10

Status:
SOLD
```

---

## Cancel

Something failed.

Release reservation.

```
Seat A10

Status:
AVAILABLE
```

---

## Why Use TCC?

Normal Saga:

```
Charge money

Failure:

Refund money
```

TCC:

```
Reserve first

Failure:

Release reservation
```

Cancellation is often simpler.

---

# Comparison Table

| Feature | 2PC | Saga | TCC |
|---|---|---|---|
| Atomicity | Strong | Eventual | Eventual |
| Rollback | Automatic | Compensation | Cancel operation |
| Locks | Yes | No | Reservation |
| Availability | Lower | Higher | Medium |
| Complexity | Medium | Medium | High |
| Microservices Usage | Rare | Very Common | Specific cases |

---

# Common Interview Questions

## Why is Saga eventually consistent?

Because each service commits separately.

Example:

```
Payment:
Completed


Order:
Processing
```

For a short period, the system is in an intermediate state.

---

## What if compensation fails?

Example:

```
Refund API fails
```

Solutions:

- Retry queues
- Exponential backoff
- Dead letter queues
- Manual intervention

Example:

```
Refund Pending

Retry 1

Retry 2

Retry 3

Alert finance team
```

---

## Does Saga provide isolation?

No.

Intermediate states can be visible.

Example:

```
Inventory reserved

Payment failed
```

Possible solutions:

- Pending states
- Semantic locks
- Business rules

---

## When Should You Use 2PC?

Use 2PC when:

- All systems are controlled by one organization
- Strong atomicity is required
- Participants support the protocol

Examples:

- Distributed databases
- Internal database systems

Avoid it for:

- Independent microservices
- Third-party APIs
- Payment providers

---

# Simple Rule to Remember

```
Single Database
        |
        v
ACID Transaction


Multiple Microservices
        |
        v
Saga Pattern


Need Temporary Reservation
        |
        v
TCC


Need Strict Atomicity
        |
        v
2PC
```

---

# Interview Answer

For modern microservices:

> "We usually avoid 2PC because it introduces blocking and tight coupling. Instead, we use the Saga pattern with local transactions and compensating actions. For complex workflows, orchestration-based Saga is preferred because the workflow state is easier to manage, monitor, and recover."

## Related topics
- [Database Migration at Scale](database-migration-at-scale.md)
- [CAP Theorem](../03-consistency-distributed/cap-theorem.md)
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
- [Outbox Pattern](../05-messaging-event-driven/outbox-pattern.md)
- [Event Sourcing](../05-messaging-event-driven/event-sourcing.md)
- [Payment System](../10-system-design-practice/payment-system.md)
