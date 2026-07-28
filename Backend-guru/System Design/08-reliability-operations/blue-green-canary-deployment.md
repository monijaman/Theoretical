# Blue-Green & Canary Deployment
[← Back to index](../readme.md)

## What it is and why it's asked

Blue-Green and Canary deployments solve the same problem:

> **How do you release a new version while minimizing the impact if something goes wrong?**

They are often confused with **rolling deployments** or **zero-downtime deployments**, but they answer a different question.

- **Rolling deployment** focuses on **avoiding downtime** during deployment.
- **Blue-Green** focuses on **instant rollback**.
- **Canary** focuses on **minimizing user exposure**.

Interviewers want to know whether you think about deployment risk:

- How many users are exposed?
- How quickly can problems be detected?
- How quickly can you recover?

A good deployment strategy isn't just how you release software—it's how safely you can undo it.

---

# Blue-Green Deployment

Blue-Green deployment keeps **two identical production environments**.

- **Blue** = current production
- **Green** = new version

Only one receives production traffic.

```text
Before

            Router
               |
          100% Traffic
               |
          +---------+
          | Blue v1 |
          +---------+

          +---------+
          | Greenv2 |
          +---------+
          (idle)
```

The new version is fully deployed before receiving any traffic.

After validation:

```text
            Router
               |
          100% Traffic
               |
          +---------+
          | Greenv2 |
          +---------+

          +---------+
          | Blue v1 |
          +---------+
          (standby)
```

The router simply switches traffic.

No redeployment is required.

---

# Rollback

If the new version has problems:

```text
Router

Before

100% → Green

Problem detected

↓

Switch

↓

100% → Blue
```

Rollback usually takes only a few seconds.

Because the old environment still exists, recovery is extremely fast.

---

# Advantages

- Near-zero downtime
- Very fast rollback
- Full production validation before switching
- Simple deployment logic
- Easy smoke testing before release

---

# Disadvantages

- Requires two production environments
- Higher infrastructure cost
- 100% of users see the new version immediately after switching
- Database migrations require extra care

---

# Database Challenge

Both environments often share the same database.

```text
Blue v1
     \
      Database
     /
Green v2
```

Therefore schema changes must be backward compatible.

Example:

Bad migration:

```sql
DROP COLUMN phone;
```

Blue still expects that column.

Instead use Expand → Migrate → Contract.

```
Step 1
Add new column

↓

Step 2
Deploy application

↓

Step 3
Move data

↓

Step 4
Remove old column
```

This allows both versions to work simultaneously.

---

# Canary Deployment

Canary deployment releases the new version to a **small percentage of users first**.

Example rollout:

```text
99% → Version 1

1% → Version 2
```

Monitor metrics.

If healthy:

```text
95% → Version 1

5% → Version 2
```

Then:

```text
75%

25%
```

Then:

```text
50%

50%
```

Finally:

```text
100%

Version 2
```

Instead of one large switch, traffic gradually shifts.

---

# Canary Rollout

```text
Stage 1

99%
v1

1%
v2

↓

Monitor

↓

Healthy?

↓

Yes

↓

5%

↓

25%

↓

50%

↓

100%
```

If metrics become unhealthy:

```text
Stage

5%

↓

Errors increase

↓

Rollback

↓

100%
Version 1
```

Only a small percentage of users experience the failure.

---

# What Metrics Are Monitored?

Typical deployment metrics include:

- Error rate
- HTTP 5xx responses
- P95/P99 latency
- CPU usage
- Memory usage
- Request success rate
- Business metrics
  - purchases
  - signups
  - checkout success
  - API failures

A deployment may look technically healthy while revenue drops.

Business metrics are often just as important.

---

# Automated Canary

Modern platforms automate rollout.

Example:

```yaml
strategy:
  canary:
    steps:
      - setWeight: 1
      - pause: 10m
      - setWeight: 5
      - pause: 15m
      - setWeight: 25
      - pause: 30m
      - setWeight: 100
```

Between each stage:

```
Observe metrics

↓

Healthy?

↓

Continue

or

Rollback
```

Tools include:

- Argo Rollouts
- Flagger
- AWS CodeDeploy
- Spinnaker

---

# Advantages

- Small blast radius
- Real production traffic
- Automatic rollback
- Detects production-only bugs
- Safer than all-at-once deployments

---

# Disadvantages

- Slower rollout
- More complex infrastructure
- Requires traffic splitting
- Requires monitoring and automation

---

# Blue-Green vs Canary

Imagine Version 2 has a bug.

Blue-Green:

```text
100%

↓

Broken
```

Everyone immediately experiences the issue.

Canary:

```text
1%

↓

Broken

↓

Rollback
```

Only a small percentage of users are affected.

---

# Feature Flags

Feature flags solve a different problem.

Deployment:

```
Code reaches production.
```

Release:

```
Users can access the feature.
```

These are separate events.

Example:

```
Deploy

Monday

↓

Feature hidden

↓

Enable Friday
```

No deployment occurs on Friday.

Only the flag changes.

---

# Example

Infrastructure:

```text
5%

New Version

95%

Old Version
```

Inside the new version:

```text
if(featureEnabled){

    New Checkout

}else{

    Old Checkout

}
```

Deployment decides **which binary runs**.

Feature flags decide **which code executes**.

These techniques complement each other.

---

# Advantages of Feature Flags

- Instant rollback
- No redeployment
- Gradual user rollout
- A/B testing
- Beta users
- Internal testing
- Dark launches

Example:

```
Employees only

↓

5% Users

↓

25%

↓

100%
```

---

# Disadvantages

Every flag adds code complexity.

Old flags eventually become technical debt.

```javascript
if(flagA){
   ...
}

if(flagB){
   ...
}

if(flagC){
   ...
}
```

Unused flags should be removed after rollout.

---

# Comparison

| Feature | Blue-Green | Canary | Feature Flags |
|----------|------------|---------|---------------|
| Rollback Speed | Seconds | Minutes | Milliseconds |
| User Exposure | 100% after switch | Gradual | Configurable |
| Infrastructure Cost | High | Medium | Low |
| Complexity | Medium | High | Medium |
| Detects Production Bugs Early | No | Yes | Depends on rollout |
| Primary Purpose | Fast rollback | Safe rollout | Controlled release |

---

# When to Choose Blue-Green

Choose Blue-Green when:

- Fast rollback is the highest priority.
- You can afford duplicate infrastructure.
- Deployments are infrequent but high risk.
- You want complete production validation before switching.

Examples:

- Banking systems
- Healthcare systems
- Enterprise applications

---

# When to Choose Canary

Choose Canary when:

- Large user base
- Frequent deployments
- Continuous delivery
- Strong observability
- Automated monitoring

Examples:

- Social media
- SaaS platforms
- Streaming services
- E-commerce

---

# When to Use Feature Flags

Feature flags are ideal for:

- Gradual releases
- Beta testing
- Internal users
- Regional rollouts
- A/B testing
- Dark launches

Feature flags control **who sees the feature**, not **which version is deployed**.

---

# Hybrid Strategy

Many companies combine all three techniques.

```text
Deploy Green Environment

↓

Canary 5%

↓

Metrics Healthy

↓

100% Green

↓

Enable Feature Flag

↓

Employees

↓

5%

↓

25%

↓

100%
```

Each layer reduces deployment risk further.

---

# Comparison Summary

```text
Blue-Green

Fast rollback
High cost
Large blast radius


Canary

Small blast radius
Slower rollout
Excellent safety


Feature Flags

Fastest feature rollback
No infrastructure change
Code complexity
```

---

# Best Practices

- Monitor both technical and business metrics.
- Automate rollback whenever possible.
- Keep database migrations backward compatible.
- Remove stale feature flags after rollout.
- Start canaries with very small traffic percentages.
- Define clear rollback thresholds before deployment.
- Use synthetic smoke tests before exposing users.
- Combine deployment strategies when appropriate.

---

# Common Interview Questions

### Q: When should you choose Blue-Green instead of Canary?

Choose Blue-Green when instant rollback is more important than minimizing user exposure, and you can afford maintaining two complete production environments.

---

### Q: What's the biggest disadvantage of Blue-Green?

All users receive the new version immediately after the switch. Bugs that only appear under real production traffic affect everyone at once.

---

### Q: How do you choose Canary percentages?

Start with a very small percentage (often 1%), observe metrics long enough for meaningful signals, then increase gradually (for example, 1% → 5% → 25% → 50% → 100%) if the deployment remains healthy.

---

### Q: Can Blue-Green and Canary be combined?

Yes.

You can deploy a new Green environment, send only a small percentage of traffic to it using a canary rollout, then shift all traffic once confidence is high. This combines limited blast radius with fast rollback.

---

### Q: If feature flags can disable a feature instantly, why use Canary?

Feature flags only disable code that is explicitly wrapped by a flag. They cannot protect against regressions such as startup failures, memory leaks, dependency issues, or crashes in shared infrastructure. Canary deployments validate the entire application binary.

---

### Q: What's a failure that feature flags cannot fix?

If the new application crashes during startup or contains a runtime bug before the flagged code executes, disabling the feature flag has no effect. The deployment itself must be rolled back to the previous version.

---

## Rule of Thumb

> **Blue-Green minimizes rollback time, Canary minimizes user exposure, and Feature Flags decouple deployment from release. Mature delivery pipelines often use all three together.**

## Related topics
- [Zero-Downtime Deployment](zero-downtime-deployment.md)
- [High Availability](high-availability.md)
- [Fault Tolerance](fault-tolerance.md)
- [Observability: Logs, Metrics & Traces](observability-logs-metrics-traces.md)
- [Database Migration at Scale](../02-data-storage/database-migration-at-scale.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
