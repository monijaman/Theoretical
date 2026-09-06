# Go Concurrency — Core Concepts

> **Kitchen Analogy** (use this to remember everything):
> Goroutine = a cook | Channel = conveyor belt | WaitGroup = manager waiting for all cooks | Mutex = one person uses the knife at a time | Select = waiter checking which table needs attention | Pipeline = assembly line | Worker Pool = fixed team of cooks | Fan-Out = one order → many cooks | Fan-In = many cooks → one pass to customer | Context = manager who yells "CLOSE DOWN" to everyone at once

---

## The Big Picture

```
Goroutines run concurrently → communicate through Channels → synchronized with WaitGroup/Mutex
                                        ↓
               Patterns built on top: Pipeline | Worker Pool | Fan-Out/Fan-In
                                        ↓
               All cancellable with: context.Context (or done channel)
```

---

## 1. Concurrency vs Parallelism

**Think:** One chef switching between tasks = concurrent. Two chefs cooking at the same time = parallel.

| | Concurrency | Parallelism |
|---|---|---|
| Meaning | Multiple tasks **in progress** at overlapping times | Multiple tasks running **at the exact same instant** |
| Needs | Just scheduling | Multiple CPU cores |
| Go | Always (goroutines) | Yes, via `GOMAXPROCS` (default = NumCPU) |

> Go's scheduler maps goroutines → OS threads → CPU cores. When a goroutine blocks (I/O, channel), the runtime parks it and runs another — keeping CPUs busy.

---

## 2. Goroutines

**Think:** A cook that starts working the moment you say `go`. Costs almost nothing to create (2 KB vs 2 MB for OS threads). You can have millions.

```go
go someFunc()        // fire and forget — doesn't block main
go func() { ... }() // inline goroutine
```

**Critical:** If `main()` returns, ALL goroutines are killed instantly.

```go
// WRONG — goroutine may never run
func main() {
    go fmt.Println("Hello!")
    // main exits → goroutine killed
}

// CORRECT — wait for it
func main() {
    var wg sync.WaitGroup
    wg.Add(1)
    go func() {
        defer wg.Done()
        fmt.Println("Hello!")
    }()
    wg.Wait()
}
```

### Goroutine vs OS Thread

| | Goroutine | OS Thread |
|---|---|---|
| Stack | ~2 KB (grows dynamically) | ~1–2 MB (fixed) |
| Creation | Microseconds | Milliseconds |
| Count | Millions | Thousands max |
| Managed by | Go runtime | OS kernel |
| Switch cost | Cheap (user space) | Expensive (kernel) |

### Closure Variable Capture Bug (very common)

```go
// WRONG — all goroutines share the same 'i' → prints 5,5,5,5,5
for i := 0; i < 5; i++ {
    go func() { fmt.Println(i) }()
}

// CORRECT — pass as argument (makes a copy)
for i := 0; i < 5; i++ {
    go func(n int) { fmt.Println(n) }(i)
}
```

---

## 3. Channels

**Think:** A typed conveyor belt between goroutines. Sending blocks until someone receives. Receiving blocks until someone sends. Both happen = synchronized.

```go
ch := make(chan int)   // create
ch <- 42              // SEND — blocks until receiver ready
val := <-ch           // RECEIVE — blocks until sender ready
```

### Unbuffered — Direct Handoff (synchronous)

```
Sender:   ──────[BLOCKS]──────── handoff ──────►
Receiver: ───────────────────────[BLOCKS]──── receives
```

Both sides must be ready at the same instant.

```go
ch := make(chan string) // no buffer

go func() {
    ch <- "hello"   // blocks until main receives
}()

msg := <-ch         // both unblock together
fmt.Println(msg)    // "hello"
```

### Buffered — Async up to Capacity

```
Capacity=3:  Send→[v1| | ]  Send→[v1|v2| ]  Send→[v1|v2|v3]  Send→BLOCKS (full)
             Recv→[v2|v3| ] unblocks the waiting sender
```

```go
ch := make(chan int, 3)
ch <- 1   // no block
ch <- 2   // no block
ch <- 3   // no block
// ch <- 4  // BLOCKS — buffer full

fmt.Println(<-ch) // 1
```

### Closing a Channel

