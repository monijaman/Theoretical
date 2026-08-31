# Go Language — Complete Guide with Concurrency

---

## 1. What is Go?

Go (also called Golang) is a statically typed, compiled language designed at Google in 2007 by Robert Griesemer, Rob Pike, and Ken Thompson. It was built to fix pain points in large-scale software development — slow builds, complex dependency management, and poor concurrency support.

**Key traits:**
- Compiled to native machine code (fast)
- Garbage collected (no manual memory management)
- Statically typed (errors caught at compile time)
- Built-in concurrency (goroutines + channels)
- Simple syntax (25 keywords only)

---

### Common Go terms in simple words

| Term | Short description |
|---|---|
| Variable | A named place that stores a value. |
| Type | The kind of value a variable can hold, such as `int` or `string`. |
| Function | A reusable block of code that performs a task. |
| Array | A fixed-size, ordered collection of values of the same type. |
| Slice | A flexible, growable list backed by an array. |
| Map | A key-value collection, like a dictionary for fast lookups. |
| Struct | A custom type that groups related fields, such as a name and age. |
| Pointer | A value that stores the memory address of another value. |
| Method | A function attached to a type. |
| Interface | A set of method requirements that a type can satisfy. |
| Package | A group of related Go code that can be imported. |
| Error | A returned value explaining why an operation failed. |
| Goroutine | A lightweight concurrent task started with the `go` keyword. |
| Channel | A typed pipe used to send values between goroutines. |
| Mutex | A lock that protects shared data from simultaneous access. |
| Context | A value used for cancellation, deadlines, and request data. |

---

## 2. Basic Syntax

### Gin framework

[Learn Go Gin](./gin-framework.md) — build HTTP APIs with routes, handlers, JSON, middleware, validation, and tests.

### Hello World
```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
```

Every Go file starts with `package`. The `main` package + `main()` function is the entry point.

---

### Variables
```go
// Explicit type
var name string = "Alice"
var age  int    = 30

// Short declaration (inside functions only)
name := "Alice"
age  := 30

// Multiple
x, y := 10, 20

// Zero values (Go initializes everything)
var i int     // 0
var f float64 // 0.0
var b bool    // false
var s string  // ""
```

---

### Data Types
```go
bool
string
int, int8, int16, int32, int64
uint, uint8, uint16, uint32, uint64
float32, float64
complex64, complex128
byte   // alias for uint8
rune   // alias for int32 (Unicode code point)
```

---

### Functions
```go
// Basic
func add(a int, b int) int {
    return a + b
}

// Multiple return values (very common in Go)
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, fmt.Errorf("division by zero")
    }
    return a / b, nil
}

// Named return values
func minMax(nums []int) (min, max int) {
    min, max = nums[0], nums[0]
    for _, n := range nums {
        if n < min { min = n }
        if n > max { max = n }
    }
    return // "naked return" uses named values
}
```

---

### Control Flow
```go
// if-else (no parentheses needed)
if x > 10 {
    fmt.Println("big")
} else if x > 5 {
    fmt.Println("medium")
} else {
    fmt.Println("small")
}

// if with init statement
if err := doSomething(); err != nil {
    fmt.Println("error:", err)
}

// for loop (Go has only one loop keyword)
for i := 0; i < 5; i++ {
    fmt.Println(i)
}

// while-style
for x < 100 {
    x *= 2
}

// infinite loop
for {
    // break when needed
}

// range (iterates slices, maps, strings, channels)
nums := []int{1, 2, 3}
for index, value := range nums {
    fmt.Println(index, value)
}

// switch (no fallthrough by default)
switch day {
case "Mon", "Tue", "Wed", "Thu", "Fri":
    fmt.Println("Weekday")
case "Sat", "Sun":
    fmt.Println("Weekend")
default:
    fmt.Println("Unknown")
}
```

---

## 3. Composite Types

### Arrays (fixed size)

An array is an ordered list whose length cannot change after creation.
```go
var arr [5]int            // [0 0 0 0 0]
arr := [3]string{"a", "b", "c"}
arr := [...]int{1, 2, 3}  // compiler counts
```

### Slices (dynamic, most used)

A slice is a flexible list that can grow when you use `append`.
```go
s := []int{1, 2, 3}
s = append(s, 4, 5)
sub := s[1:3]         // [2, 3] — shares memory!

// make: length and capacity
s := make([]int, 3, 10) // len=3, cap=10

// copy
dst := make([]int, len(src))
copy(dst, src)
```

### Maps

