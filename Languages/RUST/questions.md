# 100 Rust Interview Preparation Questions

## Rust Fundamentals

1. What is Rust, and what types of problems is it designed to solve?
2. What are Rust's main advantages compared with C and C++?
3. What does "zero-cost abstraction" mean in Rust?
4. What is the difference between a statement and an expression in Rust?
5. Why are variables immutable by default in Rust?
6. How do `let`, `mut`, and `const` differ?
7. What is variable shadowing, and how is it different from mutation?
8. What scalar and compound data types does Rust provide?
9. What is the difference between an array, a tuple, and a vector?
10. How do `String` and `&str` differ?

## Ownership, Borrowing, and Lifetimes

11. What is ownership in Rust?
12. What are Rust's three ownership rules?
13. What happens when ownership of a value is moved?
14. Which types implement the `Copy` trait, and how does copying differ from moving?
15. What is borrowing in Rust?
16. What is the difference between `&T` and `&mut T`?
17. Why can Rust allow either many immutable references or one mutable reference at a time?
18. What is a dangling reference, and how does Rust prevent one?
19. What is a slice, and why does it not own its data?
20. When would you use `clone()` instead of relying on a move or copy?
21. What is the borrow checker responsible for?
22. What is a lifetime in Rust?
23. Why are explicit lifetime annotations sometimes required?
24. What do lifetime annotations describe—and what do they not change?
25. What is lifetime elision?
26. What does the `'static` lifetime mean?
27. How do lifetime parameters work in structs?
28. Can a reference outlive the value it points to? Why or why not?
29. What is reborrowing?
30. How can returning references from functions cause lifetime errors?

## Structs, Enums, and Pattern Matching

31. How do named-field, tuple, and unit-like structs differ?
32. What is the difference between an associated function and a method?
33. What does the `self` parameter represent in a method?
34. When should a method take `self`, `&self`, or `&mut self`?
35. Why are Rust enums more powerful than enums in many other languages?
36. How can enum variants store different kinds of data?
37. What problem does `Option<T>` solve?
38. What problem does `Result<T, E>` solve?
39. How does a `match` expression work?
40. Why must `match` expressions be exhaustive?
41. When would you use `if let` instead of `match`?
42. When would you use `let else`?
43. What are match guards?
44. How does destructuring work with structs, tuples, and enums?
45. What does the wildcard pattern `_` do?

## Traits, Generics, and Type System

46. What is a trait, and how is it similar to an interface?
47. How do you implement a trait for a type?
48. What are default trait methods?
49. What is a trait bound?
50. What is the difference between `impl Trait` and a generic type parameter?
51. What is static dispatch?
52. What is dynamic dispatch?
53. What is a trait object, such as `dyn Display`?
54. When would you use `Box<dyn Trait>`?
55. What makes a trait object-safe (dyn-compatible)?
56. What are associated types in traits?
57. How do associated types differ from generic type parameters?
58. What is the orphan rule?
59. What is the newtype pattern, and why is it useful?
60. What is monomorphization?

## Memory and Smart Pointers

61. What is the difference between stack and heap allocation?
62. What is `Box<T>`, and when should it be used?
63. Why are recursive types often stored behind `Box<T>`?
64. What is `Deref`, and what is deref coercion?
65. What is `Drop`, and when is it called?
66. What is RAII, and how does Rust use it for resource management?
67. What is `Rc<T>` used for?
68. What is `Arc<T>` used for?
69. Why is `Rc<T>` not safe to share across threads?
70. What are `Cell<T>` and `RefCell<T>` used for?
71. What does interior mutability mean?
72. How does `RefCell<T>` enforce borrowing rules at runtime?
73. What is a reference cycle, and how can `Weak<T>` help prevent it?
74. What is the difference between `Rc<RefCell<T>>` and `Arc<Mutex<T>>`?
75. When should you avoid unnecessary heap allocation?

## Error Handling, Modules, and Collections

