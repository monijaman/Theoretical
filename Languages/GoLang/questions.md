# Go Language — 100 Interview Questions & Solutions

---

## Section 1: Basics

---

### Q1. What is the zero value of different types in Go?

**Answer:**
Go automatically assigns zero values to all declared variables.

```go
var i int       // 0
var f float64   // 0.0
var b bool      // false
var s string    // ""
var p *int      // nil
var sl []int    // nil
var m map[string]int // nil
var fn func()   // nil
```

---

### Q2. What is the difference between `var x int` and `x := 0`?

**Answer:**
- `var x int` — package-level or function-level declaration, explicit type
- `x := 0` — short declaration, only inside functions, type inferred

```go
var x int   // x = 0, type int
x := 0      // x = 0, type int (inferred)
x := 0.5    // x = 0.5, type float64 (inferred)
```

The short `:=` requires at least one new variable on the left side.

---

### Q3. What is a rune in Go?

**Answer:**
A `rune` is an alias for `int32` and represents a Unicode code point. Use it when working with characters.

```go
r := 'A'         // rune, value = 65
fmt.Printf("%T\n", r)  // int32

s := "hello"
for i, r := range s {
    fmt.Printf("index=%d char=%c\n", i, r)
}

// String length vs rune count
s2 := "héllo"
fmt.Println(len(s2))            // 6 (bytes)
fmt.Println(len([]rune(s2)))    // 5 (characters)
```

---

### Q4. What is the difference between `make` and `new`?

**Answer:**
- `new(T)` — allocates zeroed memory for type T, returns `*T`
- `make(T, ...)` — initializes slices, maps, channels (not a pointer)

```go
// new
p := new(int)       // *int, *p == 0
s := new([]int)     // *[]int, *s == nil

// make
sl := make([]int, 5)        // []int, len=5, cap=5
m  := make(map[string]int)  // initialized map
ch := make(chan int, 10)     // buffered channel
```

---

### Q5. What is the difference between an array and a slice?

**Answer:**

| | Array | Slice |
|---|---|---|
| Size | Fixed | Dynamic |
| Type | `[3]int` | `[]int` |
| Value type | Yes (copied) | Reference type |
| Passed to func | Copy | Points to same array |

```go
// Array — fixed, value type
arr := [3]int{1, 2, 3}
arr2 := arr      // full copy
arr2[0] = 99
fmt.Println(arr[0])  // 1 (unchanged)

// Slice — dynamic, reference type
sl  := []int{1, 2, 3}
sl2 := sl        // same underlying array
sl2[0] = 99
fmt.Println(sl[0])   // 99 (changed!)
```

---

### Q6. What happens when you append beyond a slice's capacity?

**Answer:**
Go allocates a new underlying array (usually 2x the old capacity) and copies data.

```go
s := make([]int, 3, 3)
fmt.Println(cap(s))  // 3

s = append(s, 4)
fmt.Println(cap(s))  // 6 (doubled)
```

After reallocation, the old slice and new slice no longer share memory.

---

### Q7. How do you delete an element from a slice?

**Answer:**
```go
s := []int{1, 2, 3, 4, 5}
i := 2  // delete index 2 (value 3)

// Order preserved
s = append(s[:i], s[i+1:]...)
fmt.Println(s)  // [1 2 4 5]

// Order not needed (faster — swap with last)
s[i] = s[len(s)-1]
s = s[:len(s)-1]
```

---

### Q8. How are maps passed to functions?

**Answer:**
Maps are reference types — passing a map to a function passes a reference, not a copy.

```go
func addEntry(m map[string]int, key string, val int) {
    m[key] = val  // modifies the original map
}

func main() {
    m := map[string]int{"a": 1}
    addEntry(m, "b", 2)
    fmt.Println(m)  // map[a:1 b:2]
}
```

---

### Q9. How do you check if a key exists in a map?

**Answer:**
```go
m := map[string]int{"alice": 90}

// Two-value form
score, ok := m["alice"]
if ok {
    fmt.Println("Found:", score)
}

// If key missing, ok = false, score = zero value (0)
score2, ok2 := m["bob"]
fmt.Println(score2, ok2)  // 0 false
```

---

### Q10. What is a variadic function?

**Answer:**
A function that accepts a variable number of arguments using `...`.

```go
func sum(nums ...int) int {
    total := 0
    for _, n := range nums {
        total += n
    }
    return total
}

fmt.Println(sum(1, 2, 3))       // 6
fmt.Println(sum(1, 2, 3, 4, 5)) // 15

// Spread a slice
nums := []int{1, 2, 3}
fmt.Println(sum(nums...))  // 6
```

---

## Section 2: Functions & Closures

---

### Q11. What is a closure in Go?

**Answer:**
A closure is a function that captures variables from its surrounding scope.

```go
func counter() func() int {
    count := 0
    return func() int {
        count++
        return count
    }
}

c := counter()
fmt.Println(c())  // 1
fmt.Println(c())  // 2
fmt.Println(c())  // 3

c2 := counter()   // independent counter
fmt.Println(c2()) // 1
```

---

### Q12. What is a defer statement and when does it run?

**Answer:**
`defer` schedules a function call to run when the surrounding function returns. Multiple defers run in LIFO order.

```go
func example() {
    defer fmt.Println("third")
    defer fmt.Println("second")
    defer fmt.Println("first")
    fmt.Println("body")
}
// Output:
// body
// first
// second
// third
```

Common use: cleanup (close files, unlock mutexes).

```go
f, _ := os.Open("file.txt")
defer f.Close()  // always runs, even on error/panic
```

---

### Q13. What is the difference between panic and recover?

**Answer:**
- `panic` — stops normal execution, unwinds the stack
- `recover` — catches a panic inside a deferred function

```go
func safeDiv(a, b int) (result int, err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("recovered: %v", r)
        }
    }()
    return a / b, nil  // panics if b == 0
}

result, err := safeDiv(10, 0)
fmt.Println(result, err)  // 0 recovered: runtime error: integer divide by zero
```

---

### Q14. What does `defer` capture — value or reference?

**Answer:**
Defer evaluates function arguments immediately but the function body runs later.

```go
x := 10
defer fmt.Println(x)  // captures x=10 immediately
x = 20
// prints 10, not 20

// But if using a pointer or closure, you see the latest value:
defer func() {
    fmt.Println(x)  // closure — sees x=20
}()
```

---

### Q15. What is a function type in Go?

**Answer:**
Functions are first-class values in Go.

```go
type Operation func(int, int) int

func apply(op Operation, a, b int) int {
    return op(a, b)
}

add := func(a, b int) int { return a + b }
mul := func(a, b int) int { return a * b }

fmt.Println(apply(add, 3, 4))  // 7
fmt.Println(apply(mul, 3, 4))  // 12
```

