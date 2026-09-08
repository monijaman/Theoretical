# Circuit Breaker Pattern

[← Back to index](../readme.md)

## Simple idea

A circuit breaker stops requests to a service that is already failing.

```text
Service A → Circuit Breaker → Service B
```

Without it, Service A may keep calling Service B, waste resources, and fail more slowly.

## The three states

| State | What happens |
|---|---|
| **Closed** | Requests pass normally |
| **Open** | Requests fail immediately without calling the unhealthy service |
| **Half-open** | A few test requests check whether the service recovered |

```text
Closed ──many failures──> Open
  ▲                         │
  │                    wait for timeout
  │                         ▼
  └────successful tests── Half-open
```

If a test fails in the half-open state, the circuit opens again.

## Why use it?

- Prevents one failing service from slowing down the whole system
- Avoids wasting threads and connections
- Gives the unhealthy service time to recover
- Allows the application to return a fallback response quickly

## Example

A checkout service calls a payment service.

1. The payment service starts timing out.
2. After several failures, the circuit opens.
3. New payment requests fail quickly with a clear error.
4. After a short wait, the circuit allows a test request.
5. Normal traffic resumes if the test succeeds.

## Circuit breaker vs retry

- **Retry** tries a failed request again.
- **Circuit breaker** temporarily stops new attempts.

They are often used together: retry a small number of times, then open the circuit.

## Important settings

- Failure limit before opening
- How long the circuit stays open
- Number of test requests in half-open state
- Which errors count as failures

## Interview summary

Use a circuit breaker for remote calls that may fail or become slow. It protects the caller, prevents cascading failures, and supports fast fallback responses.

## Related topics

- [Retry & Exponential Backoff](retry-exponential-backoff.md)
- [Fault Tolerance](../08-reliability-operations/fault-tolerance.md)
- [Backpressure](backpressure.md)