A map stores values by key, such as `userID -> user`, for quick lookups.
```go
m := map[string]int{
    "alice": 90,
    "bob":   85,
}

m["charlie"] = 95        // set
score := m["alice"]      // get
delete(m, "bob")         // delete

// check existence
if val, ok := m["alice"]; ok {
    fmt.Println(val)
}

// make
m := make(map[string]int)
```

### Structs

A struct is a custom data shape that keeps related fields together.
```go
type Person struct {
    Name string
    Age  int
}

p := Person{Name: "Alice", Age: 30}
p.Name = "Bob"

// Anonymous struct
point := struct{ X, Y int }{X: 1, Y: 2}
```

---

## 4. Pointers
```go
x := 42
p := &x     // p holds the address of x
*p = 100    // dereference — changes x to 100

fmt.Println(x) // 100
```

Go has pointers but **no pointer arithmetic** — safer than C.

---

## 5. Methods and Interfaces

### Methods (functions on types)
```go
type Rectangle struct {
    Width, Height float64
}

// Value receiver
func (r Rectangle) Area() float64 {
    return r.Width * r.Height
}

// Pointer receiver (can modify the struct)
func (r *Rectangle) Scale(factor float64) {
    r.Width  *= factor
    r.Height *= factor
}
```

### Interfaces
```go
type Shape interface {
    Area()      float64
    Perimeter() float64
}

// Rectangle implicitly satisfies Shape if it has both methods
// No "implements" keyword needed

func printShape(s Shape) {
    fmt.Printf("Area: %.2f\n", s.Area())
}

// Empty interface — holds any value
var anything interface{} = 42
anything = "hello"
anything = struct{ X int }{X: 5}

// Type assertion
val, ok := anything.(string)
```

---

## 6. Error Handling

Go has no exceptions. Errors are values.

```go
func readFile(path string) ([]byte, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("readFile: %w", err)  // wrap error
    }
    return data, nil
}

// Usage
data, err := readFile("config.json")
if err != nil {
    log.Fatal(err)
}
```

The `%w` verb wraps errors so callers can unwrap them:
```go
errors.Is(err, os.ErrNotExist)  // check wrapped errors
errors.As(err, &myErrType)      // extract wrapped error type
```

---

## 7. Packages and Modules

```go
// File: math/calculator.go
package math

func Add(a, b int) int { return a + b }   // Exported (capital)
func helper() {}                           // Unexported (lowercase)

// Importing
import (
    "fmt"
    "math/rand"
    mymath "github.com/user/project/math"  // alias
    _ "github.com/lib/pq"                  // blank import (side effects only)
)
```

```bash
# Module commands
go mod init github.com/user/project
go get github.com/some/package@v1.2.3
go mod tidy     # remove unused dependencies
go build ./...
go test ./...
```

---

---

# Concurrency in Go

This is where Go truly shines. Go was designed from the ground up for concurrent programming.

---

## The Core Philosophy

> **"Do not communicate by sharing memory; instead, share memory by communicating."**
> — Rob Pike

Most languages share memory with locks. Go encourages passing data through channels instead.

---

## 8. Goroutines

A goroutine is a **lightweight thread** managed by the Go runtime, not the OS.

```go
func sayHello(name string) {
    fmt.Printf("Hello, %s!\n", name)
}

func main() {
    go sayHello("Alice")  // starts a goroutine
    go sayHello("Bob")
    go sayHello("Charlie")

    time.Sleep(time.Second)  // wait (we'll fix this properly below)
}
```

**Why goroutines are special:**
- OS threads: ~1-2 MB stack each
- Goroutines: ~2 KB initial stack, grows dynamically
- You can run **millions** of goroutines on a single machine
- The Go scheduler multiplexes goroutines onto OS threads (M:N scheduling)

---

## 9. WaitGroups — Waiting for Goroutines

Instead of `time.Sleep`, use `sync.WaitGroup`:

```go
import "sync"

func main() {
    var wg sync.WaitGroup

    names := []string{"Alice", "Bob", "Charlie"}

    for _, name := range names {
        wg.Add(1)                    // increment counter
        go func(n string) {
            defer wg.Done()          // decrement when done
            fmt.Printf("Hello, %s!\n", n)
        }(name)                      // pass name as argument (avoid closure bug)
    }

    wg.Wait()  // block until counter reaches 0
    fmt.Println("All done!")
}
```

**Common closure bug:**
```go
// WRONG — all goroutines capture the same 'name' variable
for _, name := range names {
    go func() {
        fmt.Println(name)  // might print "Charlie" 3 times
    }()
}

// CORRECT — pass as argument
for _, name := range names {
    go func(n string) {
        fmt.Println(n)
    }(name)
}
```