---

## Section 3: Structs & Interfaces

---

### Q16. What is embedding in Go?

**Answer:**
Embedding promotes methods and fields of one struct into another (like inheritance but composition-based).

```go
type Animal struct {
    Name string
}

func (a Animal) Speak() string {
    return a.Name + " speaks"
}

type Dog struct {
    Animal        // embedded
    Breed string
}

d := Dog{Animal: Animal{Name: "Rex"}, Breed: "Lab"}
fmt.Println(d.Speak())  // "Rex speaks" — promoted method
fmt.Println(d.Name)     // "Rex" — promoted field
```

---

### Q17. What is the difference between a value receiver and a pointer receiver?

**Answer:**
- Value receiver: operates on a copy, cannot modify the original
- Pointer receiver: operates on the original, can modify it

```go
type Counter struct{ count int }

func (c Counter) Value() int { return c.count }      // value receiver
func (c *Counter) Inc()      { c.count++ }           // pointer receiver

c := Counter{}
c.Inc()
fmt.Println(c.Value())  // 1
```

Use pointer receivers when:
1. You need to modify the struct
2. The struct is large (avoid copying)
3. Consistency (if one method needs pointer, use pointer for all)

---

### Q18. How does interface satisfaction work in Go?

**Answer:**
A type implements an interface implicitly — no `implements` keyword needed.

```go
type Stringer interface {
    String() string
}

type User struct{ Name string }

func (u User) String() string { return "User: " + u.Name }

var s Stringer = User{Name: "Alice"}  // User satisfies Stringer
fmt.Println(s.String())               // "User: Alice"
```

---

### Q19. What is the empty interface `interface{}`?

**Answer:**
`interface{}` (or `any` in Go 1.18+) holds any value. It has no methods.

```go
func printAnything(v interface{}) {
    fmt.Printf("(%T) %v\n", v, v)
}

printAnything(42)
printAnything("hello")
printAnything([]int{1, 2, 3})

// Type switch
func typeSwitch(v interface{}) {
    switch val := v.(type) {
    case int:
        fmt.Println("int:", val)
    case string:
        fmt.Println("string:", val)
    default:
        fmt.Printf("unknown type: %T\n", val)
    }
}
```

---

### Q20. What is a type assertion?

**Answer:**
Extract the concrete type from an interface.

```go
var i interface{} = "hello"

// Safe assertion
s, ok := i.(string)
fmt.Println(s, ok)   // hello true

n, ok := i.(int)
fmt.Println(n, ok)   // 0 false

// Unsafe assertion (panics if wrong type)
s2 := i.(string)     // ok
n2 := i.(int)        // PANIC: interface conversion
```

---

### Q21. Can you compare two interfaces in Go?

**Answer:**
Yes, but the underlying types must be comparable. If not, it panics at runtime.

```go
var a interface{} = 1
var b interface{} = 1
fmt.Println(a == b)  // true

var c interface{} = []int{1, 2}
var d interface{} = []int{1, 2}
// fmt.Println(c == d)  // PANIC: slice is not comparable
_ = c; _ = d
```

---

## Section 4: Pointers & Memory

---

### Q22. When should you use a pointer vs a value?

**Answer:**
Use a pointer when:
1. You need to mutate the value inside a function
2. The value is large (struct with many fields)
3. You need to represent "no value" (nil pointer)

```go
type Config struct { /* many fields */ }

// Value — function gets a copy, original unchanged
func process(c Config) { }

// Pointer — function can mutate, no copying large struct
func processPtr(c *Config) { c.Field = "new" }
```

---

### Q23. What is a nil pointer dereference?

**Answer:**
Accessing a nil pointer causes a runtime panic.

```go
var p *int
fmt.Println(*p)  // PANIC: runtime error: invalid memory address

// Always check before dereferencing
if p != nil {
    fmt.Println(*p)
}
```

---

### Q24. What is `unsafe.Pointer` and when is it used?

**Answer:**
`unsafe.Pointer` bypasses Go's type system. Used rarely (low-level code, CGO, reflection tricks).

```go
import "unsafe"

x := int32(42)
p := unsafe.Pointer(&x)
y := (*float32)(p)
fmt.Println(*y)  // reinterprets bits of 42 as float32
```

Avoid in application code — it defeats type safety and GC guarantees.

---

## Section 5: Concurrency

---

### Q25. What is a goroutine?

**Answer:**
A goroutine is a function running concurrently with other goroutines in the same address space. It's managed by the Go runtime, not OS threads.

```go
func greet(name string) {
    fmt.Println("Hello,", name)
}

go greet("Alice")   // starts a goroutine
go greet("Bob")
```

They start with ~2KB stack (grows as needed) and cost microseconds to create vs OS threads (~1MB).

---

### Q26. What is a channel deadlock and how does it happen?

**Answer:**
A deadlock occurs when all goroutines are waiting and none can proceed.

```go
// DEADLOCK — unbuffered channel, no goroutine to receive
ch := make(chan int)
ch <- 1             // blocks forever
fmt.Println(<-ch)

// FIX — use goroutine or buffered channel
ch := make(chan int, 1)
ch <- 1             // doesn't block (buffer has space)
fmt.Println(<-ch)   // 1
```

---

### Q27. What is the difference between buffered and unbuffered channels?

**Answer:**

```go
// Unbuffered — send blocks until receiver is ready (synchronous)
ch := make(chan int)
go func() { ch <- 42 }()
fmt.Println(<-ch)  // 42

// Buffered — send blocks only when buffer is full (asynchronous up to cap)
ch := make(chan int, 3)
ch <- 1   // doesn't block
ch <- 2   // doesn't block
ch <- 3   // doesn't block
// ch <- 4 // blocks — buffer full

fmt.Println(<-ch)  // 1
```

---

### Q28. How do you safely stop a goroutine?

**Answer:**
Use a context or a done channel — never kill goroutines forcefully.

```go
// Method 1: done channel
func worker(done <-chan struct{}) {
    for {
        select {
        case <-done:
            fmt.Println("worker stopped")
            return
        default:
            // do work
        }
    }
}

done := make(chan struct{})
go worker(done)
time.Sleep(time.Second)
close(done)  // signal all listeners

// Method 2: context (preferred)
ctx, cancel := context.WithCancel(context.Background())
go func() {
    <-ctx.Done()
    fmt.Println("stopped:", ctx.Err())
}()
cancel()
```

---

### Q29. What is a race condition? Show an example.

**Answer:**
A race condition occurs when multiple goroutines access shared data concurrently and at least one writes.