76. What is the difference between recoverable and unrecoverable errors in Rust?
77. When should you use `panic!` instead of returning `Result`?
78. What do the `unwrap()` and `expect()` methods do?
79. How does the `?` operator propagate errors?
80. How can you define a custom error type?
81. What roles do packages, crates, modules, and paths play in Rust?
82. What is the difference between a binary crate and a library crate?
83. How do `pub`, `use`, and `mod` affect visibility and organization?
84. What is Cargo, and what information belongs in `Cargo.toml`?
85. How do `Vec<T>`, `HashMap<K, V>`, and `HashSet<T>` differ?

## Concurrency, Async, Testing, and Performance

86. How do you create and join a thread in Rust?
87. What does the `move` keyword do in a thread closure?
88. What are the `Send` and `Sync` marker traits?
89. How does `Mutex<T>` provide shared mutable state safely?
90. What is the difference between channels and shared-state concurrency?
91. What is a data race, and how does Rust prevent it?
92. What are futures, and how does `async`/`.await` work in Rust?
93. Why does an async Rust program need an executor or runtime?
94. What is pinning, and why can `Pin<T>` matter for futures?
95. How do unit tests, integration tests, and documentation tests differ?
96. How do you write and run tests with Cargo?
97. What is the purpose of `#[derive(Debug, Clone, PartialEq)]`?
98. What is `unsafe` Rust, and which extra guarantees must a programmer uphold?
99. How would you investigate and improve the performance of a Rust program?
100. How would you design a small production Rust service to be reliable, testable, and maintainable?

## Answer Key