```go
close(ch) // signal: no more values coming — only SENDER closes!

// Range stops automatically when channel is closed + empty
for v := range ch { fmt.Println(v) }

// Detect if closed
v, ok := <-ch   // ok=false means closed and empty
```

**Rules:**
- Only the **sender** closes — receiving from closed returns zero + `false`, sending to closed **panics**
- `range` over a channel loops until it's closed

### Directional Channels — Enforce Ownership

```go
func producer(ch chan<- int) { ch <- 42 }   // send-only — can't receive
func consumer(ch <-chan int) { v := <-ch }  // receive-only — can't send
```

### Select — Wait on Multiple Channels

**Think:** A waiter checking which table needs attention first. Picks whichever case is ready. If both ready, picks randomly (fair).

```go
select {
case msg := <-ch1:
    fmt.Println("from ch1:", msg)
case msg := <-ch2:
    fmt.Println("from ch2:", msg)
}
```

```go
// Non-blocking check
select {
case val := <-ch:
    fmt.Println("got:", val)
default:
    fmt.Println("nothing ready")
}

// Timeout
select {
case result := <-workCh:
    fmt.Println(result)
case <-time.After(5 * time.Second):
    fmt.Println("timed out!")
}

// Cancellation
select {
case data := <-dataCh:
    process(data)
case <-ctx.Done():
    return ctx.Err()
}
```

---

## 4. Synchronization Primitives

### sync.WaitGroup — Wait for Many Goroutines

**Think:** A manager counting cooks. Add before start, Done when finished, Wait until all done.

```go
var wg sync.WaitGroup

for i := 1; i <= 5; i++ {
    wg.Add(1)              // BEFORE starting — never inside goroutine
    go func(id int) {
        defer wg.Done()    // always defer
        fmt.Printf("Worker %d done\n", id)
    }(i)
}

wg.Wait() // blocks until all Done() calls
```

> Never copy a WaitGroup — always pass by pointer.

### sync.Mutex — Exclusive Lock

**Think:** One person uses the knife at a time. Others wait.

```go
type SafeCounter struct {
    mu    sync.Mutex
    count int
}

func (c *SafeCounter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count++
}
```

> Never copy a Mutex — use pointer receivers.

### sync.RWMutex — Many Readers, One Writer

```go
c.mu.RLock()   // many goroutines can hold this simultaneously
defer c.mu.RUnlock()
// ...read...

c.mu.Lock()    // exclusive — blocks all readers + writers
defer c.mu.Unlock()
// ...write...
```

### sync.Once — Run Exactly Once

**Think:** Initialize the DB connection exactly once no matter how many goroutines call it.

```go
var once sync.Once

func GetDB() *DB {
    once.Do(func() {
        instance = connectToDB() // runs exactly once, ever
    })
    return instance
}
```

### sync/atomic — Lock-Free Simple Operations

Fastest option for counters and flags. No lock overhead.

```go
var counter int64

atomic.AddInt64(&counter, 1)            // increment
val := atomic.LoadInt64(&counter)       // safe read
atomic.StoreInt64(&counter, 0)          // safe write
```

### Semaphore via Buffered Channel — Limit Concurrency

**Think:** A parking lot with N spots. Goroutine parks (acquires), works, leaves (releases).

```go
semaphore := make(chan struct{}, 3) // max 3 concurrent

for _, job := range jobs {
    wg.Add(1)
    go func(j Job) {
        defer wg.Done()
        semaphore <- struct{}{}             // acquire (blocks if 3 running)
        defer func() { <-semaphore }()     // release
        process(j)
    }(job)
}
wg.Wait()
```

---

## 5. Pipeline Pattern

**Think:** Assembly line. Each station does one job and passes the result to the next.

```
[gen] ──ch──► [filter] ──ch──► [square] ──ch──► [print]
 source         stage            stage            sink
```

**Key rule:** Each stage takes a `<-chan T` in, returns a `<-chan T` out. Close out-channel with `defer close(out)`.

```go
// Source — produces values
func gen(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums { out <- n }
    }()
    return out
}

// Stage — transforms values
func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in { out <- n * n }
    }()
    return out
}

// Connect and consume
func main() {
    for n := range square(square(gen(2, 3, 4))) {
        fmt.Println(n) // 2²=4→4²=16,  3²=9→9²=81,  4²=16→16²=256
    }
}
```