```go
// RACE CONDITION
count := 0
var wg sync.WaitGroup
for i := 0; i < 1000; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
        count++  // read-modify-write, not atomic!
    }()
}
wg.Wait()
fmt.Println(count)  // random result, not 1000

// FIX with Mutex
var mu sync.Mutex
for i := 0; i < 1000; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
        mu.Lock()
        count++
        mu.Unlock()
    }()
}
```

Detect with: `go run -race main.go`

---

### Q30. What does `close(ch)` do?

**Answer:**
- Signals receivers that no more values will be sent
- Receivers can still drain buffered values after close
- Sending to a closed channel panics
- Receiving from a closed, empty channel returns zero value + `false`

```go
ch := make(chan int, 3)
ch <- 1
ch <- 2
close(ch)

// Range stops automatically when closed
for v := range ch {
    fmt.Println(v)  // 1, 2
}

// Two-value receive
v, ok := <-ch
fmt.Println(v, ok)  // 0 false (closed and empty)
```

---

### Q31. How does `select` choose when multiple channels are ready?

**Answer:**
When multiple cases are ready simultaneously, Go picks one **randomly** (uniform pseudo-random).

```go
ch1 := make(chan string, 1)
ch2 := make(chan string, 1)
ch1 <- "one"
ch2 <- "two"

select {
case v := <-ch1:
    fmt.Println(v)
case v := <-ch2:
    fmt.Println(v)
}
// Could print "one" or "two" — non-deterministic
```

---

### Q32. What is sync.Once and when do you use it?

**Answer:**
`sync.Once` ensures a function is executed exactly once, even with concurrent callers. Perfect for lazy initialization.

```go
var (
    instance *Database
    once     sync.Once
)

func GetDB() *Database {
    once.Do(func() {
        instance = &Database{} // runs only once
        instance.Connect()
    })
    return instance
}

// Safe to call from many goroutines
go GetDB()
go GetDB()
go GetDB()
```

---

### Q33. What is sync.Pool?

**Answer:**
`sync.Pool` is a cache of temporary objects to reduce GC pressure. Objects may be garbage collected at any time.

```go
var pool = sync.Pool{
    New: func() interface{} {
        return make([]byte, 1024)
    },
}

// Get from pool (or create new)
buf := pool.Get().([]byte)

// Use it
copy(buf, "hello")

// Return to pool
pool.Put(buf)
```

Common use: HTTP request buffers, byte slices in hot paths.

---

### Q34. What is the difference between sync.Mutex and sync.RWMutex?

**Answer:**

| | sync.Mutex | sync.RWMutex |
|---|---|---|
| Writers | One at a time | One at a time |
| Readers | One at a time | Many simultaneously |
| Use case | Mixed read/write | Read-heavy workloads |

```go
var rw sync.RWMutex
cache := map[string]string{}

func read(key string) string {
    rw.RLock()         // multiple goroutines can hold RLock
    defer rw.RUnlock()
    return cache[key]
}

func write(key, val string) {
    rw.Lock()          // exclusive — blocks all readers and writers
    defer rw.Unlock()
    cache[key] = val
}
```

---

### Q35. What is a goroutine leak?

**Answer:**
A goroutine leak happens when a goroutine is started but never terminates, wasting memory and CPU.

```go
// LEAK — goroutine blocks forever waiting on ch
func leak() {
    ch := make(chan int)
    go func() {
        val := <-ch  // blocks forever, ch never written to
        fmt.Println(val)
    }()
}

// FIX — use context or close channel
func noLeak(ctx context.Context) {
    ch := make(chan int)
    go func() {
        select {
        case val := <-ch:
            fmt.Println(val)
        case <-ctx.Done():
            return  // exits cleanly
        }
    }()
}
```

---

### Q36. What is the Go scheduler (GMP model)?

**Answer:**
- **G** — Goroutine (the task)
- **M** — Machine (OS thread)
- **P** — Processor (logical CPU, holds runqueue)

The scheduler runs G on M via P. When a G blocks (I/O, channel), the M is reused for other Gs. Controlled by `GOMAXPROCS` (defaults to number of CPUs).

```go
import "runtime"

runtime.GOMAXPROCS(4)  // use 4 OS threads
fmt.Println(runtime.NumGoroutine())  // active goroutines
```

---

### Q37. How do you implement a timeout with channels?

**Answer:**
```go
func fetchWithTimeout(ch <-chan string, timeout time.Duration) (string, error) {
    select {
    case result := <-ch:
        return result, nil
    case <-time.After(timeout):
        return "", fmt.Errorf("timed out after %v", timeout)
    }
}

results := make(chan string, 1)
go func() {
    time.Sleep(2 * time.Second)
    results <- "data"
}()

val, err := fetchWithTimeout(results, 1*time.Second)
fmt.Println(val, err)  // "" timed out after 1s
```

---

### Q38. What is context.WithValue and when should you avoid it?

**Answer:**
`context.WithValue` stores a key-value pair in the context chain.

```go
type ctxKey string

ctx := context.WithValue(context.Background(), ctxKey("userID"), "abc-123")

// Retrieve
userID := ctx.Value(ctxKey("userID")).(string)
fmt.Println(userID)  // abc-123
```

**Avoid for:** passing optional function parameters, database connections, or large objects. Use only for request-scoped data (user ID, trace ID, auth token).

---

## Section 6: Error Handling

---

### Q39. How do you create a custom error type?

**Answer:**
```go
// Simple
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed on %s: %s", e.Field, e.Message)
}

// Usage
func validate(age int) error {
    if age < 0 {
        return &ValidationError{Field: "age", Message: "must be non-negative"}
    }
    return nil
}

err := validate(-1)
var ve *ValidationError
if errors.As(err, &ve) {
    fmt.Println("Field:", ve.Field)
}
```

---

### Q40. What is error wrapping and how does errors.Is work?

**Answer:**
```go
var ErrNotFound = errors.New("not found")

func findUser(id int) error {
    return fmt.Errorf("findUser %d: %w", id, ErrNotFound)  // wrap
}

err := findUser(42)
fmt.Println(err)                         // findUser 42: not found
fmt.Println(errors.Is(err, ErrNotFound)) // true (unwraps chain)
```

`errors.Is` traverses the error chain. `errors.As` extracts a specific type.

---

### Q41. What is the idiomatic way to handle multiple errors?

**Answer:**
```go
// Multiple operations, early exit
func process() error {
    if err := step1(); err != nil {
        return fmt.Errorf("step1: %w", err)
    }
    if err := step2(); err != nil {
        return fmt.Errorf("step2: %w", err)
    }
    return nil
}

// Collect multiple errors (Go 1.20+)
var errs []error
for _, item := range items {
    if err := process(item); err != nil {
        errs = append(errs, err)
    }
}
if len(errs) > 0 {
    return errors.Join(errs...)  // Go 1.20+
}
```