1. Rust is a systems programming language focused on performance, memory safety, and safe concurrency. It is well suited to operating systems, command-line tools, embedded software, network services, and other performance-sensitive applications.
2. Rust offers C/C++-like speed and control while preventing many memory errors and data races at compile time. It also provides Cargo, modern generics, algebraic enums, pattern matching, and strong tooling.
3. A zero-cost abstraction adds no unnecessary runtime overhead compared with an equivalent hand-written low-level implementation. Rust generally resolves abstractions such as iterators and generics during compilation.
4. A statement performs an action and normally has no resulting value; an expression evaluates to a value. Expressions usually omit a trailing semicolon, while adding one turns the expression into a statement returning `()`.
5. Default immutability makes state changes explicit, improves readability, and helps prevent accidental mutation. A variable must be declared with `mut` when its value needs to change.
6. `let` creates a variable, `let mut` creates a mutable variable, and `const` defines a compile-time constant that requires a type annotation. Constants cannot be made mutable and may be declared in broader scopes.
7. Shadowing declares a new variable with the same name and may change its type. Mutation changes the value of the same mutable variable and must preserve its type.
8. Scalar types include integers, floating-point numbers, `bool`, and `char`. Compound types include tuples and fixed-length arrays.
9. Arrays have a fixed length and one element type, tuples have a fixed length and may contain different types, and vectors are growable heap-allocated collections containing one element type.
10. `String` is an owned, growable, heap-allocated UTF-8 string. `&str` is a borrowed string slice that refers to UTF-8 data owned elsewhere or stored in the binary.
11. Ownership is Rust's system for managing memory without a garbage collector. Each value has an owner responsible for cleaning it up when the owner leaves scope.
12. Each value has exactly one owner; only one owner exists at a time; and the value is dropped when its owner leaves scope.
13. For a non-`Copy` type, assigning or passing the value transfers ownership and invalidates the old binding. This prevents two owners from freeing the same allocation.
14. Simple stack-only types such as integers, booleans, and some tuples commonly implement `Copy`. Copying duplicates bits and leaves both bindings usable; moving transfers ownership and invalidates the source.
15. Borrowing temporarily accesses a value through a reference without taking ownership. The owner remains responsible for the value.
16. `&T` is a shared immutable reference; `&mut T` is an exclusive mutable reference. A mutable reference can change the borrowed value.
17. This rule prevents reads and writes from overlapping unsafely. It eliminates iterator invalidation and data races while allowing multiple readers when no writer exists.
18. A dangling reference points to memory that is no longer valid. Rust's lifetime and borrow checks reject code in which a reference could outlive its referent.
19. A slice is a reference to a contiguous portion of a collection. It contains a pointer and length but borrows rather than owns the underlying data.
20. Use `clone()` when an independent owned duplicate is genuinely required. Avoid cloning merely to silence borrow-checker errors because it may allocate or copy expensive data.
21. The borrow checker verifies that references are valid and that aliasing rules are followed. It prevents use-after-free, invalid mutation, and many data races at compile time.
22. A lifetime represents the region of code for which a reference is valid. The compiler uses it to ensure references never outlive their data.
23. Annotations are needed when the compiler cannot infer how input and output reference lifetimes relate. They make those relationships explicit rather than extending any lifetime.
24. Lifetime annotations describe relationships between references. They do not make values live longer or change runtime behavior.
25. Lifetime elision is the compiler's use of standard rules to infer common reference lifetimes in function signatures, allowing annotations to be omitted.
26. `'static` means a reference can remain valid for the entire program, as with string literals, or that an owned type contains no borrowed data with a shorter lifetime. It does not mean every such value lives forever.
27. A struct holding a reference declares a lifetime parameter, such as `struct View<'a> { text: &'a str }`. This prevents the struct from outliving the referenced data.
28. No. Once the referenced value is dropped, the reference would be invalid, so Rust rejects any path that lets the reference outlive it.
29. Reborrowing creates a shorter-lived reference from an existing reference, such as deriving `&T` from `&mut T`. The original reference becomes usable again after the reborrow ends.
30. A returned reference must point to data that survives the function, usually data borrowed from an input. Returning a reference to a local variable is rejected because that local is dropped on return.
31. Named-field structs label each field, tuple structs identify fields by position, and unit-like structs contain no fields. The appropriate form depends on whether names or stored state add meaning.
32. An associated function belongs to a type and has no `self` parameter, such as `String::new`. A method takes `self`, `&self`, or `&mut self` and is called on an instance.
33. `self` is the current instance on which a method is invoked. Its form determines whether the method consumes, reads, or mutates that instance.
34. Use `self` to consume ownership, `&self` for read-only borrowing, and `&mut self` to modify the instance without consuming it.
35. Each Rust enum variant can carry different typed data. Enums therefore model alternatives and state machines safely, especially when combined with exhaustive pattern matching.
36. Fields may be attached to each variant using unit-like, tuple-like, or struct-like syntax. Every variant can have a different payload shape.
37. `Option<T>` explicitly represents either a value with `Some(T)` or absence with `None`, avoiding null-reference ambiguity.
38. `Result<T, E>` represents either success with `Ok(T)` or failure with `Err(E)`, making recoverable errors explicit in the type system.
39. `match` compares a value against patterns and evaluates the first matching arm. It can destructure values and returns a value itself.
40. Exhaustiveness ensures every possible value is handled. This prevents forgotten enum states and makes changes to enums easier to catch during compilation.
41. Use `if let` when only one pattern matters and all remaining cases can be ignored or handled by a simple `else`.
42. `let else` destructures a successful pattern and requires the `else` branch to diverge, such as by returning. It keeps the successful path less deeply nested.
43. A match guard is an additional `if` condition on a match arm. The arm runs only when both its pattern and guard match.
44. Destructuring binds selected components of a compound value directly in a pattern. It can extract fields or elements while ignoring the rest with `_` or `..`.
45. `_` matches any value without binding it. It is useful for deliberately ignored values or fallback match arms.
46. A trait defines shared behavior through required or default methods. Like an interface, it lets code depend on capabilities rather than a specific concrete type.
47. Use an `impl TraitName for Type` block and provide the required items. The implementation must also obey Rust's coherence and orphan rules.
48. Default methods have an implementation in the trait itself. Implementing types inherit it unless they provide their own permitted override.
49. A trait bound restricts a generic parameter to types implementing specified behavior, for example `T: Display + Clone`.
50. A generic parameter names a type and can express repeated relationships in a signature. `impl Trait` is concise for accepting or returning a value implementing a trait, although return-position `impl Trait` represents one hidden concrete type.
51. Static dispatch selects a concrete implementation at compile time, commonly through generics. It enables inlining but can increase binary size through monomorphization.
52. Dynamic dispatch selects an implementation at runtime through a trait object and vtable. It supports heterogeneous values at the cost of indirection and reduced optimization opportunities.
53. A trait object such as `dyn Display` is a dynamically dispatched value implementing a compatible trait. It is used behind a pointer like `&dyn Display` or `Box<dyn Display>` because its size is not known statically.
54. Use `Box<dyn Trait>` for owned, heap-allocated values whose concrete types may differ but expose the same behavior, such as plugin implementations.
55. A dyn-compatible trait must support calls through a trait object. Among other restrictions, object-called methods cannot depend on an unknown `Self` size or have unconstrained generic parameters.
56. An associated type is a placeholder type chosen by each trait implementation, such as an iterator's `Item` type.
57. Associated types usually allow one chosen type per implementation and simplify signatures. Generic parameters can permit multiple implementations of the same trait for different type arguments.
58. The orphan rule generally allows a trait implementation only when either the trait or the target type is defined in the current crate. This preserves globally consistent implementations.
59. The newtype pattern wraps an existing type in a one-field tuple struct. It creates a distinct type for validation, stronger semantics, or legal trait implementations with no runtime overhead.
60. Monomorphization generates concrete code for the generic types actually used. This provides static dispatch and performance but may increase compile time and binary size.
61. Stack allocation is fast, scoped, and requires statically known sizes. Heap allocation supports dynamically sized or longer-lived owned data through pointers but adds allocation and indirection costs.
62. `Box<T>` owns a value allocated on the heap and has a known pointer size. Use it for large values, recursive types, trait objects, or ownership requiring stable indirection.
63. Direct recursive definitions would have infinite compile-time size. A `Box` adds fixed-size indirection, allowing the recursive structure to have a finite representation.
64. `Deref` defines access to a target through `*`. Deref coercion automatically converts references to smart pointers into references to their targets in suitable contexts.
65. `Drop` defines cleanup performed automatically when a value leaves scope. It is used to release resources such as heap memory, files, locks, and network connections.
66. RAII ties resource acquisition to object construction and release to destruction. Rust's ownership and `Drop` make cleanup deterministic even during early returns or panics while unwinding.
67. `Rc<T>` provides single-threaded shared ownership through reference counting. The value is dropped after the last strong owner is dropped.
68. `Arc<T>` provides atomic reference-counted shared ownership across threads. Atomic counting adds overhead but makes ownership sharing thread-safe when the contained type also permits it.
69. `Rc<T>` updates its count non-atomically, so concurrent access could race. It therefore does not implement the thread-transfer and sharing traits required for cross-thread use.
70. `Cell<T>` and `RefCell<T>` provide interior mutability. `Cell` replaces or copies values without references, while `RefCell` allows runtime-checked borrowed references.
71. Interior mutability means changing data through an apparently immutable shared reference. Safe wrapper types enforce the required invariants through runtime checks or restricted operations.
72. `RefCell<T>` tracks active shared and mutable borrows at runtime. Violating the one-writer-or-many-readers rule causes a panic rather than a compile-time error.
73. A strong-reference cycle keeps reference counts above zero and leaks values. `Weak<T>` creates non-owning links that do not keep the allocation alive, commonly for parent pointers.
74. `Rc<RefCell<T>>` supports shared mutable ownership within one thread. `Arc<Mutex<T>>` supports shared mutable ownership across threads using atomic counting and locking.
75. Avoid heap allocation when stack storage or borrowing is sufficient. Unnecessary allocation adds latency, fragmentation, indirection, and ownership complexity.
76. Recoverable errors are represented with `Result` and can be handled by callers. Unrecoverable invariant violations or impossible states may use `panic!`.
77. Use `panic!` for programming bugs, broken invariants, or states from which safe continuation is impossible—not for routine input, I/O, or network failures.
78. `unwrap()` returns the success value or panics with a standard message. `expect()` does the same but adds a programmer-supplied context message; both should be used deliberately.
79. `?` extracts a success value or returns early with a converted error. It works in functions whose return type supports the relevant residual conversion, commonly `Result` or `Option`.
80. Define an enum or struct describing failure cases, implement `Display` and `Error`, and provide conversions such as `From` when appropriate. Error-derivation crates can reduce boilerplate.
81. A package is a Cargo project, a crate is a compilation unit, modules organize names and visibility within a crate, and paths identify items.
82. A binary crate has an executable entry point such as `main`; a library crate exposes reusable functionality. A package may contain both.
83. `mod` declares or defines a module, `pub` exposes an item beyond its default privacy boundary, and `use` brings a path into scope.
84. Cargo builds, tests, runs, documents, and manages dependencies for Rust projects. `Cargo.toml` stores package metadata, dependencies, features, targets, and build profiles.
85. `Vec<T>` is an ordered growable sequence, `HashMap<K, V>` maps unique keys to values, and `HashSet<T>` stores unique values without associated values.
86. Call `std::thread::spawn` with a closure and retain its `JoinHandle`. Calling `join()` waits for completion and returns either the thread's result or panic information.
87. A `move` closure takes ownership of captured values instead of borrowing them. This is often required because a spawned thread may outlive its creator's stack frame.
88. `Send` means ownership of a value can safely cross thread boundaries. `Sync` means shared references to the type can safely be used across threads.
89. `Mutex<T>` allows only one thread at a time to access its protected value. Locking returns a guard that dereferences to the data and unlocks automatically when dropped.
90. Channels communicate by sending values and often transfer ownership, reducing shared state. Shared-state concurrency uses synchronized common memory and is suitable when many workers need coordinated access.
91. A data race requires concurrent access to the same memory, at least one write, and no synchronization. Rust's ownership, `Send`/`Sync`, and synchronization types prevent safe code from meeting those conditions.
92. A future represents a value that may become available later. `async` creates a lazy state machine, and `.await` yields control while a future is pending rather than blocking the thread.
93. Futures do nothing unless repeatedly polled. An executor schedules and polls ready futures, while a runtime may also provide timers, I/O reactors, and task spawning.
94. Pinning prevents a value from being moved after it is pinned. It matters for self-referential state machines, including some futures whose internal references would become invalid if moved.
95. Unit tests usually live beside implementation code and can test private items; integration tests live under `tests/` and use the public API; documentation tests compile and run examples from doc comments.
96. Add functions marked `#[test]`, usually inside a `#[cfg(test)]` module, and run them with `cargo test`. Assertions include `assert!`, `assert_eq!`, and `assert_ne!`.
97. `derive` asks the compiler to generate standard trait implementations. These traits enable debug formatting, explicit cloning, and equality comparisons when every field supports them.
98. `unsafe` permits a small set of operations the compiler cannot verify, such as dereferencing raw pointers. The programmer must still uphold aliasing, validity, initialization, alignment, and thread-safety invariants.
99. Measure first with realistic benchmarks and profilers, locate actual hotspots, then examine algorithms, allocation, copying, cache behavior, locking, and I/O. Re-measure after each meaningful change.
100. Separate domain logic from I/O, use explicit types and errors, validate inputs, add unit and integration tests, log useful context, handle shutdown and timeouts, minimize shared mutable state, pin dependencies, and monitor production behavior.
