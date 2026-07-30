# Python — Complete Beginner-to-Advanced Guide

A friendly, practical walkthrough of Python: from "Hello, World!" to decorators, generators, and async. Read top to bottom if you're new, or jump straight to a section using the table of contents.

---

## Table of Contents

1. [What is Python?](#1-what-is-python)
2. [Setup & Running Code](#2-setup--running-code)
3. [Basic Syntax](#3-basic-syntax)
4. [Variables & Data Types](#4-variables--data-types)
5. [Operators](#5-operators)
6. [Strings](#6-strings)
7. [Control Flow](#7-control-flow)
8. [Collections: List, Tuple, Set, Dict](#8-collections-list-tuple-set-dict)
9. [Functions](#9-functions)
10. [Comprehensions](#10-comprehensions)
11. [Object-Oriented Programming](#11-object-oriented-programming)
12. [Error Handling](#12-error-handling)
13. [Modules & Packages](#13-modules--packages)
14. [File Handling](#14-file-handling)
15. [Iterators & Generators](#15-iterators--generators)
16. [Decorators](#16-decorators)
17. [Context Managers (`with`)](#17-context-managers-with)
18. [Type Hints](#18-type-hints)
19. [Virtual Environments & pip](#19-virtual-environments--pip)
20. [Useful Standard Library Modules](#20-useful-standard-library-modules)
21. [Concurrency: Threading, Multiprocessing, Asyncio](#21-concurrency-threading-multiprocessing-asyncio)
22. [Testing](#22-testing)
23. [Common Pitfalls](#23-common-pitfalls)
24. [Cheat Sheet](#24-cheat-sheet)
25. [Where to Go Next](#25-where-to-go-next)

---

## 1. What is Python?

Python is a high-level, interpreted, dynamically-typed language created by **Guido van Rossum**, first released in 1991. It's designed to be **readable** — code often looks close to plain English.

**Why people love it:**
- Simple, clean syntax — great for beginners
- Huge standard library ("batteries included")
- Massive ecosystem: web (Django, Flask, FastAPI), data science (pandas, NumPy), AI/ML (PyTorch, TensorFlow), automation, scripting
- Runs everywhere: Linux, macOS, Windows

**Trade-offs to know about:**
- Slower than compiled languages (C++, Go, Rust) for raw CPU-bound work
- Dynamically typed — errors can surface at runtime instead of compile time
- The Global Interpreter Lock (GIL) limits true CPU parallelism with threads (more in [Section 21](#21-concurrency-threading-multiprocessing-asyncio))

---

## 2. Setup & Running Code

### Check your installation
```bash
python3 --version
```

### Running a script
```bash
python3 script.py
```

### Interactive REPL (great for experimenting)
```bash
python3
>>> print("Hello!")
Hello!
>>> exit()
```

### One file structure
```python
# script.py
def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()
```

`if __name__ == "__main__":` ensures `main()` only runs when the file is executed directly, not when it's imported by another file.

---

## 3. Basic Syntax

Python uses **indentation** (not `{}`) to define code blocks. This is not a style choice — it's required syntax.

```python
# Comments start with #

if True:
    print("Indented with 4 spaces")   # this belongs to the if-block
print("Not indented — outside the if-block")
```

**Key rules:**
- Standard indentation is 4 spaces (don't mix tabs and spaces)
- No semicolons needed at line ends (allowed but unconventional)
- Statements end at the newline unless wrapped in `()`, `[]`, `{}`, or a `\` continuation

```python
total = (1 + 2 +
         3 + 4)   # parentheses allow line breaks
```

---

## 4. Variables & Data Types

Python is **dynamically typed** — you don't declare a type, and a variable can be reassigned to a different type.

```python
name = "Alice"      # str
age = 30             # int
height = 5.6          # float
is_student = False    # bool
nothing = None         # NoneType (Python's "null")

age = "thirty"        # totally legal — age is now a str
```

### Core built-in types
```python
int        # whole numbers: 42, -7
float      # decimals: 3.14, -0.5
str        # text: "hello"
bool       # True / False
list       # [1, 2, 3]        — mutable, ordered
tuple      # (1, 2, 3)        — immutable, ordered
dict       # {"a": 1}          — key-value pairs
set        # {1, 2, 3}         — unique, unordered
NoneType   # None               — represents "no value"
```

### Checking and converting types
```python
type(42)              # <class 'int'>
isinstance(42, int)   # True

int("42")     # 42
str(42)       # "42"
float("3.14") # 3.14
bool(0)       # False  (0, "", None, [], {} are all "falsy")
bool(1)       # True
```

---

## 5. Operators

```python
# Arithmetic
5 + 3    # 8
5 - 3    # 2
5 * 3    # 15
5 / 3    # 1.666... (always returns float)
5 // 3   # 1  (floor division)
5 % 3    # 2  (modulo/remainder)
5 ** 3   # 125 (exponent)

# Comparison
5 == 3   # False
5 != 3   # True
5 > 3    # True
5 <= 3   # False

# Logical
True and False   # False
True or False    # True
not True         # False

# Identity vs equality
a = [1, 2]
b = [1, 2]
a == b   # True  — same VALUE
a is b   # False — different OBJECT in memory

# Membership
3 in [1, 2, 3]        # True
"x" not in "hello"    # True

# Walrus operator (assign inside an expression, Python 3.8+)
if (n := len([1, 2, 3])) > 2:
    print(f"List has {n} items")
```

---

## 6. Strings

```python
s = "Hello, World!"

s[0]          # 'H'
s[-1]         # '!'
s[0:5]        # 'Hello'   (slicing)
s[7:]         # 'World!'
s[::-1]       # '!dlroW ,olleH'  (reverse)

len(s)             # 13
s.upper()          # 'HELLO, WORLD!'
s.lower()          # 'hello, world!'
s.strip()          # removes leading/trailing whitespace
s.replace("Hello", "Hi")  # 'Hi, World!'
s.split(", ")      # ['Hello', 'World!']
"-".join(["a", "b", "c"])  # 'a-b-c'
s.startswith("Hello")      # True
s.find("World")            # 7 (index, or -1 if not found)
```

### f-strings (the modern, preferred way to format strings)
```python
name = "Alice"
age = 30
print(f"{name} is {age} years old")        # Alice is 30 years old
print(f"{age * 2}")                        # expressions work inside {}
print(f"{3.14159:.2f}")                    # '3.14' — format spec
print(f"{name!r}")                         # "'Alice'" — repr

# Multi-line strings
text = """
This spans
multiple lines
"""
```

Strings are **immutable** — every "modification" creates a new string object.

---

## 7. Control Flow

```python
# if / elif / else
score = 85
if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
else:
    grade = "C"

# for loop — iterates over any iterable
for i in range(5):        # 0, 1, 2, 3, 4
    print(i)

for char in "abc":
    print(char)

for index, value in enumerate(["a", "b", "c"]):
    print(index, value)   # 0 a / 1 b / 2 c

# while loop
count = 0
while count < 5:
    count += 1

# break / continue
for i in range(10):
    if i == 3:
        continue   # skip this iteration
    if i == 7:
        break      # exit loop entirely
    print(i)

# match statement (Python 3.10+, like switch)
match score:
    case 100:
        print("Perfect")
    case s if s >= 90:
        print("A grade")
    case _:
        print("Other")
```

---

## 8. Collections: List, Tuple, Set, Dict

### List — ordered, mutable, allows duplicates
```python
fruits = ["apple", "banana", "cherry"]

fruits.append("date")        # add to end
fruits.insert(1, "kiwi")     # insert at index
fruits.remove("banana")      # remove by value
fruits.pop()                 # remove & return last item
fruits.sort()                # sort in place
sorted(fruits)                # returns new sorted list
fruits.reverse()
len(fruits)
fruits[0:2]                  # slicing
```

### Tuple — ordered, immutable
```python
point = (3, 4)
x, y = point          # unpacking
point[0]               # 3
# point[0] = 5         # ERROR — tuples can't be modified

# Common use: returning multiple values from a function
def min_max(nums):
    return min(nums), max(nums)

lo, hi = min_max([3, 1, 4, 1, 5])
```

### Set — unique, unordered
```python
a = {1, 2, 3}
b = {2, 3, 4}

a | b   # union: {1, 2, 3, 4}
a & b   # intersection: {2, 3}
a - b   # difference: {1}
a.add(5)
a.remove(1)
3 in a  # membership check — very fast (O(1))
```

### Dict — key-value pairs
```python
person = {"name": "Alice", "age": 30}

person["name"]                # 'Alice'
person["email"] = "a@x.com"   # add/update
person.get("phone", "N/A")    # safe access with default
person.keys()
person.values()
person.items()

for key, value in person.items():
    print(key, value)

"name" in person   # True — checks keys

del person["age"]
person.pop("email", None)   # remove safely
```

### Quick comparison

| Type | Ordered | Mutable | Duplicates | Syntax |
|---|---|---|---|---|
| `list` | Yes | Yes | Yes | `[1, 2, 3]` |
| `tuple` | Yes | No | Yes | `(1, 2, 3)` |
| `set` | No | Yes | No | `{1, 2, 3}` |
| `dict` | Yes* | Yes | Keys unique | `{"a": 1}` |

*Dicts preserve insertion order since Python 3.7.

---

## 9. Functions

```python
def greet(name):
    return f"Hello, {name}!"

# Default arguments
def greet(name="World"):
    return f"Hello, {name}!"

# Keyword arguments
def describe(name, age):
    return f"{name} is {age}"
describe(age=30, name="Alice")   # order doesn't matter with keywords

# *args — variable positional arguments
def total(*numbers):
    return sum(numbers)
total(1, 2, 3, 4)   # 10

# **kwargs — variable keyword arguments
def build_profile(**info):
    return info
build_profile(name="Alice", age=30)   # {'name': 'Alice', 'age': 30}

# Combining everything
def func(a, b, *args, c=10, **kwargs):
    pass

# Lambda — anonymous, single-expression functions
square = lambda x: x ** 2
square(5)   # 25

# Common use: sorting with a key
people = [{"name": "Bob", "age": 25}, {"name": "Ann", "age": 30}]
people.sort(key=lambda p: p["age"])
```

**Scope basics:**
```python
x = "global"

def outer():
    x = "outer"
    def inner():
        nonlocal x   # refer to the enclosing (not global) scope
        x = "inner"
    inner()
    print(x)   # 'inner'

def modify_global():
    global x
    x = "changed"
```

---

## 10. Comprehensions

A compact way to build lists, dicts, and sets from existing iterables.

```python
# List comprehension
squares = [x**2 for x in range(10)]
evens = [x for x in range(20) if x % 2 == 0]

# Equivalent to:
squares = []
for x in range(10):
    squares.append(x**2)

# Nested
matrix = [[1, 2], [3, 4]]
flat = [num for row in matrix for num in row]   # [1, 2, 3, 4]

# Dict comprehension
squares_dict = {x: x**2 for x in range(5)}

# Set comprehension
unique_lengths = {len(word) for word in ["hi", "bye", "hey"]}

# Generator expression — lazy, memory-efficient (see Section 15)
gen = (x**2 for x in range(1000000))   # doesn't compute until needed
```

Use comprehensions when they stay **readable on one line**. If the logic needs multiple conditions or nested loops that hurt clarity, prefer a plain `for` loop.

---

## 11. Object-Oriented Programming

### Classes and instances
```python
class Dog:
    species = "Canis familiaris"    # class attribute — shared by all instances

    def __init__(self, name, age):  # constructor
        self.name = name              # instance attribute
        self.age = age

    def bark(self):                  # instance method
        return f"{self.name} says woof!"

    def __str__(self):               # controls print(obj) / str(obj)
        return f"Dog({self.name}, {self.age})"

    def __repr__(self):              # controls repr(obj) — for debugging
        return f"Dog(name={self.name!r}, age={self.age})"

rex = Dog("Rex", 3)
print(rex.bark())     # "Rex says woof!"
print(rex)             # uses __str__: "Dog(Rex, 3)"
```

### Inheritance
```python
class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        raise NotImplementedError("Subclasses must implement this")

class Cat(Animal):
    def speak(self):
        return f"{self.name} says meow"

class Dog(Animal):
    def speak(self):
        return f"{self.name} says woof"

animals = [Cat("Tom"), Dog("Rex")]
for a in animals:
    print(a.speak())   # polymorphism — each uses its own speak()
```

### `super()` — call the parent class
```python
class Employee:
    def __init__(self, name, salary):
        self.name = name
        self.salary = salary

class Manager(Employee):
    def __init__(self, name, salary, team_size):
        super().__init__(name, salary)   # reuse parent's init
        self.team_size = team_size
```

### Properties — controlled attribute access
```python
class Circle:
    def __init__(self, radius):
        self._radius = radius

    @property
    def area(self):
        return 3.14159 * self._radius ** 2

    @radius.setter
    def radius(self, value):
        if value < 0:
            raise ValueError("Radius can't be negative")
        self._radius = value

c = Circle(5)
c.area        # accessed like an attribute, computed like a method
```

### Class methods & static methods
```python
class Pizza:
    def __init__(self, toppings):
        self.toppings = toppings

    @classmethod
    def margherita(cls):              # alternate constructor
        return cls(["mozzarella", "tomato"])

    @staticmethod
    def is_valid_topping(topping):    # doesn't need self or cls
        return topping in ["cheese", "pepperoni", "mushroom"]

Pizza.margherita()
```

### Dataclasses — less boilerplate (Python 3.7+)
```python
from dataclasses import dataclass

@dataclass
class Point:
    x: int
    y: int

p = Point(1, 2)   # __init__, __repr__, __eq__ auto-generated
print(p)           # Point(x=1, y=2)
```

### Key OOP terms

| Concept | Meaning |
|---|---|
| Encapsulation | Bundling data and methods; hiding internals with `_`/`__` prefixes |
| Inheritance | A class reuses/extends another class's behavior |
| Polymorphism | Different classes respond to the same method call differently |
| Abstraction | Exposing only what's necessary (e.g. via `abc.ABC`) |

---

## 12. Error Handling

```python
try:
    result = 10 / 0
except ZeroDivisionError as e:
    print(f"Error: {e}")
except (TypeError, ValueError) as e:
    print(f"Bad input: {e}")
else:
    print("Runs only if no exception occurred")
finally:
    print("Always runs — cleanup code goes here")

# Raising your own exceptions
def withdraw(balance, amount):
    if amount > balance:
        raise ValueError("Insufficient funds")
    return balance - amount

# Custom exception classes
class InsufficientFundsError(Exception):
    pass

# Catching everything (use sparingly — prefer specific exceptions)
try:
    risky()
except Exception as e:
    print(f"Something went wrong: {e}")
```

**Common built-in exceptions:**

| Exception | When it happens |
|---|---|
| `ValueError` | Right type, invalid value — `int("abc")` |
| `TypeError` | Wrong type for an operation |
| `KeyError` | Missing dict key |
| `IndexError` | List index out of range |
| `AttributeError` | Object has no such attribute/method |
| `FileNotFoundError` | File doesn't exist |
| `ZeroDivisionError` | Division by zero |

---

## 13. Modules & Packages

```python
# math_utils.py
def add(a, b):
    return a + b

def _internal_helper():   # leading underscore = "private" by convention
    pass
```

```python
# main.py
import math_utils
math_utils.add(2, 3)

from math_utils import add
add(2, 3)

from math_utils import add as sum_two   # alias
import math_utils as mu                 # alias the module
```

### Packages (folders with `__init__.py`)
```
my_package/
    __init__.py
    module_a.py
    module_b.py
```
```python
from my_package import module_a
from my_package.module_a import some_function
```

### Standard library imports
```python
import os
import sys
import json
import re
import datetime
import random
import collections
import itertools
```

---

## 14. File Handling

```python
# Writing
with open("data.txt", "w") as f:
    f.write("Hello, file!\n")

# Reading
with open("data.txt", "r") as f:
    content = f.read()        # entire file as a string

with open("data.txt", "r") as f:
    for line in f:             # memory-efficient line-by-line
        print(line.strip())

with open("data.txt", "r") as f:
    lines = f.readlines()      # list of lines

# Appending
with open("data.txt", "a") as f:
    f.write("Another line\n")
```

The `with` statement (a context manager, see [Section 17](#17-context-managers-with)) guarantees the file closes automatically, even if an error occurs.

### JSON
```python
import json

data = {"name": "Alice", "age": 30}

json_str = json.dumps(data)          # dict -> JSON string
parsed = json.loads(json_str)        # JSON string -> dict

with open("data.json", "w") as f:
    json.dump(data, f)

with open("data.json", "r") as f:
    data = json.load(f)
```

### CSV
```python
import csv

with open("data.csv", "r") as f:
    reader = csv.DictReader(f)
    for row in reader:
        print(row["name"], row["age"])

with open("data.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["name", "age"])
    writer.writerow(["Alice", 30])
```

---

## 15. Iterators & Generators

### Iterators
Anything with `__iter__` and `__next__` can be looped over with `for`.

```python
nums = [1, 2, 3]
it = iter(nums)
next(it)   # 1
next(it)   # 2
next(it)   # 3
next(it)   # raises StopIteration
```

### Generators — functions that yield instead of return
```python
def count_up_to(n):
    i = 1
    while i <= n:
        yield i     # pauses here, resumes on next call
        i += 1

for num in count_up_to(5):
    print(num)   # 1, 2, 3, 4, 5
```

**Why generators matter:** they compute values lazily, one at a time, instead of building the whole result in memory.

```python
# Reading a huge file without loading it all into RAM
def read_large_file(path):
    with open(path) as f:
        for line in f:
            yield line.strip()

# Generator expression (like a list comprehension, but lazy)
squares = (x**2 for x in range(1_000_000))   # instant — nothing computed yet
next(squares)   # 0  — computed on demand
```

---

## 16. Decorators

A decorator wraps a function to add behavior without modifying its code.

```python
import functools
import time

def timer(func):
    @functools.wraps(func)          # preserves original function's name/docstring
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        print(f"{func.__name__} took {time.time() - start:.4f}s")
        return result
    return wrapper

@timer
def slow_function():
    time.sleep(1)

slow_function()   # prints timing automatically
```

### Decorators with arguments
```python
def repeat(times):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for _ in range(times):
                result = func(*args, **kwargs)
            return result
        return wrapper
    return decorator

@repeat(times=3)
def greet():
    print("Hi!")

greet()   # prints "Hi!" three times
```

### Built-in decorators you'll see everywhere
```python
@staticmethod
@classmethod
@property
@functools.lru_cache(maxsize=None)   # memoization — caches return values
@functools.wraps(func)
```

---

## 17. Context Managers (`with`)

Guarantee setup/cleanup happens, even on error — most common for files, locks, and connections.

```python
with open("file.txt") as f:
    data = f.read()
# file is automatically closed here, even if an exception was raised
```

### Writing your own (class-based)
```python
class Timer:
    def __enter__(self):
        self.start = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        print(f"Elapsed: {time.time() - self.start:.2f}s")

with Timer():
    time.sleep(1)
```

### Writing your own (generator-based, simpler)
```python
from contextlib import contextmanager

@contextmanager
def timer():
    start = time.time()
    yield                      # code inside `with` runs here
    print(f"Elapsed: {time.time() - start:.2f}s")

with timer():
    time.sleep(1)
```

---

## 18. Type Hints

Optional annotations that document intent and let tools (mypy, IDEs) catch bugs before running code. They are **not enforced at runtime**.

```python
def greet(name: str) -> str:
    return f"Hello, {name}"

age: int = 30
names: list[str] = ["Alice", "Bob"]
scores: dict[str, int] = {"Alice": 90}

from typing import Optional, Union

def find_user(id: int) -> Optional[str]:   # str or None
    ...

def process(value: Union[int, str]) -> None:   # int or str
    ...

# Python 3.10+ shorthand for Union
def process(value: int | str) -> None:
    ...
```

Checked with a separate tool, not by the interpreter:
```bash
pip install mypy
mypy script.py
```

---

## 19. Virtual Environments & pip

Isolate project dependencies so they don't clash across projects.

```bash
# Create a virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate      # macOS/Linux
venv\Scripts\activate         # Windows

# Install packages (only affects this environment)
pip install requests

# Save dependencies
pip freeze > requirements.txt

# Install from a requirements file (e.g. on a new machine)
pip install -r requirements.txt

# Deactivate
deactivate
```

**Rule of thumb:** every project gets its own virtual environment — never install packages globally for a specific project's needs.

---

## 20. Useful Standard Library Modules

```python
import os
os.getcwd()               # current directory
os.listdir(".")           # list files
os.path.join("a", "b")    # 'a/b' — OS-safe path joining
os.environ.get("HOME")    # environment variables

import sys
sys.argv                  # command-line arguments
sys.exit(1)                # exit the program

import datetime
datetime.datetime.now()
datetime.date(2026, 1, 1)

import re
re.match(r"\d+", "123abc")          # match at start
re.findall(r"\d+", "a1b22c333")     # ['1', '22', '333']
re.sub(r"\s+", " ", "too   many   spaces")

import collections
collections.Counter(["a", "b", "a", "c", "a"])   # Counter({'a': 3, 'b': 1, 'c': 1})
collections.defaultdict(list)                       # dict with automatic default values
collections.namedtuple("Point", ["x", "y"])

import itertools
itertools.chain([1, 2], [3, 4])       # 1, 2, 3, 4
itertools.combinations([1, 2, 3], 2)   # (1,2) (1,3) (2,3)
itertools.count(start=1)                # infinite counter

import random
random.randint(1, 10)
random.choice(["a", "b", "c"])
random.shuffle(my_list)
```

---

## 21. Concurrency: Threading, Multiprocessing, Asyncio

Python has three main concurrency tools, each suited to a different kind of problem.

### The GIL (Global Interpreter Lock)
CPython only lets **one thread execute Python bytecode at a time**. This means threads don't give you true CPU parallelism — they're great for I/O-bound work (waiting on network/disk) but not CPU-bound work (heavy computation).

### Threading — good for I/O-bound tasks
```python
import threading

def download(url):
    print(f"Downloading {url}")

threads = [threading.Thread(target=download, args=(url,)) for url in urls]
for t in threads:
    t.start()
for t in threads:
    t.join()   # wait for all to finish
```

### Multiprocessing — good for CPU-bound tasks
Each process gets its own Python interpreter and memory — bypasses the GIL entirely.

```python
from multiprocessing import Pool

def square(n):
    return n * n

with Pool(processes=4) as pool:
    results = pool.map(square, [1, 2, 3, 4, 5])
```

### Asyncio — good for many concurrent I/O tasks in a single thread
```python
import asyncio

async def fetch_data(id):
    print(f"Start fetching {id}")
    await asyncio.sleep(1)   # simulates I/O wait without blocking other tasks
    print(f"Done fetching {id}")
    return f"data-{id}"

async def main():
    results = await asyncio.gather(
        fetch_data(1),
        fetch_data(2),
        fetch_data(3),
    )   # all three run concurrently, not sequentially
    print(results)

asyncio.run(main())
```

### When to use which

| Tool | Best for | Why |
|---|---|---|
| `threading` | I/O-bound, moderate concurrency | Simple, but limited by the GIL for CPU work |
| `multiprocessing` | CPU-bound (math, image processing) | True parallelism, separate memory per process |
| `asyncio` | Many concurrent I/O tasks (web servers, APIs) | Extremely lightweight, single-threaded event loop |

---

## 22. Testing

Python's built-in `unittest`, or the far more popular third-party `pytest`.

```python
# test_math.py
def add(a, b):
    return a + b

# --- pytest style (recommended) ---
def test_add():
    assert add(2, 3) == 5

def test_add_negative():
    assert add(-1, -1) == -2
```

```bash
pip install pytest
pytest test_math.py
pytest -v          # verbose
pytest --cov=.      # coverage report (needs pytest-cov)
```

```python
# unittest style (built-in, no install needed)
import unittest

class TestMath(unittest.TestCase):
    def test_add(self):
        self.assertEqual(add(2, 3), 5)

if __name__ == "__main__":
    unittest.main()
```

### Fixtures (pytest) — reusable setup
```python
import pytest

@pytest.fixture
def sample_data():
    return {"name": "Alice", "age": 30}

def test_name(sample_data):
    assert sample_data["name"] == "Alice"
```

---

## 23. Common Pitfalls

```python
# 1. Mutable default arguments — a classic Python trap
def add_item(item, items=[]):   # WRONG — the list persists across calls!
    items.append(item)
    return items

def add_item(item, items=None):  # CORRECT
    if items is None:
        items = []
    items.append(item)
    return items

# 2. Modifying a list while iterating over it
nums = [1, 2, 3, 4]
for n in nums:
    if n % 2 == 0:
        nums.remove(n)   # WRONG — skips elements, unpredictable
nums = [n for n in nums if n % 2 != 0]   # CORRECT — build a new list

# 3. Late binding closures in loops
funcs = [lambda: i for i in range(3)]
[f() for f in funcs]   # [2, 2, 2] — NOT [0, 1, 2] as you might expect!

funcs = [lambda i=i: i for i in range(3)]   # CORRECT — capture i by default arg
[f() for f in funcs]   # [0, 1, 2]

# 4. Comparing floats directly
0.1 + 0.2 == 0.3          # False! (floating point precision)
abs(0.1 + 0.2 - 0.3) < 1e-9   # CORRECT way to compare floats

# 5. Using `is` instead of `==` for value comparison
a = [1, 2]
b = [1, 2]
a is b   # False — different objects
a == b   # True — same value; this is almost always what you want

# 6. Integer caching confuses beginners
x = 256
y = 256
x is y   # True — small ints are cached by CPython (implementation detail)
x = 257
y = 257
x is y   # often False — don't rely on this, always use == for value equality
```

---

## 24. Cheat Sheet

```
print(x)                     print to console
type(x)                      get the type
len(x)                       length of string/list/dict/etc.
range(start, stop, step)     number sequence
enumerate(iterable)          (index, value) pairs
zip(a, b)                    pair up two iterables
sorted(iterable, key=fn)     sorted copy
map(fn, iterable)            apply fn to every item
filter(fn, iterable)         keep items where fn is True
sum(iterable)                add up numbers
min(iterable) / max(iterable)
any(iterable) / all(iterable)

list comprehension    [x for x in iterable if cond]
dict comprehension     {k: v for k, v in items}
f-string                f"{value:.2f}"
unpack                   a, *rest = [1, 2, 3]
ternary                   x if cond else y
```

---

## 25. Where to Go Next

Once you're comfortable with everything above, here's a natural progression:

1. **Pick a track and build something small:**
   - Web: Flask or FastAPI (build a small API)
   - Data: pandas + matplotlib (analyze a CSV dataset)
   - Automation: `requests` + `os` (a script that solves a real annoyance in your day)
2. **Learn `pip` package idioms** — read a popular library's source to see real-world patterns.
3. **Get comfortable with `pytest`** — write tests for anything you build.
4. **Read PEP 8** (Python's style guide) — https://peps.python.org/pep-0008/
5. **Try type hints + mypy** on a real project — it pays off fast once files multiply.

> **Golden rule:** Python rewards readability. When in doubt, write the version a teammate could understand without asking you what it does.