---

## Section 7: Generics (Go 1.18+)

---

### Q42. What are generics in Go?

**Answer:**
Generics allow writing functions and types that work with any type satisfying a constraint.

```go
// Generic function
func Map[T, U any](s []T, f func(T) U) []U {
    result := make([]U, len(s))
    for i, v := range s {
        result[i] = f(v)
    }
    return result
}

nums := []int{1, 2, 3, 4}
doubled := Map(nums, func(n int) int { return n * 2 })
fmt.Println(doubled)  // [2 4 6 8]

strs := Map(nums, func(n int) string { return fmt.Sprintf("%d", n) })
fmt.Println(strs)  // [1 2 3 4]
```

---

### Q43. What is a type constraint?

**Answer:**
Constraints limit which types a generic function accepts.

```go
import "golang.org/x/exp/constraints"

// Built-in constraint
type Number interface {
    int | int8 | int16 | int32 | int64 |
    float32 | float64
}

func Sum[T Number](nums []T) T {
    var total T
    for _, n := range nums {
        total += n
    }
    return total
}

fmt.Println(Sum([]int{1, 2, 3}))       // 6
fmt.Println(Sum([]float64{1.1, 2.2}))  // 3.3
```

---

### Q44. Write a generic Stack implementation.

**Answer:**
```go
type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(item T) {
    s.items = append(s.items, item)
}

func (s *Stack[T]) Pop() (T, bool) {
    var zero T
    if len(s.items) == 0 {
        return zero, false
    }
    top := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return top, true
}

func (s *Stack[T]) Len() int { return len(s.items) }

// Usage
s := Stack[int]{}
s.Push(1)
s.Push(2)
v, _ := s.Pop()
fmt.Println(v)  // 2
```

---

## Section 8: Common Algorithms

---

### Q45. Reverse a string in Go.

**Answer:**
```go
func reverseString(s string) string {
    runes := []rune(s)  // handle multi-byte characters
    for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
        runes[i], runes[j] = runes[j], runes[i]
    }
    return string(runes)
}

fmt.Println(reverseString("hello"))   // "olleh"
fmt.Println(reverseString("héllo"))   // "olléh"
```

---

### Q46. Check if a string is a palindrome.

**Answer:**
```go
func isPalindrome(s string) bool {
    runes := []rune(strings.ToLower(s))
    for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
        if runes[i] != runes[j] {
            return false
        }
    }
    return true
}

fmt.Println(isPalindrome("racecar"))  // true
fmt.Println(isPalindrome("hello"))    // false
fmt.Println(isPalindrome("Level"))    // true
```

---

### Q47. Find duplicates in a slice.

**Answer:**
```go
func findDuplicates(nums []int) []int {
    seen := make(map[int]bool)
    dups := []int{}
    for _, n := range nums {
        if seen[n] {
            dups = append(dups, n)
        }
        seen[n] = true
    }
    return dups
}

fmt.Println(findDuplicates([]int{1, 2, 3, 2, 4, 3}))  // [2 3]
```

---

### Q48. Two Sum problem.

**Answer:**
```go
func twoSum(nums []int, target int) (int, int) {
    seen := make(map[int]int)  // value → index
    for i, n := range nums {
        complement := target - n
        if j, ok := seen[complement]; ok {
            return j, i
        }
        seen[n] = i
    }
    return -1, -1
}

i, j := twoSum([]int{2, 7, 11, 15}, 9)
fmt.Println(i, j)  // 0 1  (nums[0] + nums[1] = 2 + 7 = 9)
```

---

### Q49. Implement Fibonacci with memoization.

**Answer:**
```go
func fibonacci(n int, memo map[int]int) int {
    if n <= 1 {
        return n
    }
    if val, ok := memo[n]; ok {
        return val
    }
    memo[n] = fibonacci(n-1, memo) + fibonacci(n-2, memo)
    return memo[n]
}

memo := make(map[int]int)
fmt.Println(fibonacci(50, memo))  // 12586269025
```

---

### Q50. Find the largest element in a slice.

**Answer:**
```go
func maxElement(nums []int) (int, error) {
    if len(nums) == 0 {
        return 0, fmt.Errorf("empty slice")
    }
    max := nums[0]
    for _, n := range nums[1:] {
        if n > max {
            max = n
        }
    }
    return max, nil
}

fmt.Println(maxElement([]int{3, 1, 4, 1, 5, 9, 2}))  // 9 <nil>
```

---

### Q51. Count word frequency in a string.

**Answer:**
```go
func wordFrequency(s string) map[string]int {
    freq := make(map[string]int)
    words := strings.Fields(s)  // split by whitespace
    for _, w := range words {
        w = strings.ToLower(strings.Trim(w, ".,!?"))
        freq[w]++
    }
    return freq
}

freq := wordFrequency("the quick brown fox the fox")
fmt.Println(freq)  // map[brown:1 fox:2 quick:1 the:2]
```

---

### Q52. Implement binary search.

**Answer:**
```go
func binarySearch(nums []int, target int) int {
    lo, hi := 0, len(nums)-1
    for lo <= hi {
        mid := lo + (hi-lo)/2  // avoids overflow vs (lo+hi)/2
        if nums[mid] == target {
            return mid
        } else if nums[mid] < target {
            lo = mid + 1
        } else {
            hi = mid - 1
        }
    }
    return -1
}

fmt.Println(binarySearch([]int{1, 3, 5, 7, 9}, 7))   // 3
fmt.Println(binarySearch([]int{1, 3, 5, 7, 9}, 4))   // -1
```

---

### Q53. Check if two strings are anagrams.

**Answer:**
```go
func isAnagram(a, b string) bool {
    if len(a) != len(b) {
        return false
    }
    count := [26]int{}
    for i := 0; i < len(a); i++ {
        count[a[i]-'a']++
        count[b[i]-'a']--
    }
    return count == [26]int{}
}

fmt.Println(isAnagram("listen", "silent"))  // true
fmt.Println(isAnagram("hello", "world"))    // false
```

---

### Q54. FizzBuzz.

**Answer:**
```go
func fizzBuzz(n int) {
    for i := 1; i <= n; i++ {
        switch {
        case i%15 == 0:
            fmt.Println("FizzBuzz")
        case i%3 == 0:
            fmt.Println("Fizz")
        case i%5 == 0:
            fmt.Println("Buzz")
        default:
            fmt.Println(i)
        }
    }
}
```

---

### Q55. Merge two sorted slices.

