# Goroutines, Channels & Concurrency Patterns in Go

> Combined from:
> - [Concurrency in Go — A Deep Dive](https://medium.com/hprog99/concurrency-in-go-a-deep-dive-2abbb4838984)
> - [Goroutines and Channels: Concurrency Patterns in Go](https://dev.to/trapajim/goroutines-and-channels-concurrency-patterns-in-go-1dia)
> - [Goroutines and Channels — A Beginner's Guide](https://medium.com/@ashutosh7379947493/goroutines-and-channels-in-go-a-beginners-guide-a8acac799212)
> - [Go Concurrency Patterns: Worker Pool, Fan-In, Fan-Out, Pipeline](https://medium.com/@serifcolakel/go-concurrency-patterns-worker-pool-fan-in-fan-out-pipeline-e8ebfeb1373b)
> - [Go Blog: Pipelines and Cancellation](https://go.dev/blog/pipelines)

---

## Table of Contents

1. [Concurrency vs Parallelism](#1-concurrency-vs-parallelism)
2. [Goroutines](#2-goroutines)
3. [Channels](#3-channels)
4. [Synchronization Primitives](#4-synchronization-primitives)
5. [Pipeline Pattern](#5-pipeline-pattern)
6. [Worker Pool Pattern](#6-worker-pool-pattern)
7. [Fan-Out / Fan-In Pattern](#7-fan-out--fan-in-pattern)
8. [Cancellation — The Done Channel](#8-cancellation--the-done-channel)
9. [Real-World Example: Parallel MD5 Digestion](#9-real-world-example-parallel-md5-digestion)
10. [Common Mistakes & Pitfalls](#10-common-mistakes--pitfalls)
11. [Best Practices](#11-best-practices)
12. [Quick Reference Cheatsheet](#12-quick-reference-cheatsheet)

---

## 1. Concurrency vs Parallelism

These two words are often confused. Go handles both, but they are different ideas.

| | Concurrency | Parallelism |
|---|---|---|
| Meaning | Multiple tasks **in progress** at overlapping times | Multiple tasks running **at the same instant** |
| Requires | Just scheduling/switching | Multiple CPU cores |
| Go support | Always (goroutines) | Yes, via `GOMAXPROCS` |

**Analogy:**
- A chef who stirs soup, then chops vegetables while water boils = **concurrent** (one person, multiple tasks in progress)
- Two chefs each cooking a separate dish at the same time = **parallel**

Go's runtime scheduler maps goroutines onto OS threads and can exploit multiple CPU cores when `GOMAXPROCS > 1` (default = number of CPU cores).

```go
import "runtime"

runtime.GOMAXPROCS(4)               // use 4 OS threads
fmt.Println(runtime.NumCPU())       // number of CPU cores
fmt.Println(runtime.NumGoroutine()) // currently running goroutines
```

---

## 2. Goroutines

### What is a Goroutine?

A goroutine is a **lightweight thread of execution** managed entirely by the Go runtime — not the OS. You launch one by putting the `go` keyword before any function call.

**Restaurant analogy:** Instead of finishing one dish completely before starting the next (sequential), a chef works on multiple dishes simultaneously — stirring, chopping, boiling all at once. That is how goroutines work.

```go
func hello() {
    fmt.Println("Hello from goroutine!")
}

func main() {
    go hello()                    // launches goroutine, doesn't block
    fmt.Println("main continues") // runs immediately
    time.Sleep(time.Second)       // give goroutine time to run
}
```

### Goroutines vs OS Threads

| | OS Thread | Goroutine |
|---|---|---|
| Stack size | ~1–2 MB (fixed) | ~2 KB (grows dynamically up to 1 GB) |
| Creation cost | Milliseconds | Microseconds |
| How many | Thousands max | Millions easily |
| Managed by | OS kernel | Go runtime |
| Context switch | Expensive (kernel mode) | Cheap (user space) |

### The M:N Scheduling Model

Go uses an **M:N scheduler** — M goroutines mapped onto N OS threads.

```
Goroutines (G):   G1  G2  G3  G4  G5  G6  G7  G8  ...millions
                   │   │   │   │   │   │   │   │
Processors (P):   [P1 run queue]   [P2 run queue]   [P3 run queue]
                       │                │                 │
OS Threads (M):        M1               M2                M3
                       │                │                 │
CPU Cores:          Core 1           Core 2            Core 3
```

- **G** = Goroutine (unit of work)
- **M** = Machine (OS thread)
- **P** = Processor (logical CPU, holds run queue)

When a goroutine blocks on I/O or a channel, the runtime parks it and moves another goroutine onto that OS thread — keeping CPUs busy.

### Goroutine Lifecycle

```
go func()  →  Runnable  →  Running  →  Blocked (I/O / channel / sleep)
                ↑                              │
                └──────────── Runnable ←───────┘
                                                       → Dead (function returned)
```

### Key Behavior

Once `go` is placed before a function call, **the main goroutine does not wait**. If `main()` returns, all goroutines are immediately killed — even if they have not finished.

```go
func main() {
    go fmt.Println("I might not print!")
    // main exits → goroutine killed before it runs
}

// Fix: synchronize with WaitGroup or channel
func main() {
    var wg sync.WaitGroup
    wg.Add(1)
    go func() {
        defer wg.Done()
        fmt.Println("I will definitely print!")
    }()
    wg.Wait()
}
```

### Closure Variable Capture Bug

A very common goroutine mistake:

```go
// WRONG — all goroutines share the same 'i'
for i := 0; i < 5; i++ {
    go func() {
        fmt.Println(i) // prints 5, 5, 5, 5, 5
    }()
}

// CORRECT — pass as argument (makes a copy)
for i := 0; i < 5; i++ {
    go func(n int) {
        fmt.Println(n) // prints 0, 1, 2, 3, 4 (any order)
    }(i)
}

// CORRECT — shadow the variable
for i := 0; i < 5; i++ {
    i := i // new variable per iteration
    go func() {
        fmt.Println(i)
    }()
}
```

---

## 3. Channels

### What is a Channel?

A channel is a **typed communication pipe** between goroutines. It provides both data transfer and synchronization in one.

**Factory analogy:** Two workers (painter and builder) use a conveyor belt to exchange materials — channels work the same way, letting goroutines pass values safely.

```
Goroutine A  ──── ch <- value ────►  Channel  ────► value := <-ch ──── Goroutine B
```

```go
c := make(chan int)    // create a channel of type int
c <- 42               // SEND: blocks until receiver is ready
x := <-c              // RECEIVE: blocks until sender is ready
```

**Critical feature:** Sending and receiving on a channel is **blocking by default** — each operation waits until the other side is ready. This is the synchronization guarantee.

### Unbuffered Channel — Synchronous

Both sender and receiver must be ready at the same instant. Think of it as a direct handoff.

```
Sender:   ──────[BLOCKS]──────── handoff ─────────►
Receiver: ───────────────────────[BLOCKS]──── receives
```

```go
ch := make(chan string) // unbuffered

go func() {
    fmt.Println("Sending...")
    ch <- "hello"          // blocks until receiver is ready
    fmt.Println("Sent!")
}()

time.Sleep(time.Second)
msg := <-ch                // now sender unblocks
fmt.Println("Received:", msg)

// Output:
// Sending...
// (1 second pause)
// Received: hello
// Sent!
```

### Buffered Channel — Asynchronous up to Capacity

Send does not block until the buffer is full. Receive does not block until the buffer is empty.

```
Buffer capacity = 3:

Send 1 → [v1|  |  ]  no block
Send 2 → [v1|v2|  ]  no block
Send 3 → [v1|v2|v3]  no block
Send 4 → [v1|v2|v3]  BLOCKS — buffer full

Recv   → [v2|v3|  ]  unblocks the sender
```

```go
ch := make(chan int, 3)

ch <- 1   // no block
ch <- 2   // no block
ch <- 3   // no block
// ch <- 4  // would block — buffer full

fmt.Println(<-ch) // 1
fmt.Println(<-ch) // 2
fmt.Println(<-ch) // 3
```

### Using Channels for Synchronization

A channel can replace `time.Sleep` to wait for a goroutine:

```go
func main() {
    c := make(chan bool)

    go func(c chan bool) {
        fmt.Println("Hello, world!")
        time.Sleep(2 * time.Second)
        fmt.Println("Hello, again!")
        c <- true // signal: done
    }(c)

    fmt.Println("main: waiting...")
    <-c // blocks until goroutine sends
    fmt.Println("main: goroutine finished")
}
```

### Closing a Channel

```go
ch := make(chan int, 3)
ch <- 1
ch <- 2
close(ch) // signal: no more values coming

// Range stops automatically when channel is closed + empty
for v := range ch {
    fmt.Println(v) // 1, 2
}

// Two-value receive to detect close
v, ok := <-ch
fmt.Println(v, ok) // 0 false  (closed and empty)
```

**Rules for closing:**
- Only the **sender** closes — never the receiver
- Sending to a closed channel **panics**
- Receiving from a closed, empty channel returns zero value + `false`

### Directional Channels — Type Safety in Function Signatures

```go
func producer(ch chan<- int) {  // send-only
    ch <- 42
    // <-ch  // compile error!
}

func consumer(ch <-chan int) {  // receive-only
    val := <-ch
    // ch <- 1  // compile error!
    fmt.Println(val)
}

func main() {
    ch := make(chan int, 1)
    producer(ch) // bidirectional auto-converts
    consumer(ch)
}
```

### Select — Wait on Multiple Channels

`select` is like a `switch` but for channels. It unblocks on whichever case is ready first.

```go
ch1 := make(chan string, 1)
ch2 := make(chan string, 1)

go func() { time.Sleep(1 * time.Second); ch1 <- "one" }()
go func() { time.Sleep(2 * time.Second); ch2 <- "two" }()

for i := 0; i < 2; i++ {
    select {
    case msg := <-ch1:
        fmt.Println("ch1:", msg)
    case msg := <-ch2:
        fmt.Println("ch2:", msg)
    }
}
// After ~1s: ch1: one
// After ~2s: ch2: two
```

**If multiple cases are ready — Go selects one randomly (fair).**

```go
// Non-blocking receive
select {
case val := <-ch:
    fmt.Println("got:", val)
default:
    fmt.Println("nothing ready, moving on")
}

// Timeout
select {
case result := <-workCh:
    fmt.Println("result:", result)
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

### sync.WaitGroup

Coordinate completion of multiple goroutines.

```go
var wg sync.WaitGroup

for i := 1; i <= 5; i++ {
    wg.Add(1)               // BEFORE starting goroutine
    go func(id int) {
        defer wg.Done()     // called when goroutine exits
        fmt.Printf("Worker %d done\n", id)
    }(i)
}

wg.Wait() // blocks until all workers call Done()
fmt.Println("All done")
```

**Rules:**
- `Add(n)` must be called **before** the goroutine starts
- `Done()` must be called **exactly once** per goroutine (use `defer`)
- Never copy a WaitGroup (always pass by pointer)

### sync.Mutex

Exclusive lock for protecting shared state.

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

func (c *SafeCounter) Value() int {
    c.mu.Lock()
    defer c.mu.Unlock()
    return c.count
}
```

### sync.RWMutex

Multiple concurrent readers, one exclusive writer.

```go
type Cache struct {
    mu   sync.RWMutex
    data map[string]string
}

func (c *Cache) Get(key string) (string, bool) {
    c.mu.RLock()         // many goroutines can hold RLock simultaneously
    defer c.mu.RUnlock()
    v, ok := c.data[key]
    return v, ok
}

func (c *Cache) Set(key, value string) {
    c.mu.Lock()          // exclusive — blocks all readers and writers
    defer c.mu.Unlock()
    c.data[key] = value
}
```

### sync.Once

Guarantees a function runs exactly once, even across concurrent callers.

```go
var (
    instance *DB
    once     sync.Once
)

func GetDB() *DB {
    once.Do(func() {
        fmt.Println("Connecting to DB...") // runs exactly once
        instance = &DB{}
    })
    return instance
}
```

### Semaphore via Buffered Channel

A buffered channel of capacity `n` acts as a semaphore — limits concurrent goroutines to `n`.

```go
semaphore := make(chan struct{}, 3) // max 3 concurrent

for _, file := range files {
    wg.Add(1)
    go func(f File) {
        defer wg.Done()
        semaphore <- struct{}{} // acquire (blocks if 3 already running)
        defer func() { <-semaphore }() // release
        processFile(f)
    }(file)
}
wg.Wait()
```

### sync/atomic — Lock-Free Operations

Fastest option for simple counters and flags.

```go
import "sync/atomic"

var counter int64

atomic.AddInt64(&counter, 1)                             // increment
val := atomic.LoadInt64(&counter)                        // safe read
atomic.StoreInt64(&counter, 0)                           // safe write
swapped := atomic.CompareAndSwapInt64(&counter, 100, 0)  // CAS
```

---

## 5. Pipeline Pattern

### What is a Pipeline?

A pipeline is a series of **stages** connected by channels where:
- Each stage is a group of goroutines running the same function
- Each stage **receives** from an inbound channel, **transforms** the data, **sends** to an outbound channel
- The first stage (source) only produces; the last stage (sink) only consumes

```
[Source] ──ch──► [Stage 1] ──ch──► [Stage 2] ──ch──► [Stage 3] ──ch──► [Sink]
  gen()            filter()           square()           print()
```

**Benefits:**
- Each stage is independent and testable
- Stages run concurrently — natural parallelism
- Data flows clearly through a defined path
- Composable — stages can be reused and combined

### Basic Pipeline: Squaring Numbers

```go
// Stage 1 — Source: generate numbers
func gen(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out) // always close when done sending
        for _, n := range nums {
            out <- n
        }
    }()
    return out
}

// Stage 2 — Transform: square each number
func sq(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in { // range stops when 'in' is closed
            out <- n * n
        }
    }()
    return out
}

// Stage 3 — Sink: print results
func main() {
    // Connect stages
    nums    := gen(2, 3, 4, 5)
    squared := sq(nums)

    for n := range squared {
        fmt.Println(n) // 4, 9, 16, 25
    }
}
```

### Composing Stages

Because each stage takes and returns `<-chan int`, you can compose them freely:

```go
// Apply sq twice
for n := range sq(sq(gen(2, 3))) {
    fmt.Println(n) // 2²=4 → 4²=16,  3²=9 → 9²=81
}
```

### Multi-Stage Pipeline with Filtering

```go
// Filter: only pass even numbers
func filterEven(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            if n%2 == 0 {
                out <- n
            }
        }
    }()
    return out
}

// Add: add 10 to each number
func add(n int) func(<-chan int) <-chan int {
    return func(in <-chan int) <-chan int {
        out := make(chan int)
        go func() {
            defer close(out)
            for v := range in {
                out <- v + n
            }
        }()
        return out
    }
}

func main() {
    // Pipeline: gen → sq → filterEven → add(10) → print
    result := add(10)(filterEven(sq(gen(1, 2, 3, 4, 5))))
    for v := range result {
        fmt.Println(v) // (4+10)=14, (16+10)=26
    }
}
```

### Pipeline Construction Rules

1. **Stages close their outbound channels** when all sends are done
2. **Stages keep receiving** from inbound until closed or cancelled
3. **Always use `defer close(out)`** at the top of the goroutine
4. **Never close a channel from the receiver** — only from the sender

---

## 6. Worker Pool Pattern

### What is a Worker Pool?

Instead of launching one goroutine per task (unbounded), a worker pool uses a **fixed number of goroutines** (workers) that pull from a shared job queue.

```
Jobs ──► [───── Job Channel ─────]
              │         │         │
           Worker 1  Worker 2  Worker 3   ← fixed N workers
              │         │         │
         [─── Results Channel ───]
```

**Benefits:**
- Bounded resource consumption (memory, CPU, DB connections)
- Predictable behavior under heavy load
- Easy to tune by adjusting `numWorkers`

### Full Worker Pool Implementation

```go
package main

import (
    "fmt"
    "sync"
)

type Job struct {
    ID    int
    Input int
}

type Result struct {
    JobID  int
    Output int
    Error  error
}

func worker(id int, jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
    defer wg.Done()
    for job := range jobs { // keeps receiving until jobs channel is closed
        fmt.Printf("Worker %d: processing job %d\n", id, job.ID)
        output := job.Input * job.Input // do the actual work
        results <- Result{JobID: job.ID, Output: output}
    }
    fmt.Printf("Worker %d: done\n", id)
}

func main() {
    const numWorkers = 3
    const numJobs    = 9

    jobs    := make(chan Job,    numJobs)
    results := make(chan Result, numJobs)

    // Start fixed pool of workers
    var wg sync.WaitGroup
    for w := 1; w <= numWorkers; w++ {
        wg.Add(1)
        go worker(w, jobs, results, &wg)
    }

    // Send all jobs
    for j := 1; j <= numJobs; j++ {
        jobs <- Job{ID: j, Input: j}
    }
    close(jobs) // signal workers: no more jobs coming

    // Close results when all workers finish
    go func() {
        wg.Wait()
        close(results)
    }()

    // Collect all results
    for r := range results {
        fmt.Printf("Job %d → result: %d\n", r.JobID, r.Output)
    }

    fmt.Println("All jobs completed!")
}
```

### Worker Pool with Context (Graceful Cancellation)

```go
func workerWithCtx(ctx context.Context, id int, jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
    defer wg.Done()
    for {
        select {
        case job, ok := <-jobs:
            if !ok {
                return // channel closed
            }
            select {
            case results <- Result{JobID: job.ID, Output: job.Input * 2}:
            case <-ctx.Done():
                return
            }
        case <-ctx.Done():
            fmt.Printf("Worker %d cancelled\n", id)
            return
        }
    }
}
```

### Worker Pool with Error Handling

```go
func worker(id int, jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
    defer wg.Done()
    for job := range jobs {
        // Panic recovery per worker
        func() {
            defer func() {
                if r := recover(); r != nil {
                    results <- Result{JobID: job.ID, Error: fmt.Errorf("panic: %v", r)}
                }
            }()

            output, err := doWork(job)
            results <- Result{JobID: job.ID, Output: output, Error: err}
        }()
    }
}
```

### Key Considerations

| Consideration | Detail |
|---|---|
| Buffer size | Buffer jobs channel to handle load spikes |
| Close jobs once | Close jobs channel exactly once — from the sender |
| WaitGroup usage | Add before goroutine, Done inside goroutine with defer |
| Panic recovery | Add `recover()` inside workers for production code |
| Worker count | Tune based on workload (CPU-bound: = GOMAXPROCS, I/O-bound: higher) |

---

## 7. Fan-Out / Fan-In Pattern

### Concepts

```
Fan-Out: one input channel → multiple workers (distribute work)
Fan-In:  multiple channels → one output channel (merge results)

           ┌─► Worker 1 ─┐
Input ─────├─► Worker 2 ─┼───► Merged Output
           └─► Worker 3 ─┘
```

- **Fan-Out** distributes a single input channel across multiple goroutines for parallel processing
- **Fan-In** merges multiple result channels into one stream for easy consumption
- Results arrive **unordered** — goroutines finish at different times

### Fan-Out Implementation

Multiple goroutines all read from the same input channel simultaneously:

```go
func fanOut(input <-chan int, numWorkers int) []<-chan int {
    outputs := make([]<-chan int, numWorkers)

    for i := 0; i < numWorkers; i++ {
        out := make(chan int)
        outputs[i] = out

        go func(ch chan<- int) {
            defer close(ch)
            for n := range input { // all workers compete for same input
                ch <- n * n         // each does some work
            }
        }(out)
    }

    return outputs
}
```

### Fan-In Implementation (merge)

Merge multiple channels into a single output using WaitGroup:

```go
func fanIn(inputs ...<-chan int) <-chan int {
    merged := make(chan int)
    var wg sync.WaitGroup

    // Start a forwarding goroutine for each input
    forward := func(ch <-chan int) {
        defer wg.Done()
        for val := range ch {
            merged <- val
        }
    }

    wg.Add(len(inputs))
    for _, ch := range inputs {
        go forward(ch)
    }

    // Close merged once all inputs are drained
    go func() {
        wg.Wait()
        close(merged)
    }()

    return merged
}
```

### Complete Fan-Out / Fan-In Example

```go
func generate(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            out <- n
        }
    }()
    return out
}

func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            out <- n * n
        }
    }()
    return out
}

func main() {
    in := generate(2, 3, 4, 5, 6, 7, 8, 9)

    // Fan-out: distribute across 3 workers
    c1 := square(in)
    c2 := square(in)
    c3 := square(in)

    // Fan-in: merge all results
    for result := range fanIn(c1, c2, c3) {
        fmt.Println(result) // 4, 9, 16, 25 ... (unordered)
    }
}
```

### Fan-Out / Fan-In with the Official go.dev Pattern

From the official Go blog — using `merge` with variadic channels:

```go
func merge(cs ...<-chan int) <-chan int {
    var wg sync.WaitGroup
    out := make(chan int)

    output := func(c <-chan int) {
        for n := range c {
            out <- n
        }
        wg.Done()
    }

    wg.Add(len(cs))
    for _, c := range cs {
        go output(c)
    }

    go func() {
        wg.Wait()
        close(out)
    }()
    return out
}

func main() {
    in := gen(2, 3)

    // Fan-out to 2 workers
    c1 := sq(in)
    c2 := sq(in)

    // Fan-in merged results
    for n := range merge(c1, c2) {
        fmt.Println(n) // 4 then 9, or 9 then 4
    }
}
```

### Important Tradeoffs

| Aspect | Detail |
|---|---|
| Order | Results are **unordered** — workers finish at different speeds |
| Channel overhead | Each channel adds latency and memory |
| Bottlenecks | Slower stages starve faster ones |
| Cancellation | Without a done channel, early exit leaks goroutines |

---

## 8. Cancellation — The Done Channel

### The Problem

When a downstream stage stops consuming early, upstream goroutines block trying to send — **goroutine leak**.

```go
out := merge(c1, c2)
fmt.Println(<-out) // take only first result
return
// PROBLEM: second goroutine in merge is now stuck trying to send!
// Goroutines are not garbage collected — they consume memory forever.
```

### Solution: Closing a Done Channel

Close a shared `done` channel to **broadcast cancellation** to all goroutines simultaneously.

```go
// Receiving on a CLOSED channel always proceeds immediately with zero value.
// This is how one signal unblocks any number of goroutines.
```

```go
func main() {
    done := make(chan struct{})
    defer close(done) // cancels everything on any return path

    in := gen(done, 2, 3)
    c1 := sq(done, in)
    c2 := sq(done, in)

    out := merge(done, c1, c2)
    fmt.Println(<-out) // take only first value

    // defer close(done) fires here → all goroutines unblock and exit
}
```

### Modified Stage Functions with Done Channel

Every stage must check `done` when sending:

```go
// Modified sq — cancellable
func sq(done <-chan struct{}, in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            select {
            case out <- n * n: // send normally
            case <-done:       // or exit if cancelled
                return
            }
        }
    }()
    return out
}

// Modified gen — cancellable
func gen(done <-chan struct{}, nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            select {
            case out <- n:
            case <-done:
                return
            }
        }
    }()
    return out
}

// Modified merge — cancellable
func merge(done <-chan struct{}, cs ...<-chan int) <-chan int {
    var wg sync.WaitGroup
    out := make(chan int)

    output := func(c <-chan int) {
        defer wg.Done()
        for n := range c {
            select {
            case out <- n:
            case <-done:
                return
            }
        }
    }

    wg.Add(len(cs))
    for _, c := range cs {
        go output(c)
    }

    go func() {
        wg.Wait()
        close(out)
    }()
    return out
}
```

### Modern Approach: context.Context

The `context` package is the modern, idiomatic replacement for the raw `done` channel. It provides the same broadcast cancellation plus deadlines, timeouts, and values.

```go
ctx, cancel := context.WithCancel(context.Background())
defer cancel() // same as defer close(done)

func sqWithCtx(ctx context.Context, in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            select {
            case out <- n * n:
            case <-ctx.Done(): // cancel signal
                return
            }
        }
    }()
    return out
}
```

---

## 9. Real-World Example: Parallel MD5 Digestion

This example from the official Go blog shows all patterns combined: pipeline + fan-out + cancellation.

### Stage 1: Walk files (producer)

```go
type result struct {
    path string
    sum  [md5.Size]byte
    err  error
}

func walkFiles(done <-chan struct{}, root string) (<-chan string, <-chan error) {
    paths := make(chan string)
    errc  := make(chan error, 1)

    go func() {
        defer close(paths)
        errc <- filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
            if err != nil { return err }
            if !info.Mode().IsRegular() { return nil }
            select {
            case paths <- path:
            case <-done:
                return errors.New("walk cancelled")
            }
            return nil
        })
    }()
    return paths, errc
}
```

### Stage 2: Digest files (workers — fan-out)

```go
func digester(done <-chan struct{}, paths <-chan string, c chan<- result) {
    for path := range paths {
        data, err := os.ReadFile(path)
        select {
        case c <- result{path, md5.Sum(data), err}:
        case <-done:
            return
        }
    }
}
```

### Stage 3: Collect results (fan-in / sink)

```go
func MD5All(root string) (map[string][md5.Size]byte, error) {
    done := make(chan struct{})
    defer close(done)

    paths, errc := walkFiles(done, root)

    // Fan-out: 20 digesters reading from same paths channel
    c := make(chan result)
    var wg sync.WaitGroup
    const numDigesters = 20

    wg.Add(numDigesters)
    for i := 0; i < numDigesters; i++ {
        go func() {
            defer wg.Done()
            digester(done, paths, c)
        }()
    }

    // Close c when all digesters finish
    go func() {
        wg.Wait()
        close(c)
    }()

    // Collect results (fan-in via range)
    m := make(map[string][md5.Size]byte)
    for r := range c {
        if r.err != nil {
            return nil, r.err
        }
        m[r.path] = r.sum
    }

    if err := <-errc; err != nil {
        return nil, err
    }
    return m, nil
}
```

**What this demonstrates:**
- `walkFiles` → producer / source stage
- `digester` × 20 → fan-out worker pool
- `range c` → fan-in / sink
- `done` channel → cancellation throughout

---

## 10. Common Mistakes & Pitfalls

### Goroutine Leak

```go
// LEAK — goroutine blocks forever
func leak() {
    ch := make(chan int)
    go func() {
        val := <-ch  // nothing ever sends here
        fmt.Println(val)
    }()
    // function returns, goroutine stuck
}

// FIX — use context or done channel
func noLeak(ctx context.Context) {
    ch := make(chan int, 1)
    go func() {
        select {
        case val := <-ch:
            fmt.Println(val)
        case <-ctx.Done():
            return
        }
    }()
}

// Detect leaks
fmt.Println(runtime.NumGoroutine()) // should not grow without bound
```

### Deadlock

```go
// DEADLOCK 1 — waiting on itself
ch := make(chan int)
ch <- 1    // blocks forever — no goroutine to receive
<-ch

// DEADLOCK 2 — circular wait
chA := make(chan int)
chB := make(chan int)
go func() { chA <- 1; <-chB }()
chB <- 2   // waits for chB receiver
<-chA      // deadlock

// FIX — use goroutines or buffered channels
ch := make(chan int, 1)
ch <- 1    // no block
<-ch
```

### Race Condition

```go
// RACE — unsynchronized shared state
count := 0
for i := 0; i < 1000; i++ {
    go func() { count++ }() // data race!
}
// result is random, not 1000

// FIX 1 — mutex
var mu sync.Mutex
go func() {
    mu.Lock()
    count++
    mu.Unlock()
}()

// FIX 2 — atomic
var count int64
go func() { atomic.AddInt64(&count, 1) }()

// FIX 3 — channel
counter := make(chan struct{}, 1)
```

Detect with: `go run -race main.go`

### Sending to a Closed Channel

```go
ch := make(chan int)
close(ch)
ch <- 1  // PANIC: send on closed channel

// Rule: only the producer (sender) closes the channel, never the consumer
```

### WaitGroup Misuse

```go
var wg sync.WaitGroup

// WRONG — Add inside goroutine (race)
for i := 0; i < 5; i++ {
    go func() {
        wg.Add(1)       // might run AFTER wg.Wait()!
        defer wg.Done()
    }()
}
wg.Wait()

// CORRECT — Add before starting goroutine
for i := 0; i < 5; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
    }()
}
wg.Wait()
```

### Copying a Mutex

```go
type Counter struct {
    mu    sync.Mutex
    count int
}

// WRONG — copies the mutex (undefined behavior)
func bad(c Counter) { c.mu.Lock() }

// CORRECT — pointer receiver
func good(c *Counter) { c.mu.Lock() }
```

---

## 11. Best Practices

### 1. Communicate by sharing, not share by communicating

```go
// AVOID — shared state with mutex
var count int
var mu sync.Mutex
go func() { mu.Lock(); count++; mu.Unlock() }()

// PREFER — pass data through channels
counter := make(chan int, 1)
counter <- 0
go func() {
    v := <-counter
    counter <- v + 1
}()
```

### 2. Always know how a goroutine will stop

```go
// EVERY goroutine should have a clear exit condition
go func() {
    for {
        select {
        case work := <-jobs:
            process(work)
        case <-ctx.Done(): // exit path
            return
        }
    }
}()
```

### 3. Use context for cancellation — pass it as the first argument

```go
// Idiomatic Go: ctx is always first
func fetchUser(ctx context.Context, id string) (*User, error) {
    req, _ := http.NewRequestWithContext(ctx, "GET", "/users/"+id, nil)
    // ...
}
```

### 4. Always defer cancel()

```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel() // ALWAYS — prevents context leak even if function returns early
```

### 5. Buffer channels to avoid unnecessary blocking

```go
// Buffered results channel prevents goroutine from blocking after work is done
results := make(chan Result, numWorkers)
```

### 6. Only the sender closes a channel

```go
func producer(ch chan<- int) {
    defer close(ch) // sender's responsibility
    for i := 0; i < 10; i++ {
        ch <- i
    }
}
```

### 7. Tune worker count by workload type

```go
// CPU-bound: workers = number of cores
numWorkers := runtime.NumCPU()

// I/O-bound: workers >> number of cores (threads spend most time waiting)
numWorkers := runtime.NumCPU() * 10
```

### 8. Use errgroup for concurrent error handling

```go
import "golang.org/x/sync/errgroup"

g, ctx := errgroup.WithContext(context.Background())

for _, url := range urls {
    url := url
    g.Go(func() error {
        return fetch(ctx, url)
    })
}

if err := g.Wait(); err != nil {
    log.Fatal(err)
}
```

---

## 12. Quick Reference Cheatsheet

```
╔══════════════════════════════════════════════════════════════════╗
║                    GOROUTINES                                    ║
╠═══════════════════╦══════════════════════════════════════════════╣
║ Start             ║ go func() { }()                              ║
║ Wait for many     ║ var wg sync.WaitGroup → wg.Wait()           ║
║ Stop cleanly      ║ ctx.Cancel() or close(doneCh)               ║
╠══════════════════════════════════════════════════════════════════╣
║                    CHANNELS                                      ║
╠═══════════════════╦══════════════════════════════════════════════╣
║ Unbuffered        ║ make(chan T)       — sync handoff            ║
║ Buffered          ║ make(chan T, n)    — async up to n           ║
║ Send              ║ ch <- val         — blocks if full           ║
║ Receive           ║ val := <-ch       — blocks if empty          ║
║ Non-blocking      ║ select { case: ... default: }               ║
║ Close             ║ close(ch)  — sender only!                   ║
║ Range             ║ for v := range ch — stops on close+empty    ║
║ Check closed      ║ v, ok := <-ch  — ok=false when closed+empty ║
╠══════════════════════════════════════════════════════════════════╣
║                    SYNC                                          ║
╠═══════════════════╦══════════════════════════════════════════════╣
║ Mutex             ║ mu.Lock() / mu.Unlock()                     ║
║ RWMutex           ║ mu.RLock() / mu.RUnlock() for reads         ║
║ WaitGroup         ║ wg.Add(1) → go → wg.Done() → wg.Wait()     ║
║ Once              ║ once.Do(fn) — runs exactly once              ║
║ Atomic            ║ atomic.AddInt64(&n, 1)                      ║
║ Semaphore         ║ make(chan struct{}, n)                       ║
╠══════════════════════════════════════════════════════════════════╣
║                    PATTERNS                                      ║
╠═══════════════════╦══════════════════════════════════════════════╣
║ Pipeline          ║ gen() → stage1() → stage2() → sink          ║
║ Worker Pool       ║ N goroutines reading from jobs channel       ║
║ Fan-Out           ║ 1 input channel → N workers                  ║
║ Fan-In            ║ N channels → merge → 1 output               ║
║ Timeout           ║ select { case <-ch: ... case <-time.After:} ║
║ Cancellation      ║ close(done) or ctx.Cancel()                 ║
║ Rate Limit        ║ time.Tick(rate) as token source             ║
╠══════════════════════════════════════════════════════════════════╣
║                    DEBUGGING                                     ║
╠═══════════════════╦══════════════════════════════════════════════╣
║ Race detector     ║ go run -race main.go                        ║
║ Goroutine count   ║ runtime.NumGoroutine()                      ║
║ pprof             ║ import _ "net/http/pprof"                   ║
║                   ║ go tool pprof :6060/debug/pprof/goroutine   ║
╚═══════════════════╩══════════════════════════════════════════════╝
```

---

## Golden Rules

1. **Do not communicate by sharing memory — share memory by communicating** (Rob Pike)
2. **Start a goroutine only when you know how it will stop**
3. **Only the sender closes a channel — never the receiver**
4. **Always `defer cancel()` after `WithCancel` / `WithTimeout`**
5. **Call `WaitGroup.Add` before starting the goroutine, not inside it**
6. **Never copy a mutex — always use pointer receivers**
7. **Run with `-race` during development and in CI**
8. **Prefer channels for coordination, mutexes for protecting state**
9. **Use `context` for cancellation across goroutine boundaries**
10. **Tune worker counts: CPU-bound = NumCPU, I/O-bound = NumCPU × N**