---

## 10. Channels

Channels are typed conduits for communication between goroutines.

```go
// Create
ch := make(chan int)       // unbuffered
ch := make(chan int, 5)    // buffered (capacity 5)

// Send and receive
ch <- 42      // send (blocks if unbuffered and no receiver)
val := <-ch   // receive (blocks until value available)

// Close
close(ch)

// Receive from closed channel
val, ok := <-ch  // ok = false when closed and empty
```

### Unbuffered Channel — Synchronous
```go
func producer(ch chan<- int) {  // send-only channel
    for i := 0; i < 5; i++ {
        fmt.Printf("Sending: %d\n", i)
        ch <- i  // blocks until receiver is ready
    }
    close(ch)
}

func consumer(ch <-chan int) {  // receive-only channel
    for val := range ch {       // range over channel until closed
        fmt.Printf("Received: %d\n", val)
    }
}

func main() {
    ch := make(chan int)
    go producer(ch)
    consumer(ch)
}
```

### Buffered Channel — Asynchronous up to capacity
```go
ch := make(chan string, 3)

ch <- "first"   // doesn't block
ch <- "second"  // doesn't block
ch <- "third"   // doesn't block
// ch <- "fourth" // BLOCKS — buffer full

fmt.Println(<-ch)  // "first"
fmt.Println(<-ch)  // "second"
fmt.Println(<-ch)  // "third"
```

---

## 11. Select — Multiplex Channels

`select` is like a `switch` but for channels. It picks whichever channel is ready.

```go
func main() {
    ch1 := make(chan string)
    ch2 := make(chan string)

    go func() {
        time.Sleep(1 * time.Second)
        ch1 <- "one"
    }()
    go func() {
        time.Sleep(2 * time.Second)
        ch2 <- "two"
    }()

    for i := 0; i < 2; i++ {
        select {
        case msg1 := <-ch1:
            fmt.Println("Received from ch1:", msg1)
        case msg2 := <-ch2:
            fmt.Println("Received from ch2:", msg2)
        }
    }
}
```

### Select with Default (non-blocking)
```go
select {
case val := <-ch:
    fmt.Println("Got:", val)
default:
    fmt.Println("No value ready, moving on")
}
```

### Select with Timeout
```go
select {
case result := <-doWork():
    fmt.Println("Result:", result)
case <-time.After(3 * time.Second):
    fmt.Println("Timed out!")
}
```

---

## 12. Mutex — Protecting Shared State

When goroutines share memory (maps, structs, counters), use a mutex:

```go
import "sync"

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

func main() {
    counter := &SafeCounter{}
    var wg sync.WaitGroup

    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            counter.Increment()
        }()
    }

    wg.Wait()
    fmt.Println(counter.Value())  // always 1000
}
```

### RWMutex — Multiple Readers, One Writer
```go
var rw sync.RWMutex

// Multiple goroutines can read simultaneously
rw.RLock()
defer rw.RUnlock()
// ... read data ...

// Only one goroutine can write at a time
rw.Lock()
defer rw.Unlock()
// ... write data ...
```

---

## 13. Common Concurrency Patterns

### Worker Pool
```go
func worker(id int, jobs <-chan int, results chan<- int, wg *sync.WaitGroup) {
    defer wg.Done()
    for job := range jobs {
        fmt.Printf("Worker %d processing job %d\n", id, job)
        results <- job * 2  // result
    }
}

func main() {
    jobs    := make(chan int, 100)
    results := make(chan int, 100)
    var wg sync.WaitGroup

    // Start 3 workers
    for w := 1; w <= 3; w++ {
        wg.Add(1)
        go worker(w, jobs, results, &wg)
    }

    // Send 9 jobs
    for j := 1; j <= 9; j++ {
        jobs <- j
    }
    close(jobs)  // signal workers no more jobs

    // Close results when all workers done
    go func() {
        wg.Wait()
        close(results)
    }()

    // Collect results
    for result := range results {
        fmt.Println("Result:", result)
    }
}
```

### Pipeline
```go
func generate(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        for _, n := range nums {
            out <- n
        }
        close(out)
    }()
    return out
}

func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            out <- n * n
        }
        close(out)
    }()
    return out
}

func main() {
    // Pipeline: generate → square → print
    for result := range square(generate(2, 3, 4, 5)) {
        fmt.Println(result)  // 4, 9, 16, 25
    }
}
```