**Answer:**
```go
func mergeSorted(a, b []int) []int {
    result := make([]int, 0, len(a)+len(b))
    i, j := 0, 0
    for i < len(a) && j < len(b) {
        if a[i] <= b[j] {
            result = append(result, a[i])
            i++
        } else {
            result = append(result, b[j])
            j++
        }
    }
    result = append(result, a[i:]...)
    result = append(result, b[j:]...)
    return result
}

fmt.Println(mergeSorted([]int{1, 3, 5}, []int{2, 4, 6}))  // [1 2 3 4 5 6]
```

---

### Q56. Implement a queue using two stacks.

**Answer:**
```go
type Queue struct {
    inbox  []int
    outbox []int
}

func (q *Queue) Enqueue(val int) {
    q.inbox = append(q.inbox, val)
}

func (q *Queue) Dequeue() (int, bool) {
    if len(q.outbox) == 0 {
        for len(q.inbox) > 0 {
            n := len(q.inbox)
            q.outbox = append(q.outbox, q.inbox[n-1])
            q.inbox = q.inbox[:n-1]
        }
    }
    if len(q.outbox) == 0 {
        return 0, false
    }
    n := len(q.outbox)
    val := q.outbox[n-1]
    q.outbox = q.outbox[:n-1]
    return val, true
}
```

---

### Q57. Find all permutations of a string.

**Answer:**
```go
func permutations(s string) []string {
    if len(s) <= 1 {
        return []string{s}
    }
    var result []string
    for i, ch := range s {
        rest := s[:i] + s[i+1:]
        for _, perm := range permutations(rest) {
            result = append(result, string(ch)+perm)
        }
    }
    return result
}

fmt.Println(permutations("abc"))
// [abc acb bac bca cab cba]
```

---

### Q58. Flatten a nested slice.

**Answer:**
```go
func flatten(nested []interface{}) []int {
    var result []int
    for _, item := range nested {
        switch v := item.(type) {
        case int:
            result = append(result, v)
        case []interface{}:
            result = append(result, flatten(v)...)
        }
    }
    return result
}

nested := []interface{}{1, []interface{}{2, 3, []interface{}{4, 5}}, 6}
fmt.Println(flatten(nested))  // [1 2 3 4 5 6]
```

---

## Section 9: Concurrency Problems

---

### Q59. Print numbers 1-10 using two goroutines alternately.

**Answer:**
```go
func alternate() {
    ch1 := make(chan struct{}, 1)
    ch2 := make(chan struct{})

    ch1 <- struct{}{}  // prime goroutine 1

    var wg sync.WaitGroup
    wg.Add(2)

    go func() {
        defer wg.Done()
        for i := 1; i <= 10; i += 2 {
            <-ch1
            fmt.Println("G1:", i)
            ch2 <- struct{}{}
        }
    }()

    go func() {
        defer wg.Done()
        for i := 2; i <= 10; i += 2 {
            <-ch2
            fmt.Println("G2:", i)
            if i < 10 {
                ch1 <- struct{}{}
            }
        }
    }()

    wg.Wait()
}
```

---

### Q60. Implement a concurrent map-reduce.

**Answer:**
```go
func mapReduce(nums []int, workers int) int {
    chunkSize := (len(nums) + workers - 1) / workers
    results := make(chan int, workers)

    var wg sync.WaitGroup
    for i := 0; i < len(nums); i += chunkSize {
        end := i + chunkSize
        if end > len(nums) { end = len(nums) }

        wg.Add(1)
        go func(chunk []int) {
            defer wg.Done()
            sum := 0
            for _, n := range chunk { sum += n }
            results <- sum
        }(nums[i:end])
    }

    go func() {
        wg.Wait()
        close(results)
    }()

    total := 0
    for r := range results {
        total += r
    }
    return total
}

fmt.Println(mapReduce([]int{1, 2, 3, 4, 5, 6, 7, 8}, 4))  // 36
```

---

### Q61. Implement a rate limiter using a channel.

**Answer:**
```go
func rateLimiter(rate int, per time.Duration) <-chan time.Time {
    limiter := make(chan time.Time, rate)

    go func() {
        ticker := time.NewTicker(per / time.Duration(rate))
        defer ticker.Stop()
        for t := range ticker.C {
            limiter <- t
        }
    }()

    return limiter
}

limiter := rateLimiter(3, time.Second)  // 3 per second
for i := 0; i < 9; i++ {
    <-limiter  // blocks until a token is available
    fmt.Printf("Request %d at %v\n", i+1, time.Now())
}
```

---

### Q62. Implement a semaphore using a buffered channel.

**Answer:**
```go
type Semaphore chan struct{}

func NewSemaphore(n int) Semaphore {
    return make(Semaphore, n)
}

func (s Semaphore) Acquire() { s <- struct{}{} }
func (s Semaphore) Release() { <-s }

// Only 3 goroutines can run at once
sem := NewSemaphore(3)
var wg sync.WaitGroup

for i := 0; i < 10; i++ {
    wg.Add(1)
    go func(id int) {
        defer wg.Done()
        sem.Acquire()
        defer sem.Release()
        fmt.Printf("worker %d running\n", id)
        time.Sleep(time.Second)
    }(i)
}
wg.Wait()
```

---

### Q63. Write a concurrent prime sieve.

**Answer:**
```go
func generate(ch chan<- int) {
    for i := 2; ; i++ {
        ch <- i
    }
}

func filter(in <-chan int, out chan<- int, prime int) {
    for i := range in {
        if i%prime != 0 {
            out <- i
        }
    }
}

func sieve(n int) []int {
    ch := make(chan int)
    go generate(ch)

    var primes []int
    for i := 0; i < n; i++ {
        prime := <-ch
        primes = append(primes, prime)
        ch1 := make(chan int)
        go filter(ch, ch1, prime)
        ch = ch1
    }
    return primes
}

fmt.Println(sieve(10))  // [2 3 5 7 11 13 17 19 23 29]
```

---

### Q64. Implement a pub/sub system with channels.

**Answer:**
```go
type PubSub struct {
    mu   sync.RWMutex
    subs map[string][]chan string
}

func NewPubSub() *PubSub {
    return &PubSub{subs: make(map[string][]chan string)}
}

func (ps *PubSub) Subscribe(topic string) <-chan string {
    ch := make(chan string, 10)
    ps.mu.Lock()
    ps.subs[topic] = append(ps.subs[topic], ch)
    ps.mu.Unlock()
    return ch
}

func (ps *PubSub) Publish(topic, msg string) {
    ps.mu.RLock()
    defer ps.mu.RUnlock()
    for _, ch := range ps.subs[topic] {
        ch <- msg
    }
}

ps := NewPubSub()
ch := ps.Subscribe("news")
go func() {
    ps.Publish("news", "breaking!")
}()
fmt.Println(<-ch)  // "breaking!"
```

---

## Section 10: Data Structures

