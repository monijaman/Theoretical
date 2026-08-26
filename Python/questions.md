# Python — 100 Interview Questions & Answers

---

## Section 1: Basics & Data Types

---

### Q1. What are the key differences between Python 2 and Python 3?

**Answer:**
Python 2 reached end-of-life in 2020 — all new work should target Python 3.

| | Python 2 | Python 3 |
|---|---|---|
| `print` | statement | function `print()` |
| Division `/` | integer division for ints | always float (`//` for floor) |
| Strings | ASCII by default | Unicode (`str`) by default |
| `range()` | returns a list | returns a lazy iterator |

```python
# Python 3
print("hello")
5 / 2    # 2.5
5 // 2   # 2
```

---

### Q2. What is the difference between a list and a tuple?

**Answer:**
```python
my_list = [1, 2, 3]   # mutable — can change, append, remove
my_tuple = (1, 2, 3)  # immutable — fixed once created

my_list.append(4)     # OK
# my_tuple.append(4)  # AttributeError

my_list[0] = 99        # OK
# my_tuple[0] = 99      # TypeError
```
Tuples are also slightly faster and can be used as dict keys / set members (lists cannot, since they're unhashable).

---

### Q3. What is the difference between `is` and `==`?

**Answer:**
- `==` compares **values**
- `is` compares **identity** (same object in memory)

```python
a = [1, 2, 3]
b = [1, 2, 3]
a == b   # True — same value
a is b   # False — different objects

c = a
c is a   # True — same object

# Common pitfall with small ints and None
x = None
x is None   # True — always use `is` for None checks, never ==
```

---

### Q4. What are Python's built-in data types?

**Answer:**
```python
int, float, complex          # numeric
str                            # text
bool                           # boolean
list, tuple, range             # sequences
dict                            # mapping
set, frozenset                  # sets
bytes, bytearray, memoryview    # binary
NoneType                         # None
```

---

### Q5. What is the difference between mutable and immutable objects?

**Answer:**
- **Mutable**: `list`, `dict`, `set`, custom classes (by default) — can be changed in place
- **Immutable**: `int`, `float`, `str`, `tuple`, `frozenset`, `bool` — cannot be changed once created

```python
s = "hello"
s[0] = "H"   # TypeError — strings are immutable
s = "Hello"  # this creates a NEW string object, doesn't modify the old one

lst = [1, 2, 3]
lst[0] = 99  # OK — lists are mutable, modified in place
```

This distinction matters most for function arguments and default values (see [Q23](#q23-why-is-using-a-mutable-default-argument-dangerous)).

---

### Q6. What is duck typing?

**Answer:**
"If it walks like a duck and quacks like a duck, it's a duck." Python cares about an object's behavior (methods/attributes it has), not its declared type.

```python
class Duck:
    def quack(self):
        return "Quack!"

class Person:
    def quack(self):
        return "I'm quacking!"

def make_it_quack(thing):
    print(thing.quack())   # works for ANY object with a .quack() method

make_it_quack(Duck())
make_it_quack(Person())
```

---

### Q7. What is the difference between `list.sort()` and `sorted()`?

**Answer:**
```python
nums = [3, 1, 4, 1, 5]

nums.sort()          # sorts in place, returns None
print(nums)           # [1, 1, 3, 4, 5]

nums2 = [3, 1, 4, 1, 5]
result = sorted(nums2)  # returns a NEW sorted list, original unchanged
print(nums2)              # [3, 1, 4, 1, 5] — unchanged
print(result)              # [1, 1, 3, 4, 5]

# Both accept key and reverse
sorted(nums, key=lambda x: -x)
sorted(nums, reverse=True)
```
`.sort()` only works on lists; `sorted()` works on any iterable.

---

### Q8. How does Python manage memory?

**Answer:**
- Every object has a reference count; when it drops to 0, memory is freed immediately
- A cyclic garbage collector handles reference cycles (e.g. objects referencing each other) that reference counting alone can't clean up
- CPython also uses object pooling/caching for small integers (-5 to 256) and short strings

```python
import sys
sys.getrefcount(some_object)   # current reference count

import gc
gc.collect()   # force a garbage collection cycle
```

---

### Q9. What is the difference between `deepcopy` and `copy`?

**Answer:**
```python
import copy

original = [[1, 2], [3, 4]]

shallow = copy.copy(original)       # copies outer list, inner lists SHARED
shallow[0][0] = 99
print(original[0][0])                # 99 — changed! (shared reference)

deep = copy.deepcopy(original)      # recursively copies everything
deep[0][0] = 42
print(original[0][0])                # 99 — unaffected by deepcopy
```

---

### Q10. What is the difference between `range()` and a list?

**Answer:**
`range()` is a lazy sequence — it doesn't store all values in memory, it computes them on demand.

```python
r = range(1_000_000)     # instant, uses constant memory
lst = list(range(1_000_000))   # actually allocates a million-item list

r[500]        # 500 — supports indexing
len(r)         # 1000000
500000 in r    # True — supports fast membership check
```

---

## Section 2: Strings & Operators

---

### Q11. How do you reverse a string in Python?

**Answer:**
```python
s = "hello"
s[::-1]              # 'olleh' — slicing trick
"".join(reversed(s))  # 'olleh' — using reversed()
```

---

### Q12. What is string interning?

**Answer:**
CPython caches ("interns") some strings — short identifier-like strings and string literals — so identical values may share the same object in memory.

```python
a = "hello"
b = "hello"
a is b   # True — likely interned (literal, identifier-safe)

c = "hello world!"
d = "hello world!"
c is d   # may be False — not guaranteed to be interned

import sys
e = sys.intern("hello world!")
```
Always use `==` for string value comparison; don't rely on `is`.

---

### Q13. What is the difference between `str.format()` and f-strings?

**Answer:**
```python
name, age = "Alice", 30

"{} is {}".format(name, age)   # old style
f"{name} is {age}"              # f-strings (Python 3.6+) — faster, more readable

# f-strings evaluate expressions directly
f"{age * 2}"
f"{'yes' if age > 18 else 'no'}"
```
f-strings are the modern standard — prefer them unless you're building a format string dynamically at runtime (then `.format()` is more flexible).

---

### Q14. What does the `%` operator do besides modulo?

**Answer:**
It's also the old-style string formatting operator (predates `.format()` and f-strings).

```python
5 % 2                 # 1 — modulo
"Hello, %s!" % "world"   # 'Hello, world!' — string formatting
"%d + %d = %d" % (2, 3, 5)
```

---

### Q15. What is the Global Interpreter Lock (GIL)?

**Answer:**
The GIL is a mutex in CPython that allows only one thread to execute Python bytecode at a time, even on multi-core machines. It simplifies memory management (reference counting is not thread-safe otherwise) but means threads don't achieve true CPU parallelism.

```python
# Threads DON'T speed up CPU-bound work due to the GIL
import threading
def cpu_heavy():
    sum(i * i for i in range(10_000_000))

threads = [threading.Thread(target=cpu_heavy) for _ in range(4)]
# runs roughly as slow as sequential, sometimes slower (context-switch overhead)
```
Workaround: use `multiprocessing` for CPU-bound work (see [Q21](#section-8-concurrency)), or use I/O-bound `threading`/`asyncio` where the GIL is released during I/O waits.

---

## Section 3: Functions & Scope

---

### Q16. What is the difference between `*args` and `**kwargs`?

**Answer:**
```python
def func(*args, **kwargs):
    print(args)     # tuple of positional args
    print(kwargs)   # dict of keyword args

func(1, 2, 3, name="Alice", age=30)
# (1, 2, 3)
# {'name': 'Alice', 'age': 30}

# Unpacking when calling
def add(a, b, c):
    return a + b + c

nums = [1, 2, 3]
add(*nums)          # unpack list as positional args

kwargs = {"a": 1, "b": 2, "c": 3}
add(**kwargs)        # unpack dict as keyword args
```

---

### Q17. What is a closure?

**Answer:**
A function that "remembers" variables from its enclosing scope even after that scope has finished executing.

```python
def make_counter():
    count = 0
    def counter():
        nonlocal count
        count += 1
        return count
    return counter

c1 = make_counter()
print(c1())   # 1
print(c1())   # 2

c2 = make_counter()   # independent closure
print(c2())   # 1
```

---

### Q18. What is the difference between `nonlocal` and `global`?

**Answer:**
```python
x = "global value"

def outer():
    y = "enclosing value"
    def inner():
        nonlocal y    # refers to outer()'s y, NOT global x
        y = "changed"
    inner()
    print(y)   # "changed"

def modify_global():
    global x
    x = "changed globally"
```
Use `global` to modify a module-level variable from inside a function; `nonlocal` for a variable in an enclosing (but not global) scope.

---

### Q19. What are lambda functions and when should you avoid them?

**Answer:**
```python
square = lambda x: x ** 2      # anonymous, single-expression function
square(5)   # 25

# Common: as a key function
sorted(people, key=lambda p: p["age"])
```
Avoid lambdas for anything beyond a trivial expression — assign a `def` function with a real name instead for readability and easier debugging (tracebacks show `<lambda>` rather than a meaningful name).

---

### Q20. What is the difference between a function and a method?

**Answer:**
```python
def greet(name):        # a standalone function
    return f"Hi {name}"

class Greeter:
    def greet(self, name):   # a method — bound to an instance via `self`
        return f"Hi {name}"

g = Greeter()
g.greet("Alice")        # Python auto-passes g as `self`
Greeter.greet(g, "Alice")   # equivalent, explicit form
```

---

### Q21. What are positional-only and keyword-only parameters?

**Answer:**
```python
def func(a, b, /, c, d, *, e, f):
    #        ^ pos-only    ^ kw-only
    pass

func(1, 2, 3, d=4, e=5, f=6)   # OK
# func(1, 2, c=3, d=4, e=5, f=6)  # OK — c, d can be positional or keyword
# func(a=1, b=2, c=3, d=4, e=5, f=6)  # TypeError — a, b must be positional
# func(1, 2, 3, 4, 5, 6)              # TypeError — e, f must be keyword
```
Useful in library APIs to lock down calling conventions (Python 3.8+).

---

### Q22. What does `functools.reduce` do?

**Answer:**
```python
from functools import reduce

nums = [1, 2, 3, 4]
total = reduce(lambda acc, n: acc + n, nums)          # 10
total_with_start = reduce(lambda acc, n: acc + n, nums, 100)  # 110

# Compare to a simple loop — reduce is rarely more readable than:
total = 0
for n in nums:
    total += n
```

---

### Q23. Why is using a mutable default argument dangerous?

**Answer:**
Default argument values are evaluated **once**, when the function is defined — not on every call.

```python
def add_item(item, items=[]):   # DANGEROUS — the same list persists across calls!
    items.append(item)
    return items

add_item("a")   # ['a']
add_item("b")   # ['a', 'b']  — surprise! Same list reused.

# CORRECT fix
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
```

---

## Section 4: Object-Oriented Programming

---

### Q24. What is the difference between a class method, static method, and instance method?

**Answer:**
```python
class MyClass:
    def instance_method(self):
        return f"called by instance {self}"

    @classmethod
    def class_method(cls):
        return f"called on class {cls}"

    @staticmethod
    def static_method():
        return "called with no implicit first arg"
```
- **Instance method**: needs `self`, operates on one object
- **Class method**: needs `cls`, often used as an alternate constructor
- **Static method**: needs neither, just lives in the class namespace for organization

---

### Q25. What is `__init__` vs `__new__`?

**Answer:**
```python
class MyClass:
    def __new__(cls, *args, **kwargs):
        print("creating the instance")
        instance = super().__new__(cls)
        return instance

    def __init__(self, value):
        print("initializing the instance")
        self.value = value

MyClass(5)
# creating the instance
# initializing the instance
```
`__new__` actually **creates** the object (rarely overridden — mainly for immutable types or metaclasses); `__init__` **initializes** an already-created object.

---

### Q26. What is multiple inheritance and the MRO (Method Resolution Order)?

**Answer:**
```python
class A:
    def greet(self): return "A"

class B(A):
    def greet(self): return "B"

class C(A):
    def greet(self): return "C"

class D(B, C):
    pass

D().greet()          # 'B' — follows MRO
D.__mro__             # (D, B, C, A, object)
```
Python uses the **C3 linearization** algorithm to compute a consistent method resolution order — left-to-right, depth-first, but avoiding revisiting a class before its subclasses.

---

### Q27. What are dunder (magic) methods? Give common examples.

**Answer:**
```python
class Vector:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __add__(self, other):           # +
        return Vector(self.x + other.x, self.y + other.y)

    def __eq__(self, other):             # ==
        return self.x == other.x and self.y == other.y

    def __repr__(self):                   # debugging representation
        return f"Vector({self.x}, {self.y})"

    def __len__(self):                     # len(obj)
        return int((self.x**2 + self.y**2) ** 0.5)

    def __getitem__(self, index):           # obj[index]
        return (self.x, self.y)[index]

v1, v2 = Vector(1, 2), Vector(3, 4)
v1 + v2       # Vector(4, 6)
v1 == v2      # False
```

---

### Q28. What is the difference between `__str__` and `__repr__`?

**Answer:**
```python
class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __str__(self):    # for end users — readable
        return f"({self.x}, {self.y})"

    def __repr__(self):    # for developers — unambiguous, ideally eval-able
        return f"Point(x={self.x}, y={self.y})"

p = Point(1, 2)
print(p)        # uses __str__: (1, 2)
print(repr(p))  # uses __repr__: Point(x=1, y=2)
[p]              # in containers/debuggers, __repr__ is used: [Point(x=1, y=2)]
```
If `__str__` isn't defined, Python falls back to `__repr__`.

---

### Q29. What is encapsulation in Python? How do name-mangled attributes work?

**Answer:**
Python has no true "private" — it's convention-based, plus one mangling trick.

```python
class Account:
    def __init__(self, balance):
        self.balance = balance         # public
        self._pin = "1234"              # "protected" — convention only, still accessible
        self.__secret = "hidden"        # name-mangled

a = Account(100)
a._pin                # accessible (just a convention not to touch it)
# a.__secret            # AttributeError
a._Account__secret     # actually accessible via the mangled name
```
Double-underscore prefixes trigger **name mangling** (`__secret` becomes `_Account__secret`) — mainly meant to avoid attribute name clashes in inheritance, not true privacy.

---

### Q30. What is an abstract base class (ABC)?

**Answer:**
```python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self):
        pass

class Circle(Shape):
    def __init__(self, radius):
        self.radius = radius
    def area(self):
        return 3.14159 * self.radius ** 2

# Shape()          # TypeError — can't instantiate abstract class
c = Circle(5)
c.area()             # 78.54 — works, implements the abstract method
```
Forces subclasses to implement specific methods, catching missing implementations at instantiation time rather than at first call.

---

### Q31. What is multiple inheritance vs mixins?

**Answer:**
A mixin is a small class meant to add reusable behavior via multiple inheritance, not to stand on its own.

```python
class JSONSerializableMixin:
    def to_json(self):
        import json
        return json.dumps(self.__dict__)

class LoggingMixin:
    def log(self, msg):
        print(f"[{self.__class__.__name__}] {msg}")

class User(JSONSerializableMixin, LoggingMixin):
    def __init__(self, name):
        self.name = name

u = User("Alice")
u.to_json()   # '{"name": "Alice"}'
u.log("created")   # "[User] created"
```

---

### Q32. What is a metaclass?

**Answer:**
A metaclass is "the class of a class" — it controls how classes themselves are created.

```python
class Meta(type):
    def __new__(mcs, name, bases, namespace):
        namespace["greeting"] = "Hello!"   # inject an attribute into every class
        return super().__new__(mcs, name, bases, namespace)

class MyClass(metaclass=Meta):
    pass

MyClass.greeting   # "Hello!" — injected by the metaclass
```
Used rarely in application code — mostly in frameworks (ORMs like Django models, ABCs) for advanced class-creation control.

---

### Q33. What are dataclasses and why use them?

**Answer:**
```python
from dataclasses import dataclass, field

@dataclass
class Point:
    x: int
    y: int
    tags: list = field(default_factory=list)   # avoids mutable default pitfall

p1 = Point(1, 2)
p2 = Point(1, 2)
p1 == p2     # True — __eq__ auto-generated
print(p1)     # Point(x=1, y=2, tags=[]) — __repr__ auto-generated
```
Dataclasses auto-generate `__init__`, `__repr__`, and `__eq__`, removing boilerplate from simple data-holding classes.

---

## Section 5: Error Handling

---

### Q34. What is the difference between `except Exception` and a bare `except:`?

**Answer:**
```python
try:
    risky()
except Exception as e:   # catches most errors, NOT KeyboardInterrupt/SystemExit
    print(e)

try:
    risky()
except:                    # catches EVERYTHING, including KeyboardInterrupt/SystemExit
    print("something went wrong")   # usually a bad idea — swallows Ctrl+C too
```
Prefer `except Exception` (or a specific exception type) over a bare `except:`.

---

### Q35. What is the purpose of `else` and `finally` in a try block?

**Answer:**
```python
try:
    result = 10 / 2
except ZeroDivisionError:
    print("division error")
else:
    print(f"success: {result}")   # runs only if NO exception occurred
finally:
    print("always runs")           # cleanup — runs no matter what
```

---

### Q36. How do you create and raise a custom exception?

**Answer:**
```python
class InsufficientFundsError(Exception):
    def __init__(self, balance, amount):
        self.balance = balance
        self.amount = amount
        super().__init__(f"Cannot withdraw {amount}, balance is {balance}")

def withdraw(balance, amount):
    if amount > balance:
        raise InsufficientFundsError(balance, amount)
    return balance - amount

try:
    withdraw(100, 150)
except InsufficientFundsError as e:
    print(e)   # Cannot withdraw 150, balance is 100
```

---

### Q37. What is exception chaining (`raise ... from ...`)?

**Answer:**
```python
def load_config():
    try:
        open("config.json")
    except FileNotFoundError as e:
        raise RuntimeError("Failed to start app") from e   # preserves original traceback

# Suppress chaining entirely
raise RuntimeError("clean error") from None
```

---

### Q38. What is the difference between `assert` and raising an exception?

**Answer:**
```python
assert x > 0, "x must be positive"   # only meant for debugging/internal invariants

if x <= 0:
    raise ValueError("x must be positive")   # for real validation, always runs
```
`assert` statements are **stripped out** when Python runs with the `-O` (optimize) flag — never use `assert` for input validation or security checks in production code.

---

## Section 6: Modules, Iterators & Generators

---

### Q39. What is the difference between a module and a package?

**Answer:**
```
my_package/            # package — a directory with __init__.py
    __init__.py
    module_a.py         # module — a single .py file
    module_b.py
```
```python
import my_package.module_a
from my_package import module_b
```

---

### Q40. What does `if __name__ == "__main__":` do?

**Answer:**
```python
# script.py
def main():
    print("running")

if __name__ == "__main__":
    main()   # only runs when script.py is executed directly

# When imported: import script — main() does NOT run automatically
```
`__name__` is `"__main__"` only when the file is run directly, and equals the module name when imported elsewhere.

---

### Q41. What is the difference between an iterable and an iterator?

**Answer:**
```python
nums = [1, 2, 3]          # iterable — has __iter__()
it = iter(nums)              # iterator — has __iter__() AND __next__()

next(it)   # 1
next(it)   # 2
next(it)   # 3
next(it)   # StopIteration

# for loops call iter() then next() repeatedly under the hood
for n in nums:
    print(n)
```
Every iterator is an iterable, but not every iterable is an iterator (a `list` is iterable but you can't call `next()` on it directly).

---

### Q42. What is a generator and how does `yield` work?

**Answer:**
```python
def count_up_to(n):
    i = 1
    while i <= n:
        yield i        # pauses execution here, returns i, resumes on next()
        i += 1

gen = count_up_to(3)
next(gen)   # 1
next(gen)   # 2
next(gen)   # 3
next(gen)   # StopIteration

for num in count_up_to(5):
    print(num)
```
Generators compute values lazily and remember their state between calls — useful for large or infinite sequences without loading everything into memory.

---

### Q43. What is the difference between `yield` and `return`?

**Answer:**
```python
def normal_function():
    return [1, 2, 3]   # computes everything, returns once, function ends

def generator_function():
    yield 1              # pauses here
    yield 2               # then here
    yield 3                # then here
    # function ends after the last yield, raising StopIteration
```
A function with any `yield` becomes a generator function — calling it doesn't run the body immediately, it returns a generator object.

---

### Q44. What is `yield from`?

**Answer:**
```python
def inner():
    yield 1
    yield 2

def outer():
    yield from inner()   # delegates to inner's values
    yield 3

list(outer())   # [1, 2, 3]

# Equivalent to (but more efficient than):
def outer_manual():
    for val in inner():
        yield val
    yield 3
```

---

### Q45. What are generator expressions and how do they differ from list comprehensions?

**Answer:**
```python
squares_list = [x**2 for x in range(1_000_000)]     # computed immediately, uses lots of memory
squares_gen  = (x**2 for x in range(1_000_000))       # lazy — computed one at a time

sum(x**2 for x in range(1_000_000))   # memory-efficient — no intermediate list built
```

---

### Q46. What does `itertools.islice` do and why is it useful with generators?

**Answer:**
```python
from itertools import islice

def infinite_counter():
    i = 0
    while True:
        yield i
        i += 1

first_five = list(islice(infinite_counter(), 5))   # [0, 1, 2, 3, 4]
```
Regular slicing (`gen[:5]`) doesn't work on generators since they don't support indexing — `islice` handles this without materializing the whole (possibly infinite) sequence.

---

## Section 7: Decorators & Context Managers

---

### Q47. How do you write a basic decorator?

**Answer:**
```python
import functools

def log_calls(func):
    @functools.wraps(func)   # preserves func.__name__, __doc__, etc.
    def wrapper(*args, **kwargs):
        print(f"Calling {func.__name__}")
        result = func(*args, **kwargs)
        print(f"{func.__name__} returned {result}")
        return result
    return wrapper

@log_calls
def add(a, b):
    return a + b

add(2, 3)
# Calling add
# add returned 5
```

---

### Q48. How do you write a decorator that accepts arguments?

**Answer:**
```python
import functools

def retry(times):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(times):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    print(f"Attempt {attempt+1} failed: {e}")
            raise Exception("All retries failed")
        return wrapper
    return decorator

@retry(times=3)
def flaky_call():
    ...
```
A decorator-with-arguments is a function that **returns** a decorator — three levels: outer (takes args) → decorator (takes func) → wrapper (takes call args).

---

### Q49. What does `functools.lru_cache` do?

**Answer:**
```python
from functools import lru_cache

@lru_cache(maxsize=None)
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

fibonacci(50)   # instant — cached results avoid exponential recomputation
```
Memoizes return values based on arguments — subsequent calls with the same arguments return the cached result instead of recomputing.

---

### Q50. What is a context manager and how does `with` work?

**Answer:**
```python
with open("file.txt") as f:
    data = f.read()
# f.close() is called automatically, even if an exception occurred

# Equivalent to:
f = open("file.txt")
try:
    data = f.read()
finally:
    f.close()
```
`with obj` calls `obj.__enter__()` at the start and `obj.__exit__()` at the end (even on exception) — guarantees cleanup.

---

### Q51. How do you write a custom context manager two ways?

**Answer:**
```python
# Class-based
class Timer:
    def __enter__(self):
        import time
        self.start = time.time()
        return self
    def __exit__(self, exc_type, exc_val, exc_tb):
        import time
        print(f"Elapsed: {time.time() - self.start:.2f}s")
        return False   # False = don't suppress exceptions

with Timer():
    do_work()

# Generator-based (simpler, using contextlib)
from contextlib import contextmanager
import time

@contextmanager
def timer():
    start = time.time()
    yield              # code inside "with" runs here
    print(f"Elapsed: {time.time() - start:.2f}s")

with timer():
    do_work()
```

---

## Section 8: Concurrency

---

### Q52. What is the difference between concurrency and parallelism in Python?

**Answer:**
- **Concurrency**: multiple tasks make progress by interleaving (not necessarily simultaneous) — good for I/O-bound work
- **Parallelism**: tasks literally run at the same time on multiple CPU cores — needed for CPU-bound work

Because of the GIL, `threading` gives concurrency but not true parallelism for CPU-bound code; `multiprocessing` gives real parallelism by using separate processes.

---

### Q53. When should you use threading vs multiprocessing vs asyncio?

**Answer:**

| Tool | Best for | Why |
|---|---|---|
| `threading` | I/O-bound (network, disk) | GIL releases during I/O waits, threads are lightweight |
| `multiprocessing` | CPU-bound (heavy computation) | Separate processes, separate GILs — true parallelism |
| `asyncio` | Many concurrent I/O tasks | Single-threaded event loop, extremely lightweight |

```python
# I/O bound — good fit for threading or asyncio
def download(url): ...

# CPU bound — good fit for multiprocessing
def compute_primes(n): ...
```

---

### Q54. How do you run tasks concurrently with `asyncio`?

**Answer:**
```python
import asyncio

async def fetch(id):
    print(f"start {id}")
    await asyncio.sleep(1)   # non-blocking wait
    print(f"done {id}")
    return f"result-{id}"

async def main():
    results = await asyncio.gather(fetch(1), fetch(2), fetch(3))
    print(results)

asyncio.run(main())
# All three "start" print immediately, all finish after ~1s total (not 3s)
```

---

### Q55. What is the difference between `await asyncio.gather()` and awaiting tasks sequentially?

**Answer:**
```python
async def fetch(id):
    await asyncio.sleep(1)
    return id

# Sequential — takes ~3 seconds total
async def sequential():
    r1 = await fetch(1)
    r2 = await fetch(2)
    r3 = await fetch(3)

# Concurrent — takes ~1 second total
async def concurrent():
    r1, r2, r3 = await asyncio.gather(fetch(1), fetch(2), fetch(3))
```

---

### Q56. How do you protect shared data across threads?

**Answer:**
```python
import threading

counter = 0
lock = threading.Lock()

def increment():
    global counter
    for _ in range(100000):
        with lock:          # only one thread at a time inside this block
            counter += 1

threads = [threading.Thread(target=increment) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()
print(counter)   # 400000, deterministic thanks to the lock
```
Without the lock, `counter += 1` is not atomic (read-modify-write) and the result would be unpredictable due to race conditions.

---

### Q57. How do you run CPU-bound work in parallel with `multiprocessing`?

**Answer:**
```python
from multiprocessing import Pool

def square(n):
    return n * n

if __name__ == "__main__":   # required on Windows/macOS (spawn method)
    with Pool(processes=4) as pool:
        results = pool.map(square, [1, 2, 3, 4, 5])
    print(results)   # [1, 4, 9, 16, 25]
```
Each process has its own memory space and Python interpreter — data passed between processes is pickled/unpickled, so it's slower for small tasks but scales real CPU work across cores.

---

## Section 9: Data Structures & Algorithms

---

### Q58. Reverse a linked list.

**Answer:**
```python
class Node:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next

def reverse_list(head):
    prev = None
    curr = head
    while curr:
        next_node = curr.next
        curr.next = prev
        prev = curr
        curr = next_node
    return prev
```

---

### Q59. Detect a cycle in a linked list (Floyd's algorithm).

**Answer:**
```python
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False
```

---

### Q60. Implement binary search.

**Answer:**
```python
def binary_search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

binary_search([1, 3, 5, 7, 9], 7)   # 3
```

---

### Q61. Check if two strings are anagrams.

**Answer:**
```python
from collections import Counter

def is_anagram(a, b):
    return Counter(a) == Counter(b)

is_anagram("listen", "silent")   # True

# Alternative without Counter
def is_anagram(a, b):
    return sorted(a) == sorted(b)
```

---

### Q62. Two Sum problem.

**Answer:**
```python
def two_sum(nums, target):
    seen = {}   # value -> index
    for i, n in enumerate(nums):
        complement = target - n
        if complement in seen:
            return [seen[complement], i]
        seen[n] = i
    return []

two_sum([2, 7, 11, 15], 9)   # [0, 1]
```

---

### Q63. Find duplicates in a list.

**Answer:**
```python
def find_duplicates(nums):
    seen = set()
    dups = set()
    for n in nums:
        if n in seen:
            dups.add(n)
        seen.add(n)
    return list(dups)

find_duplicates([1, 2, 3, 2, 4, 3])   # [2, 3]
```

---

### Q64. Implement a stack and a queue.

**Answer:**
```python
# Stack — use a plain list
stack = []
stack.append(1)   # push
stack.append(2)
stack.pop()          # pop — 2

# Queue — use collections.deque (O(1) at both ends, unlike list.pop(0) which is O(n))
from collections import deque
queue = deque()
queue.append(1)         # enqueue
queue.append(2)
queue.popleft()          # dequeue — 1
```

---

### Q65. Flatten a nested list.

**Answer:**
```python
def flatten(nested):
    result = []
    for item in nested:
        if isinstance(item, list):
            result.extend(flatten(item))
        else:
            result.append(item)
    return result

flatten([1, [2, 3, [4, 5]], 6])   # [1, 2, 3, 4, 5, 6]
```

---

### Q66. Implement Fibonacci with memoization.

**Answer:**
```python
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n <= 1:
        return n
    return fib(n-1) + fib(n-2)

fib(50)   # 12586269025 — instant, thanks to caching
```

---

### Q67. Count word frequency in a string.

**Answer:**
```python
from collections import Counter

def word_frequency(text):
    words = text.lower().split()
    return Counter(words)

word_frequency("the quick brown fox the fox")
# Counter({'the': 2, 'fox': 2, 'quick': 1, 'brown': 1})
```

---

### Q68. Implement a binary search tree with in-order traversal.

**Answer:**
```python
class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

def insert(root, val):
    if root is None:
        return TreeNode(val)
    if val < root.val:
        root.left = insert(root.left, val)
    else:
        root.right = insert(root.right, val)
    return root

def in_order(root):
    if root is None:
        return []
    return in_order(root.left) + [root.val] + in_order(root.right)

root = None
for v in [5, 3, 7, 1, 4]:
    root = insert(root, v)
in_order(root)   # [1, 3, 4, 5, 7]
```

---

### Q69. Merge two sorted lists.

**Answer:**
```python
def merge_sorted(a, b):
    result = []
    i = j = 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            result.append(a[i]); i += 1
        else:
            result.append(b[j]); j += 1
    result.extend(a[i:])
    result.extend(b[j:])
    return result

merge_sorted([1, 3, 5], [2, 4, 6])   # [1, 2, 3, 4, 5, 6]
```

---

## Section 10: Collections Module & Built-ins

---

### Q70. What is `collections.defaultdict` and when is it useful?

**Answer:**
```python
from collections import defaultdict

# Without defaultdict — must check for key existence
d = {}
for word in ["a", "b", "a"]:
    d[word] = d.get(word, 0) + 1

# With defaultdict — auto-initializes missing keys
d = defaultdict(int)
for word in ["a", "b", "a"]:
    d[word] += 1   # no KeyError, missing key defaults to int() == 0

groups = defaultdict(list)
groups["fruits"].append("apple")   # no need to check if "fruits" exists first
```

---

### Q71. What is `collections.namedtuple`?

**Answer:**
```python
from collections import namedtuple

Point = namedtuple("Point", ["x", "y"])
p = Point(1, 2)
p.x, p.y      # 1, 2
p[0], p[1]     # 1, 2 — also supports tuple-style indexing

# Modern alternative: typing.NamedTuple or @dataclass
from typing import NamedTuple
class Point(NamedTuple):
    x: int
    y: int
```

---

### Q72. What is the difference between `list`, `set`, and `dict` performance for membership tests?

**Answer:**
```python
nums_list = list(range(1_000_000))
nums_set  = set(range(1_000_000))

999999 in nums_list   # O(n) — scans the whole list
999999 in nums_set     # O(1) average — hash table lookup
```
`set` and `dict` use hashing internally, giving average O(1) membership checks; `list` and `tuple` require a linear O(n) scan.

---

### Q73. What is `zip()` used for?

**Answer:**
```python
names = ["Alice", "Bob"]
ages  = [30, 25]

list(zip(names, ages))   # [('Alice', 30), ('Bob', 25)]

for name, age in zip(names, ages):
    print(f"{name} is {age}")

# Unzipping
pairs = [("a", 1), ("b", 2)]
letters, numbers = zip(*pairs)   # ('a', 'b'), (1, 2)

# Building a dict
dict(zip(names, ages))   # {'Alice': 30, 'Bob': 25}
```
`zip` stops at the shortest iterable — use `itertools.zip_longest` if you need padding.

---

### Q74. What is `enumerate()` and why prefer it over manual index tracking?

**Answer:**
```python
fruits = ["apple", "banana", "cherry"]

# Manual (avoid)
i = 0
for fruit in fruits:
    print(i, fruit)
    i += 1

# Idiomatic
for i, fruit in enumerate(fruits):
    print(i, fruit)

for i, fruit in enumerate(fruits, start=1):   # custom start index
    print(i, fruit)
```

---

### Q75. What is the difference between `map`/`filter` and list comprehensions?

**Answer:**
```python
nums = [1, 2, 3, 4, 5]

# map/filter — functional style, returns lazy iterators in Python 3
doubled = list(map(lambda x: x * 2, nums))
evens = list(filter(lambda x: x % 2 == 0, nums))

# List comprehension — usually more Pythonic/readable
doubled = [x * 2 for x in nums]
evens = [x for x in nums if x % 2 == 0]
```
Both work; comprehensions are generally preferred in Python for readability, while `map`/`filter` can be handy when you already have a named function to pass.

---

## Section 11: Testing & Tooling

---

### Q76. How do you write a basic test with `pytest`?

**Answer:**
```python
# test_math.py
def add(a, b):
    return a + b

def test_add():
    assert add(2, 3) == 5

def test_add_negative():
    assert add(-1, -1) == -2
```
```bash
pip install pytest
pytest test_math.py -v
```

---

### Q77. What are pytest fixtures?

**Answer:**
```python
import pytest

@pytest.fixture
def sample_user():
    return {"name": "Alice", "age": 30}

def test_user_name(sample_user):
    assert sample_user["name"] == "Alice"

# Parametrized tests
@pytest.mark.parametrize("a,b,expected", [
    (1, 2, 3),
    (0, 0, 0),
    (-1, 1, 0),
])
def test_add(a, b, expected):
    assert add(a, b) == expected
```

---

### Q78. How do you mock a function or dependency in tests?

**Answer:**
```python
from unittest.mock import Mock, patch

def send_email(to, subject):
    ...

def notify_user(email_sender, user):
    email_sender("welcome@example.com", "Welcome!")

def test_notify_user():
    mock_sender = Mock()
    notify_user(mock_sender, "alice@example.com")
    mock_sender.assert_called_once_with("welcome@example.com", "Welcome!")

# Patching a module-level function
@patch("mymodule.send_email")
def test_with_patch(mock_send):
    mock_send.return_value = True
    ...
```

---

### Q79. What does `if __name__ == "__main__": unittest.main()` do?

**Answer:**
```python
import unittest

class TestMath(unittest.TestCase):
    def test_add(self):
        self.assertEqual(1 + 1, 2)

    def setUp(self):       # runs before each test method
        self.data = []

    def tearDown(self):     # runs after each test method
        self.data.clear()

if __name__ == "__main__":
    unittest.main()   # allows running `python test_math.py` directly
```

---

### Q80. What is the purpose of a virtual environment?

**Answer:**
```bash
python3 -m venv venv           # create an isolated environment
source venv/bin/activate         # activate it (Linux/macOS)
pip install requests              # installs ONLY into this environment
pip freeze > requirements.txt      # snapshot dependencies
deactivate
```
Prevents dependency version conflicts between different projects on the same machine.

---

## Section 12: Advanced / Tricky Topics

---

### Q81. What is monkey patching?

**Answer:**
Modifying or extending a class/module at runtime, without touching its source code.

```python
class Dog:
    def bark(self):
        return "Woof"

def new_bark(self):
    return "Woof woof!"

Dog.bark = new_bark   # monkey patch — replaces the method

Dog().bark()   # "Woof woof!"
```
Powerful but risky — commonly used in testing (patching dependencies) but can make code hard to trace in production.

---

### Q82. What is the difference between shallow equality (`__eq__`) and identity (`id()`)?

**Answer:**
```python
class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y
    def __eq__(self, other):
        return self.x == other.x and self.y == other.y
    def __hash__(self):     # needed if you override __eq__ and want it hashable
        return hash((self.x, self.y))

p1, p2 = Point(1, 2), Point(1, 2)
p1 == p2       # True — uses __eq__
p1 is p2        # False — different objects, id(p1) != id(p2)
id(p1)           # unique memory identifier
```
Defining `__eq__` without `__hash__` makes instances unhashable by default (Python sets `__hash__` to `None`).

---

### Q83. What are Python's variable scoping rules (the LEGB rule)?

**Answer:**
Python resolves names in this order: **L**ocal → **E**nclosing → **G**lobal → **B**uilt-in.

```python
x = "global"

def outer():
    x = "enclosing"
    def inner():
        x = "local"
        print(x)   # "local" — found in Local scope first
    inner()

print(len)   # built-in scope — always accessible unless shadowed
```

---

### Q84. What is the difference between `==` behavior for `NaN`?

**Answer:**
```python
float("nan") == float("nan")   # False — NaN is never equal to anything, including itself

import math
math.isnan(float("nan"))        # True — the correct way to check for NaN

x = float("nan")
x is x                            # True — identity still holds
```

---

### Q85. What is the walrus operator (`:=`)?

**Answer:**
```python
# Before Python 3.8
data = get_data()
if data:
    process(data)

# With walrus — assign and test in one expression
if (data := get_data()):
    process(data)

# Useful in comprehensions/loops to avoid recomputation
results = [y for x in data if (y := expensive(x)) is not None]

while (chunk := file.read(1024)):
    process(chunk)
```

---

### Q86. What is the difference between `__slots__` and normal attribute storage?

**Answer:**
```python
class RegularPoint:
    def __init__(self, x, y):
        self.x, self.y = x, y   # stored in a per-instance __dict__

class SlottedPoint:
    __slots__ = ("x", "y")       # no __dict__ — fixed attribute set
    def __init__(self, x, y):
        self.x, self.y = x, y

p = SlottedPoint(1, 2)
# p.z = 3   # AttributeError — can't add new attributes
```
`__slots__` reduces memory usage and slightly speeds up attribute access — useful when creating millions of small objects, at the cost of flexibility (no dynamic attributes, some multiple-inheritance limitations).

---

### Q87. What is the difference between `@property` and a plain attribute?

**Answer:**
```python
class Circle:
    def __init__(self, radius):
        self._radius = radius

    @property
    def area(self):                # accessed like an attribute: circle.area
        return 3.14159 * self._radius ** 2

    @property
    def radius(self):
        return self._radius

    @radius.setter
    def radius(self, value):
        if value < 0:
            raise ValueError("radius can't be negative")
        self._radius = value

c = Circle(5)
c.area          # 78.54 — computed on access, no parentheses needed
c.radius = 10   # runs validation via the setter
```
`@property` lets you add validation/computation while keeping attribute-style access syntax — you can start with plain attributes and add properties later without breaking the public API.

---

### Q88. What does `__call__` do?

**Answer:**
```python
class Multiplier:
    def __init__(self, factor):
        self.factor = factor
    def __call__(self, x):
        return x * self.factor

double = Multiplier(2)
double(5)   # 10 — instance is used like a function
```
Common in decorators implemented as classes, and in ML/callback-style APIs.

---

### Q89. What are Python's comparison chaining rules?

**Answer:**
```python
x = 5
1 < x < 10          # True — equivalent to (1 < x) and (x < 10), x evaluated once
1 < x < 10 < 100     # chains any number of comparisons

# Careful — this differs from most languages where 1 < x < 10 would be (1<x) < 10
```

---

### Q90. What is the difference between shallow-copying a dict with `dict()` vs `.copy()` vs `{**d}`?

**Answer:**
```python
original = {"a": [1, 2]}

c1 = dict(original)
c2 = original.copy()
c3 = {**original}

# All three create a shallow copy — top-level keys/values are new,
# but nested mutable objects are still shared
c1["a"].append(3)
print(original["a"])   # [1, 2, 3] — shared reference, all copies affected
```

---

### Q91. What is the difference between `__eq__` and `__ne__`? Do you need to define both?

**Answer:**
```python
class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y
    def __eq__(self, other):
        return self.x == other.x and self.y == other.y

p1, p2 = Point(1, 2), Point(1, 2)
p1 == p2    # True — uses __eq__
p1 != p2    # False — Python 3 auto-derives __ne__ from __eq__, no need to define it
```

---

### Q92. What is the difference between `type()` and `isinstance()` for type checking?

**Answer:**
```python
class Animal: pass
class Dog(Animal): pass

d = Dog()

type(d) == Dog          # True
type(d) == Animal        # False — type() checks EXACT type
isinstance(d, Animal)     # True — isinstance() also matches subclasses
isinstance(d, Dog)          # True
```
Prefer `isinstance()` — it respects inheritance and duck typing, which is more idiomatic Python.

---

### Q93. What are Python descriptors?

**Answer:**
An object that customizes attribute access via `__get__`, `__set__`, or `__delete__`. `@property` is implemented using descriptors.

```python
class PositiveNumber:
    def __set_name__(self, owner, name):
        self.name = "_" + name
    def __get__(self, obj, objtype=None):
        return getattr(obj, self.name)
    def __set__(self, obj, value):
        if value < 0:
            raise ValueError("must be positive")
        setattr(obj, self.name, value)

class Product:
    price = PositiveNumber()   # descriptor validates every assignment
    def __init__(self, price):
        self.price = price

p = Product(10)
# p.price = -5   # ValueError
```

---

### Q94. What is the difference between shallow and deep recursion limits in Python?

**Answer:**
```python
import sys
sys.getrecursionlimit()    # default 1000
sys.setrecursionlimit(3000)   # raise it (careful — risk of a C stack overflow crash)

def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

factorial(2000)   # RecursionError at the default limit
```
Python doesn't optimize tail recursion — deeply recursive algorithms should often be rewritten iteratively or with `sys.setrecursionlimit` used cautiously.

---

### Q95. What is the difference between `json.dumps` and `pickle.dumps`?

**Answer:**
```python
import json, pickle

data = {"name": "Alice", "age": 30}

json.dumps(data)     # '{"name": "Alice", "age": 30}' — text, human-readable, cross-language
pickle.dumps(data)    # binary, Python-specific, can serialize almost any object

# Security warning: never unpickle data from an untrusted source —
# pickle.loads can execute arbitrary code
```

---

## Section 13: Tricky / Gotchas

---

### Q96. What is the output of this code, and why?

```python
def append_to(element, target=[]):
    target.append(element)
    return target

print(append_to(1))   # ?
print(append_to(2))   # ?
```

**Answer:**
```
[1]
[1, 2]
```
The mutable default `target=[]` is created once at function definition time and reused across calls (see [Q23](#q23-why-is-using-a-mutable-default-argument-dangerous)). Fix with `target=None` and initializing inside the function.

---

### Q97. What does this print, and why?

```python
funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])   # ?
```

**Answer:**
```
[2, 2, 2]
```
Not `[0, 1, 2]` as many expect. Lambdas capture the variable `i` by reference (late binding), not its value at creation time — by the time the lambdas run, the loop has finished and `i == 2`.

```python
# Fix — capture the current value via a default argument
funcs = [lambda i=i: i for i in range(3)]
print([f() for f in funcs])   # [0, 1, 2]
```

---

### Q98. Why does `0.1 + 0.2 == 0.3` return `False`?

**Answer:**
```python
0.1 + 0.2   # 0.30000000000000004
0.1 + 0.2 == 0.3   # False
```
Floats use binary (base-2) representation, and 0.1/0.2/0.3 can't be represented exactly, just like 1/3 can't be represented exactly in base-10. Always compare floats with a tolerance:
```python
import math
math.isclose(0.1 + 0.2, 0.3)   # True
```

---

### Q99. Why is modifying a list while iterating over it dangerous?

**Answer:**
```python
nums = [1, 2, 3, 4, 5]
for n in nums:
    if n % 2 == 0:
        nums.remove(n)   # DANGEROUS — mutates list during iteration
print(nums)   # [1, 3, 5] — looks right here, but is unreliable in general

# Iteration uses an internal index that doesn't adjust when items shift left
# after a removal — can silently skip elements.

# CORRECT — iterate over a copy or build a new list
nums = [1, 2, 3, 4, 5]
nums = [n for n in nums if n % 2 != 0]
```

---

### Q100. What is the difference between `is None` and `== None`, and why does it matter?

**Answer:**
```python
class AlwaysEqual:
    def __eq__(self, other):
        return True

x = AlwaysEqual()
x == None    # True — because __eq__ is overridden to always return True!
x is None     # False — identity check, can't be fooled by a custom __eq__

# Always use `is None` / `is not None` for None checks
if x is None:
    ...
```
`is` checks object identity, which can never be overridden by a class — making it the only reliable way to check for `None`, `True`, or `False` singleton identity.

---

## Quick Reference

| Topic | Key Points |
|---|---|
| Mutability | `list`/`dict`/`set` mutable; `str`/`tuple`/`int`/`frozenset` immutable |
| `is` vs `==` | `is` = identity, `==` = value — always use `is` for `None` |
| GIL | One thread executes Python bytecode at a time in CPython |
| Threading | Good for I/O-bound work, limited by GIL for CPU work |
| Multiprocessing | True parallelism, separate memory per process |
| Asyncio | Single-threaded event loop, best for many concurrent I/O tasks |
| Generators | `yield`, lazy evaluation, one value at a time |
| Decorators | `@decorator`, wraps a function to add behavior |
| Context managers | `with`, guarantees `__enter__`/`__exit__` (setup/cleanup) |
| `*args`/`**kwargs` | Variable positional / keyword arguments |
| Mutable defaults | Never use `[]` or `{}` as a default argument — use `None` |
| `__eq__`/`__hash__` | Override both together, or objects become unhashable |
| Dataclasses | Auto-generates `__init__`, `__repr__`, `__eq__` |