**Pipeline rules:**
1. Stages `defer close(out)` when done sending
2. Stages `range in` until it's closed
3. Only sender closes — never the receiver

---

## 6. Worker Pool Pattern

**Think:** A fixed team of cooks. Jobs pile up in a queue. Each cook grabs the next job when free. No matter how many jobs, only N cooks work at once.

```
Jobs ──► [──── Job Channel ────]
               │       │       │
            Cook 1  Cook 2  Cook 3   ← fixed N workers
               │       │       │
         [── Results Channel ──]
```

```go
func worker(id int, jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
    defer wg.Done()
    for job := range jobs { // blocks until job arrives; exits when jobs closed
        results <- Result{JobID: job.ID, Output: job.Input * job.Input}
    }
}

func main() {
    const numWorkers, numJobs = 3, 9

    jobs    := make(chan Job,    numJobs)
    results := make(chan Result, numJobs)
    var wg sync.WaitGroup

    // Start fixed pool
    for w := 1; w <= numWorkers; w++ {
        wg.Add(1)
        go worker(w, jobs, results, &wg)
    }

    // Send all jobs then close (signals workers to stop when queue empty)
    for j := 1; j <= numJobs; j++ {
        jobs <- Job{ID: j, Input: j}
    }
    close(jobs)

    // Close results once all workers are done
    go func() { wg.Wait(); close(results) }()

    // Collect results
    for r := range results {
        fmt.Printf("Job %d → %d\n", r.JobID, r.Output)
    }
}
```

**Tune worker count:**
- CPU-bound work → `numWorkers = runtime.NumCPU()`
- I/O-bound work → `numWorkers = runtime.NumCPU() * 10` (threads spend most time waiting)

---

## 7. Fan-Out / Fan-In Pattern

**Think:** Fan-Out = one order to many cooks (parallelize). Fan-In = merge all results from many cooks into one pass to the customer.

```
           ┌─► Worker 1 ─┐
Input ─────├─► Worker 2 ─┼───► Merged Output
           └─► Worker 3 ─┘
```

> Results arrive **unordered** — workers finish at different speeds.

```go
// Fan-In: merge multiple channels into one
func fanIn(inputs ...<-chan int) <-chan int {
    merged := make(chan int)
    var wg sync.WaitGroup

    wg.Add(len(inputs))
    for _, ch := range inputs {
        go func(c <-chan int) {
            defer wg.Done()
            for val := range c { merged <- val }
        }(ch)
    }

    go func() { wg.Wait(); close(merged) }()
    return merged
}

func main() {
    in := gen(2, 3, 4, 5, 6)

    // Fan-out: 3 workers read from the same input channel
    c1 := square(in)
    c2 := square(in)
    c3 := square(in)

    // Fan-in: merge all into one stream
    for result := range fanIn(c1, c2, c3) {
        fmt.Println(result) // unordered: 4, 25, 9, 36, 16...
    }
}
```

---

## 8. Cancellation

### The Problem

When you stop consuming early, upstream goroutines block forever trying to send → **goroutine leak** (goroutines are never garbage collected).

### Solution 1 — Done Channel (basic)

Close a shared `done` channel to broadcast "stop" to all goroutines at once.

```go
// Closing a channel unblocks ALL receivers immediately with zero value.
// This is how one signal reaches any number of goroutines.

done := make(chan struct{})
defer close(done) // cancel everything when main returns

// In every stage: check done when sending
select {
case out <- result:
case <-done:
    return
}
```

### Solution 2 — context.Context (modern, idiomatic)

`context` is the standard replacement. Same broadcast cancel + adds deadlines and values.

```go
ctx, cancel := context.WithCancel(context.Background())
defer cancel() // always defer — same as defer close(done)

// With timeout:
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

// In stages: select on ctx.Done()
select {
case out <- n * n:
case <-ctx.Done():
    return
}
```

> **Rule:** Always `defer cancel()` immediately after creating a context — even if you also cancel it explicitly. Prevents context leak on early returns.

---

## 9. Common Pitfalls

### Goroutine Leak

```go
// LEAK — nothing ever sends, goroutine blocked forever
ch := make(chan int)
go func() {
    val := <-ch // stuck here
    fmt.Println(val)
}()

// FIX — use context
go func() {
    select {
    case val := <-ch:
        fmt.Println(val)
    case <-ctx.Done():
        return
    }
}()
```