---

### Q65. Implement a linked list in Go.

**Answer:**
```go
type Node struct {
    Val  int
    Next *Node
}

type LinkedList struct {
    Head *Node
}

func (l *LinkedList) Push(val int) {
    l.Head = &Node{Val: val, Next: l.Head}
}

func (l *LinkedList) Pop() (int, bool) {
    if l.Head == nil {
        return 0, false
    }
    val := l.Head.Val
    l.Head = l.Head.Next
    return val, true
}

func (l *LinkedList) Print() {
    for n := l.Head; n != nil; n = n.Next {
        fmt.Printf("%d -> ", n.Val)
    }
    fmt.Println("nil")
}
```

---

### Q66. Reverse a linked list.

**Answer:**
```go
func reverseList(head *Node) *Node {
    var prev *Node
    curr := head
    for curr != nil {
        next := curr.Next
        curr.Next = prev
        prev = curr
        curr = next
    }
    return prev
}
```

---

### Q67. Detect a cycle in a linked list (Floyd's algorithm).

**Answer:**
```go
func hasCycle(head *Node) bool {
    slow, fast := head, head
    for fast != nil && fast.Next != nil {
        slow = slow.Next
        fast = fast.Next.Next
        if slow == fast {
            return true
        }
    }
    return false
}
```

---

### Q68. Implement a binary tree and in-order traversal.

**Answer:**
```go
type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}

func insert(root *TreeNode, val int) *TreeNode {
    if root == nil {
        return &TreeNode{Val: val}
    }
    if val < root.Val {
        root.Left = insert(root.Left, val)
    } else {
        root.Right = insert(root.Right, val)
    }
    return root
}

func inOrder(root *TreeNode) []int {
    if root == nil {
        return nil
    }
    result := inOrder(root.Left)
    result = append(result, root.Val)
    result = append(result, inOrder(root.Right)...)
    return result
}

root := insert(nil, 5)
for _, v := range []int{3, 7, 1, 4} {
    root = insert(root, v)
}
fmt.Println(inOrder(root))  // [1 3 4 5 7]
```

---

### Q69. Find the maximum depth of a binary tree.

**Answer:**
```go
func maxDepth(root *TreeNode) int {
    if root == nil {
        return 0
    }
    leftDepth  := maxDepth(root.Left)
    rightDepth := maxDepth(root.Right)
    if leftDepth > rightDepth {
        return leftDepth + 1
    }
    return rightDepth + 1
}
```

---

### Q70. Implement a min-heap.

**Answer:**
```go
import "container/heap"

type MinHeap []int

func (h MinHeap) Len() int           { return len(h) }
func (h MinHeap) Less(i, j int) bool { return h[i] < h[j] }
func (h MinHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }

func (h *MinHeap) Push(x interface{}) {
    *h = append(*h, x.(int))
}

func (h *MinHeap) Pop() interface{} {
    old := *h
    n := len(old)
    x := old[n-1]
    *h = old[:n-1]
    return x
}

h := &MinHeap{5, 3, 8, 1}
heap.Init(h)
heap.Push(h, 2)
fmt.Println(heap.Pop(h))  // 1
fmt.Println(heap.Pop(h))  // 2
```

---

## Section 11: Strings & I/O

---

### Q71. How do you efficiently build a string?

**Answer:**
```go
import "strings"

// SLOW — creates a new string each iteration
result := ""
for i := 0; i < 1000; i++ {
    result += "x"
}

// FAST — use strings.Builder (pre-allocate with Grow)
var b strings.Builder
b.Grow(1000)
for i := 0; i < 1000; i++ {
    b.WriteByte('x')
}
result = b.String()
```

---

### Q72. Split a CSV line handling quoted fields.

**Answer:**
```go
import "encoding/csv"
import "strings"

line := `"John, Jr.",30,"New York"`
r := csv.NewReader(strings.NewReader(line))
fields, err := r.Read()
fmt.Println(fields, err)
// ["John, Jr." "30" "New York"] <nil>
```

---

### Q73. How do you read a file line by line?

**Answer:**
```go
import (
    "bufio"
    "os"
)

func readLines(path string) ([]string, error) {
    f, err := os.Open(path)
    if err != nil {
        return nil, err
    }
    defer f.Close()

    var lines []string
    scanner := bufio.NewScanner(f)
    for scanner.Scan() {
        lines = append(lines, scanner.Text())
    }
    return lines, scanner.Err()
}
```

---

### Q74. Convert between string and int.

**Answer:**
```go
import "strconv"

// int → string
s := strconv.Itoa(42)        // "42"
s2 := fmt.Sprintf("%d", 42)  // "42"

// string → int
n, err := strconv.Atoi("42")   // 42, nil
n2, err := strconv.ParseInt("FF", 16, 64)  // hex → 255

// string → float
f, err := strconv.ParseFloat("3.14", 64)
```

---

## Section 12: Testing

---

### Q75. How do you write a basic test in Go?

**Answer:**
```go
// File: math_test.go
package math

import "testing"

func TestAdd(t *testing.T) {
    got  := Add(2, 3)
    want := 5
    if got != want {
        t.Errorf("Add(2, 3) = %d; want %d", got, want)
    }
}

// Table-driven test (idiomatic Go)
func TestAddTable(t *testing.T) {
    tests := []struct {
        a, b, want int
    }{
        {1, 2, 3},
        {0, 0, 0},
        {-1, 1, 0},
    }
    for _, tt := range tests {
        t.Run(fmt.Sprintf("%d+%d", tt.a, tt.b), func(t *testing.T) {
            if got := Add(tt.a, tt.b); got != tt.want {
                t.Errorf("got %d; want %d", got, tt.want)
            }
        })
    }
}
```

```bash
go test ./...
go test -v ./...
go test -run TestAdd ./...
go test -bench=. ./...
```

---

### Q76. How do you benchmark a function?

**Answer:**
```go
func BenchmarkAdd(b *testing.B) {
    for i := 0; i < b.N; i++ {  // b.N set by framework
        Add(100, 200)
    }
}

// With allocation tracking
func BenchmarkMakeSlice(b *testing.B) {
    b.ReportAllocs()
    for i := 0; i < b.N; i++ {
        s := make([]int, 1000)
        _ = s
    }
}
```

```bash
go test -bench=. -benchmem ./...
```

---

### Q77. How do you mock dependencies in Go tests?

**Answer:**
Use interfaces — inject the real implementation in production and a fake in tests.