### Fan-Out / Fan-In
```go
// Fan-out: distribute work across multiple goroutines
// Fan-in: merge multiple channels into one

func fanIn(channels ...<-chan int) <-chan int {
    merged := make(chan int)
    var wg sync.WaitGroup

    output := func(ch <-chan int) {
        defer wg.Done()
        for val := range ch {
            merged <- val
        }
    }

    wg.Add(len(channels))
    for _, ch := range channels {
        go output(ch)
    }

    go func() {
        wg.Wait()
        close(merged)
    }()

    return merged
}
```

---

## 14. Context — Cancellation and Deadlines

`context.Context` is how you cancel goroutines gracefully.

```go
import "context"

func doWork(ctx context.Context) {
    for {
        select {
        case <-ctx.Done():
            fmt.Println("Cancelled:", ctx.Err())
            return
        default:
            fmt.Println("Working...")
            time.Sleep(500 * time.Millisecond)
        }
    }
}

func main() {
    // Cancel manually
    ctx, cancel := context.WithCancel(context.Background())
    go doWork(ctx)
    time.Sleep(2 * time.Second)
    cancel()  // stops the goroutine
    time.Sleep(100 * time.Millisecond)

    // Cancel with timeout
    ctx2, cancel2 := context.WithTimeout(context.Background(), 3*time.Second)
    defer cancel2()
    go doWork(ctx2)
    time.Sleep(4 * time.Second)  // context cancels after 3s

    // Cancel with deadline
    deadline := time.Now().Add(5 * time.Second)
    ctx3, cancel3 := context.WithDeadline(context.Background(), deadline)
    defer cancel3()
}
```

---

## 15. sync/atomic — Lock-Free Operations

For simple counters, atomics are faster than mutexes:

```go
import "sync/atomic"

var counter int64

// Atomic increment (safe for concurrent use)
atomic.AddInt64(&counter, 1)

// Atomic load (safe read)
val := atomic.LoadInt64(&counter)

// Compare-and-swap
swapped := atomic.CompareAndSwapInt64(&counter, old, new)
```

---

## 16. Race Detector

Go has a built-in race detector — use it during development:

```bash
go run -race main.go
go test -race ./...
```

It catches concurrent reads/writes without proper synchronization.

---

## 17. Quick Comparison Table

| Concept | Purpose | When to Use |
|---|---|---|
| `goroutine` | Lightweight concurrent task | Any concurrent work |
| `channel` | Communication between goroutines | Pass data between goroutines |
| `sync.WaitGroup` | Wait for goroutines to finish | Batch concurrent tasks |
| `sync.Mutex` | Protect shared memory | Shared state (maps, structs) |
| `sync.RWMutex` | Multiple readers, one writer | Read-heavy shared state |
| `select` | Multiplex channels | Timeouts, multiple channels |
| `context.Context` | Cancellation & deadlines | HTTP handlers, long tasks |
| `sync/atomic` | Lock-free operations | Simple counters/flags |

---

## 18. Complete Real-World Example

```go
package main

import (
    "context"
    "fmt"
    "sync"
    "time"
)

type Result struct {
    ID    int
    Value string
}

func fetchData(ctx context.Context, id int) (Result, error) {
    // Simulate API call
    select {
    case <-time.After(time.Duration(id*100) * time.Millisecond):
        return Result{ID: id, Value: fmt.Sprintf("data-%d", id)}, nil
    case <-ctx.Done():
        return Result{}, ctx.Err()
    }
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
    defer cancel()

    ids := []int{1, 2, 3, 4, 5}
    results := make(chan Result, len(ids))
    errs    := make(chan error,  len(ids))

    var wg sync.WaitGroup
    for _, id := range ids {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            res, err := fetchData(ctx, id)
            if err != nil {
                errs <- err
                return
            }
            results <- res
        }(id)
    }

    go func() {
        wg.Wait()
        close(results)
        close(errs)
    }()

    for res := range results {
        fmt.Printf("Got: %+v\n", res)
    }
    for err := range errs {
        fmt.Printf("Error: %v\n", err)
    }
}
```

---

## Summary — Go Concurrency in One Glance

```
goroutine  →  lightweight thread (go func())
channel    →  pipe between goroutines (make(chan T))
select     →  wait on multiple channels
WaitGroup  →  "wait for all goroutines"
Mutex      →  lock shared memory
Context    →  cancel / timeout propagation
atomic     →  lock-free counters
```

> **Golden rule:** prefer channels for communication, use mutexes only when you truly share state.