Detect: `runtime.NumGoroutine()` — should not grow without bound.

### Deadlock

```go
// DEADLOCK — sending in main, no goroutine to receive
ch := make(chan int)
ch <- 1   // blocks forever
<-ch

// FIX — use goroutine or buffered channel
ch := make(chan int, 1)
ch <- 1   // no block (buffered)
```

### Race Condition

```go
// RACE — multiple goroutines writing shared variable
count := 0
for i := 0; i < 1000; i++ {
    go func() { count++ }() // data race!
}

// FIX 1 — atomic (simplest for counters)
var count int64
atomic.AddInt64(&count, 1)

// FIX 2 — mutex (for complex state)
mu.Lock(); count++; mu.Unlock()
```

Run `go run -race main.go` to detect races.

### WaitGroup.Add Inside Goroutine

```go
// WRONG — Add might run AFTER Wait()
go func() {
    wg.Add(1)       // race condition!
    defer wg.Done()
}()
wg.Wait()

// CORRECT — Add before starting goroutine
wg.Add(1)
go func() { defer wg.Done() }()
wg.Wait()
```

### Sending to Closed Channel → Panic

```go
close(ch)
ch <- 1   // PANIC: send on closed channel

// Rule: only the producer (sender) closes
```

### Copying a Mutex → Undefined Behavior

```go
// WRONG — copies the lock state
func process(c Counter) { c.mu.Lock() }

// CORRECT — pointer receiver
func process(c *Counter) { c.mu.Lock() }
```

---

## 10. Quick Cheat Sheet

```
GOROUTINES
  Start             go func() { }()
  Wait for many     var wg sync.WaitGroup → wg.Add(1) → wg.Done() → wg.Wait()
  Stop cleanly      ctx.Cancel() or close(doneCh)
  Closure bug       pass loop var as argument: go func(n int){ }(i)

CHANNELS
  Unbuffered        make(chan T)        — sync handoff, both block
  Buffered          make(chan T, n)     — async up to n
  Send              ch <- val          — blocks if full
  Receive           val := <-ch        — blocks if empty
  Non-blocking      select { case...: ... default: }
  Close             close(ch)          — sender only!
  Range             for v := range ch  — stops on close+empty
  Check closed      v, ok := <-ch      — ok=false when closed+empty
  Send-only type    chan<- T
  Recv-only type    <-chan T

SYNC PRIMITIVES
  WaitGroup         wg.Add(1) → go → defer wg.Done() → wg.Wait()
  Mutex             mu.Lock() / defer mu.Unlock()
  RWMutex           mu.RLock/RUnlock (readers) | mu.Lock/Unlock (writer)
  Once              once.Do(fn) — runs exactly once, ever
  Atomic            atomic.AddInt64(&n, 1)
  Semaphore         make(chan struct{}, n) — acquire: ch<-struct{}{}, release: <-ch

PATTERNS
  Pipeline          gen() → stage1() → stage2() → sink  (each: take chan, return chan)
  Worker Pool       N goroutines ranging over jobs chan; close(jobs) to stop
  Fan-Out           1 input chan → N workers all reading from it
  Fan-In            N chans → merge goroutine → 1 output chan
  Timeout           select { case <-ch: ... case <-time.After(d): }
  Cancellation      defer cancel() or defer close(done)

DEBUGGING
  Race detector     go run -race main.go
  Goroutine count   runtime.NumGoroutine()
  CPU count         runtime.NumCPU()
```

---

## Golden Rules

1. **Share memory by communicating** — pass data through channels, not shared variables (Rob Pike)
2. **Know how every goroutine will stop** — always have an exit path
3. **Only the sender closes a channel** — never the receiver
4. **`wg.Add` before the goroutine starts** — never inside it
5. **Always `defer cancel()`** after `WithCancel` / `WithTimeout`
6. **Never copy a Mutex** — use pointer receivers
7. **Run `-race` during development and in CI**
8. **Prefer channels for coordination, mutexes for protecting state**
9. **CPU-bound: workers = NumCPU | I/O-bound: workers = NumCPU × N**
10. **A goroutine that can't exit is a leak** — always provide a done/cancel path