```go
type EmailSender interface {
    Send(to, subject, body string) error
}

type UserService struct {
    email EmailSender
}

// Test double
type FakeEmailSender struct {
    Sent []string
}

func (f *FakeEmailSender) Send(to, subject, body string) error {
    f.Sent = append(f.Sent, to)
    return nil
}

func TestWelcomeEmail(t *testing.T) {
    fake := &FakeEmailSender{}
    svc  := UserService{email: fake}
    svc.WelcomeUser("alice@example.com")
    if len(fake.Sent) != 1 || fake.Sent[0] != "alice@example.com" {
        t.Error("welcome email not sent")
    }
}
```

---

## Section 13: Design Patterns

---

### Q78. Implement the Functional Options pattern.

**Answer:**
```go
type Server struct {
    host    string
    port    int
    timeout time.Duration
}

type Option func(*Server)

func WithHost(host string) Option {
    return func(s *Server) { s.host = host }
}

func WithPort(port int) Option {
    return func(s *Server) { s.port = port }
}

func WithTimeout(d time.Duration) Option {
    return func(s *Server) { s.timeout = d }
}

func NewServer(opts ...Option) *Server {
    s := &Server{host: "localhost", port: 8080, timeout: 30 * time.Second}
    for _, opt := range opts {
        opt(s)
    }
    return s
}

srv := NewServer(
    WithHost("0.0.0.0"),
    WithPort(9090),
    WithTimeout(60*time.Second),
)
```

---

### Q79. Implement the Singleton pattern.

**Answer:**
```go
type DB struct{ conn string }

var (
    dbInstance *DB
    dbOnce     sync.Once
)

func GetDB() *DB {
    dbOnce.Do(func() {
        dbInstance = &DB{conn: "postgres://..."}
    })
    return dbInstance
}

a := GetDB()
b := GetDB()
fmt.Println(a == b)  // true — same instance
```

---

### Q80. Implement the Observer pattern.

**Answer:**
```go
type EventHandler func(data interface{})

type EventBus struct {
    mu       sync.RWMutex
    handlers map[string][]EventHandler
}

func (eb *EventBus) On(event string, h EventHandler) {
    eb.mu.Lock()
    defer eb.mu.Unlock()
    eb.handlers[event] = append(eb.handlers[event], h)
}

func (eb *EventBus) Emit(event string, data interface{}) {
    eb.mu.RLock()
    defer eb.mu.RUnlock()
    for _, h := range eb.handlers[event] {
        go h(data)
    }
}

bus := &EventBus{handlers: make(map[string][]EventHandler)}
bus.On("login", func(d interface{}) { fmt.Println("User logged in:", d) })
bus.Emit("login", "alice")
```

---

## Section 14: HTTP & Web

---

### Q81. Write a simple HTTP server in Go.

**Answer:**
```go
import "net/http"

func helloHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    fmt.Fprintf(w, `{"message": "hello"}`)
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/hello", helloHandler)
    mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
    })

    srv := &http.Server{
        Addr:         ":8080",
        Handler:      mux,
        ReadTimeout:  5 * time.Second,
        WriteTimeout: 10 * time.Second,
    }
    log.Fatal(srv.ListenAndServe())
}
```

---

### Q82. How do you write HTTP middleware in Go?

**Answer:**
```go
type Middleware func(http.Handler) http.Handler

func Logger(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        fmt.Printf("%s %s %v\n", r.Method, r.URL.Path, time.Since(start))
    })
}

func Auth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")
        if token != "Bearer secret" {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }
        next.ServeHTTP(w, r)
    })
}

// Chain middleware
handler := Logger(Auth(myHandler))
http.Handle("/api", handler)
```

---

### Q83. How do you make HTTP requests in Go?

**Answer:**
```go
import "net/http"

// GET
resp, err := http.Get("https://api.example.com/data")
if err != nil {
    log.Fatal(err)
}
defer resp.Body.Close()
body, _ := io.ReadAll(resp.Body)
fmt.Println(string(body))

// POST with JSON
data := map[string]string{"name": "alice"}
jsonBytes, _ := json.Marshal(data)

resp2, err := http.Post(
    "https://api.example.com/users",
    "application/json",
    bytes.NewReader(jsonBytes),
)
defer resp2.Body.Close()

// With custom client (timeouts!)
client := &http.Client{Timeout: 10 * time.Second}
req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
req.Header.Set("Authorization", "Bearer token")
resp3, err := client.Do(req)
```

---

## Section 15: Advanced Topics

---

### Q84. What is reflection in Go?

**Answer:**
Reflection inspects types and values at runtime using the `reflect` package.

```go
import "reflect"

func inspect(v interface{}) {
    t := reflect.TypeOf(v)
    val := reflect.ValueOf(v)

    fmt.Println("Type:", t.Name())
    fmt.Println("Kind:", t.Kind())

    if t.Kind() == reflect.Struct {
        for i := 0; i < t.NumField(); i++ {
            field := t.Field(i)
            value := val.Field(i)
            fmt.Printf("  %s (%s) = %v\n", field.Name, field.Type, value)
        }
    }
}

type Point struct{ X, Y int }
inspect(Point{X: 1, Y: 2})
// Type: Point
// Kind: struct
//   X (int) = 1
//   Y (int) = 2
```

---

### Q85. What are struct tags and how are they used?

**Answer:**
Struct tags provide metadata for fields, read via reflection.

```go
type User struct {
    Name  string `json:"name" validate:"required"`
    Email string `json:"email,omitempty"`
    Age   int    `json:"-"`  // excluded from JSON
}

u := User{Name: "Alice", Email: "alice@example.com", Age: 30}
b, _ := json.Marshal(u)
fmt.Println(string(b))
// {"name":"Alice","email":"alice@example.com"}  (Age omitted)

// Reading tags
t := reflect.TypeOf(u)
field, _ := t.FieldByName("Name")
fmt.Println(field.Tag.Get("json"))      // "name"
fmt.Println(field.Tag.Get("validate"))  // "required"
```

---

### Q86. What is CGO?

**Answer:**
CGO allows Go code to call C code.

```go
/*
#include <stdio.h>

void sayHello(const char* name) {
    printf("Hello from C, %s!\n", name);
}
*/
import "C"

func main() {
    C.sayHello(C.CString("Alice"))
}
```

Build with: `go build` (CGO enabled by default)

Tradeoffs: enables C libraries but disables cross-compilation, adds CGO overhead, GC can't track C memory.

---

### Q87. What is go:generate?

**Answer:**
`//go:generate` is a comment directive that triggers code generation when you run `go generate`.

```go
//go:generate stringer -type=Direction

type Direction int
const (
    North Direction = iota
    South
    East
    West
)

// After running "go generate", stringer creates:
// func (d Direction) String() string { ... }

fmt.Println(North)  // "North" instead of "0"
```

---

### Q88. What is the init() function?

**Answer:**
`init()` runs automatically before `main()`, after all variable initializations. Each file can have multiple init functions.

```go
var db *Database

func init() {
    db = connectDB()  // runs before main
}

func main() {
    // db is ready here
}
```

Order: imported packages init first → package-level vars → init() → main().

---

### Q89. How does garbage collection work in Go?

**Answer:**
Go uses a **tri-color mark-and-sweep** garbage collector:

1. **Mark** — traverse from roots (globals, stack), mark live objects
2. **Sweep** — free unmarked objects
3. **Concurrent** — runs mostly concurrent with user code (low pause times)

```go
import "runtime"

// Force GC (rarely needed in production)
runtime.GC()

// GC stats
var stats runtime.MemStats
runtime.ReadMemStats(&stats)
fmt.Printf("Alloc: %v MB\n", stats.Alloc/1024/1024)
fmt.Printf("NumGC: %v\n", stats.NumGC)
```

Set GC target: `GOGC=100` (default — run GC when heap doubles).

---

### Q90. What is escape analysis?

**Answer:**
The Go compiler decides whether to allocate a variable on the **stack** (fast, no GC) or **heap** (GC-managed) using escape analysis.

```go
// Stack allocated — doesn't escape
func stackAlloc() int {
    x := 42
    return x
}

// Heap allocated — escapes via pointer
func heapAlloc() *int {
    x := 42
    return &x  // x escapes to heap
}

// Check with:
// go build -gcflags='-m' ./...
```

---

### Q91. What is a build tag?

**Answer:**
Build tags conditionally compile files.

```go
//go:build linux

package main

// This file only compiles on Linux
func platformName() string { return "linux" }
```

```bash
go build -tags integration ./...  # include files tagged "integration"
```

---

### Q92. How does embedding interfaces work?

**Answer:**
An interface can embed other interfaces.

```go
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type ReadWriter interface {
    Reader  // embeds Reader
    Writer  // embeds Writer
}

// A type satisfying ReadWriter must implement both Read and Write
```

---

### Q93. What is the difference between goroutine stack and heap?

**Answer:**
- **Stack**: per-goroutine, starts at 2KB, grows/shrinks automatically, very fast allocation
- **Heap**: shared, GC-managed, slower allocation

```go
func main() {
    // Stack — local var, doesn't escape
    x := 42
    fmt.Println(x)

    // Heap — returned pointer escapes
    p := new(int)
    *p = 42
    useGlobally(p)
}
```

Go's goroutine stacks are segmented/copied (not fixed), allowing millions of goroutines.

---

### Q94. What is a memory leak in Go and how do you find it?

**Answer:**
Common causes:
1. Goroutine leaks (blocked goroutines)
2. Forgotten cache entries (unbounded maps)
3. Unclosed file handles / connections

```go
// Goroutine leak — goroutine blocked forever
go func() {
    ch := make(chan int)
    <-ch  // never unblocked
}()

// Detection
import _ "net/http/pprof"

// http://localhost:6060/debug/pprof/goroutine
// go tool pprof http://localhost:6060/debug/pprof/heap
```

```bash
go tool pprof -http=:8081 cpu.prof
```

---

## Section 16: Tricky / Gotchas

---

### Q95. What is the output of this code?

```go
for i := 0; i < 3; i++ {
    go func() {
        fmt.Println(i)
    }()
}
time.Sleep(time.Second)
```

**Answer:**
Likely prints `3 3 3` (not `0 1 2`). All goroutines capture the same `i` variable. By the time they run, the loop has finished and `i == 3`.

**Fix:**
```go
for i := 0; i < 3; i++ {
    i := i  // shadow with new variable
    go func() {
        fmt.Println(i)  // each goroutine has its own i
    }()
}
// OR pass as argument:
go func(n int) { fmt.Println(n) }(i)
```

---

### Q96. What happens when you range over a nil map?

**Answer:**
Ranging over a nil map is safe — it simply iterates zero times.

```go
var m map[string]int  // nil

for k, v := range m {
    fmt.Println(k, v)  // never executes
}
fmt.Println("done")  // prints "done"

// But writing to a nil map panics:
m["key"] = 1  // PANIC: assignment to entry in nil map
```

---

### Q97. What is the difference between `fmt.Println` and `fmt.Fprintln`?

**Answer:**
- `fmt.Println` writes to `os.Stdout`
- `fmt.Fprintln` writes to any `io.Writer`

```go
// To stdout
fmt.Println("hello")

// To stderr
fmt.Fprintln(os.Stderr, "error occurred")

// To a buffer (useful in tests)
var buf bytes.Buffer
fmt.Fprintln(&buf, "captured")
fmt.Println(buf.String())  // "captured\n"
```

---

### Q98. Can you return multiple values from a Go function and ignore some?

**Answer:**
Yes, use the blank identifier `_`.

```go
func getUser() (string, int, error) {
    return "Alice", 30, nil
}

name, _, err := getUser()  // ignore age
_, age, _ := getUser()     // ignore name and error
```

---

### Q99. What is the difference between `os.Exit` and `panic`?

**Answer:**

| | `os.Exit` | `panic` |
|---|---|---|
| Defers run? | No | Yes |
| Recoverable? | No | Yes (with recover) |
| Stack trace? | No | Yes |
| Use for | Normal program exit | Unrecoverable errors |

```go
// os.Exit — immediate termination, defers NOT called
defer fmt.Println("this won't print")
os.Exit(1)

// panic — unwinds stack, defers run, can be recovered
defer func() {
    if r := recover(); r != nil {
        fmt.Println("recovered:", r)
    }
}()
panic("something went wrong")
```

---

### Q100. How do you implement graceful shutdown of an HTTP server?

**Answer:**
```go
func main() {
    srv := &http.Server{Addr: ":8080", Handler: myHandler()}

    // Start server in goroutine
    go func() {
        if err := srv.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatalf("server error: %v", err)
        }
    }()

    // Wait for interrupt signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit
    fmt.Println("shutting down...")

    // Give existing requests 30 seconds to complete
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        log.Fatal("forced shutdown:", err)
    }
    fmt.Println("server stopped")
}
```

---

## Quick Reference

| Topic | Key Points |
|---|---|
| Goroutines | `go func()`, lightweight, ~2KB stack |
| Channels | `make(chan T)`, send `ch<-`, receive `<-ch` |
| Select | Multiplex channels, random if many ready |
| WaitGroup | `Add`, `Done`, `Wait` |
| Mutex | `Lock`/`Unlock`, use `defer` |
| Context | `WithCancel`, `WithTimeout`, pass first arg |
| Errors | Values not exceptions, wrap with `%w` |
| Defer | LIFO, evaluates args immediately |
| Interfaces | Implicit, satisfied by method set |
| Generics | `[T any]`, `[T Number]` |
