# Python Language Guide — Beginner to Advanced

A practical reference that begins with your first Python program and continues into advanced topics.

> **New to programming?** Start at the [Python learning path](readme.md). Read Sections 1–9 of this guide first and complete the [beginner exercises](beginner-exercises.md). You are not expected to learn all 25 sections at once.

## How to use this guide

This guide has four stages. Finish one stage, write a small program, and only then decide whether you need the next stage.

| Stage | Sections | What you will be able to do |
|---|---|---|
| 1. First steps | 1–6 | Run Python, store values, calculate, and work with text |
| 2. Core Python | 7–9 | Make decisions, repeat work, organize data, and write functions |
| 3. Practical programs | 10–14, 19, 22–23 | Structure programs, handle errors, use files and packages, and test code |
| 4. Advanced tools | 15–18, 20–21 | Understand generators, decorators, context managers, typing, and concurrency |

For every example, read it in this order:

1. Identify the values going into the code.
2. Follow the instructions from top to bottom.
3. Find the displayed or returned result.
4. Run the example yourself.
5. Change one value and predict what will happen.

If a word is unfamiliar, keep reading the explanation before trying to memorize the code.

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

### Topic overview

Use this quick summary to understand what each part of the guide teaches before reading it in detail.

| Topic | Brief explanation |
|---|---|
| What is Python? | Introduces Python, its common uses, strengths, and trade-offs. |
| Setup & Running Code | Shows how to check Python, run a file, and use the interactive shell. |
| Basic Syntax | Explains indentation, comments, statements, and Python's basic writing rules. |
| Variables & Data Types | Covers how Python stores text, numbers, booleans, collections, and empty values. |
| Operators | Introduces arithmetic, comparison, logical, identity, and membership operations. |
| Strings | Shows how to create, access, change, search, and format text. |
| Control Flow | Uses conditions and loops to decide which code runs and how often it runs. |
| Collections | Explains lists, tuples, sets, and dictionaries for storing groups of values. |
| Functions | Shows how to group reusable logic, accept inputs, and return results. |
| Comprehensions | Demonstrates compact ways to build collections from existing data. |
| Object-Oriented Programming | Organizes data and behavior using classes, objects, inheritance, and properties. |
| Error Handling | Shows how to detect, handle, raise, and clean up after runtime errors. |
| Modules & Packages | Explains how to split code into reusable files and folders and import it. |
| File Handling | Covers safely reading and writing text, JSON, and CSV files. |
| Iterators & Generators | Produces values one at a time, which is useful for large data and efficient memory use. |
| Decorators | Adds behavior to functions or methods without changing their original code. |
| Context Managers | Manages setup and cleanup automatically with the `with` statement. |
| Type Hints | Documents expected value types and helps development tools catch mistakes. |
| Virtual Environments & pip | Keeps each project's third-party packages isolated and manageable. |
| Standard Library Modules | Introduces useful tools included with Python, so no separate installation is needed. |
| Concurrency | Compares threads, processes, and async code for handling multiple tasks. |
| Testing | Verifies that code behaves correctly and continues working after changes. |
| Common Pitfalls | Highlights frequent Python mistakes and how to avoid them. |
| Cheat Sheet | Provides a compact reference for common syntax and built-in functions. |
| Where to Go Next | Suggests practical learning paths and small projects for continued practice. |

---

## 1. What is Python?

Python is a high-level, interpreted, dynamically-typed language created by **Guido van Rossum**, first released in 1991. It's designed to be **readable** — code often looks close to plain English.

Unlike a compiled language, Python normally executes your program through an interpreter. This makes the edit-run-test cycle quick and approachable. “Dynamically typed” means a variable does not have one permanently declared type; Python determines the type of the value while the program runs. These choices make Python easy to learn and productive for many kinds of work, although they also explain some of its performance and runtime-error trade-offs.

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

Before writing a larger program, you need to know how Python code reaches the interpreter. You can run saved `.py` files for repeatable programs or use the interactive REPL to test small expressions immediately. The examples below establish both workflows and introduce the conventional entry point used in real Python scripts.

### Check your installation
This command confirms that Python 3 is installed and shows which version your terminal will use.
```bash
python3 --version
```

### Running a script
Save Python instructions in a file ending in `.py`, then pass that filename to the interpreter.
```bash
python3 script.py
```

### Interactive REPL (great for experimenting)
The REPL reads one instruction, evaluates it, prints the result, and waits for the next instruction. It is ideal for quick experiments, but your work is not saved automatically.
```bash
python3
>>> print("Hello!")
Hello!
>>> exit()
```

### One file structure
Small programs commonly place their main workflow in a function and call it through an entry-point check. This keeps the file usable both as an executable script and as an importable module.
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

Syntax is the set of writing rules the interpreter expects. In Python, whitespace communicates structure: indented lines belong to the condition, loop, function, or class above them. Consistent formatting is therefore part of program correctness as well as readability.

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

A variable is a name that refers to a value; it is not a box with a permanently fixed data type. The value's type determines which operations are valid—for example, numbers can be added mathematically, while strings can be joined as text. Understanding these types helps you predict what an expression will produce and why a type-related error occurs.

```python
name = "Alice"      # str
age = 30             # int
height = 5.6          # float
is_student = False    # bool
nothing = None         # NoneType (Python's "null")

age = "thirty"        # totally legal — age is now a str
```

### Core built-in types
These are the everyday value categories built directly into Python. Choose a type according to what the value represents and whether a collection needs ordering, uniqueness, or modification.
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
Use `type()` when exploring the exact type and `isinstance()` when checking whether a value belongs to an expected type. Conversion functions create a value of another type when the source value has a compatible form.
```python
type(42)              # <class 'int'>
isinstance(42, int)   # True

int("42")     # 42
str(42)       # "42"
float("3.14") # 3.14
bool(0)       # False  (0, "", None, [], {} are all "falsy")
bool(1)       # True
```

### Receiving input from a user

`input()` pauses the program, displays a question, and waits for the user to type an answer. The answer is always returned as a string, even when the user types digits.

```python
name = input("What is your name? ")
print(f"Hello, {name}!")
```

Convert the returned text before doing number calculations:

```python
age_text = input("How old are you? ")
age = int(age_text)
print(f"Next year you will be {age + 1}.")
```

Read the flow from top to bottom: the program receives text, converts it to an integer, calculates a new value, and displays the result. If the user enters text such as `twenty`, `int()` raises an error; Section 12 explains how to handle that safely.

---

## 5. Operators

Operators combine, compare, or inspect values. The same symbol can behave differently depending on the operands: `+` adds numbers but joins strings, for example. The examples are grouped by purpose so you can distinguish calculations, boolean decisions, object identity, and collection membership.

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

Strings represent text as an ordered sequence of Unicode characters. Because they are sequences, you can access characters by index, extract ranges with slicing, and measure them with `len()`. String methods return useful transformed or searched results without changing the original string.

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
An f-string places values and expressions inside readable text using `{}` placeholders. It is usually clearer than joining many strings manually and can also control number precision, alignment, and debug representations.
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

Control flow determines the order in which instructions run. Conditions choose one path from several possibilities, loops repeat work, and `break` or `continue` changes a loop's normal progression. These tools turn a straight list of statements into a program that can react to its data.

Read each example by asking two questions: “What condition is being tested?” and “Which indented block runs when that condition is true?” This habit makes nested logic much easier to follow.

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

Collections store multiple related values under one name. Python provides several collection types because programs need different guarantees: sometimes order matters, sometimes values must be unique, and sometimes a meaningful key should locate each value. Choosing the right collection makes the code simpler and communicates your intent.

### List — ordered, mutable, allows duplicates
A list is the general-purpose choice for a sequence that may grow, shrink, or change. Items keep their position and are accessed with zero-based indexes.
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
A tuple also preserves order, but its item references cannot be replaced after creation. It is useful for fixed groups such as coordinates or multiple values returned together.
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
A set automatically removes duplicates and supports fast membership checks. Set operations are especially useful when comparing groups, such as finding shared or missing values.
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
A dictionary associates each unique key with a value. Use it when a name, ID, or other key is more meaningful than a numeric position.
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
Use this table as a decision aid: first decide whether you need key-based access, then consider ordering, duplicates, and whether the collection must be changed.

| Type | Ordered | Mutable | Duplicates | Syntax |
|---|---|---|---|---|
| `list` | Yes | Yes | Yes | `[1, 2, 3]` |
| `tuple` | Yes | No | Yes | `(1, 2, 3)` |
| `set` | No | Yes | No | `{1, 2, 3}` |
| `dict` | Yes* | Yes | Keys unique | `{"a": 1}` |

*Dicts preserve insertion order since Python 3.7.

---

## 9. Functions

A function gives a name to a reusable block of behavior. Inputs arrive through parameters, the body performs the work, and `return` sends a result back to the caller. Functions reduce repetition and let a larger problem be divided into small pieces that can be understood and tested independently.

The examples progress from ordinary parameters to flexible argument collection. Prefer a simple, explicit signature unless a function genuinely needs to accept a variable number of inputs.

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
Scope answers “where can this name be accessed?” A function normally has its own local scope, while nested and module-level scopes surround it. `nonlocal` and `global` explicitly rebind names outside the current function and should be used carefully because they make state changes less local.
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

> **Beginner checkpoint:** Before continuing, pause and complete Exercises 1–10 in the [beginner exercise set](beginner-exercises.md). You should be able to use input, a condition, a loop, a collection, and a function in one small program. Comprehensions are shorter syntax—not a replacement for understanding ordinary loops.

A compact way to build lists, dicts, and sets from existing iterables.

A comprehension describes both the transformation and the source data in one expression. Read it in this order: the value to produce, the loop that supplies each input, and any optional condition that filters inputs. It is concise, but clarity is more important than minimizing line count.

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

Object-oriented programming is an intermediate way to keep related data and behavior together. Do not worry if classes feel abstract at first. You can write many useful Python programs using functions, lists, and dictionaries before you need a class.

Object-oriented programming groups related state and behavior into objects. A class is the reusable definition, while an instance is one concrete object created from that class. OOP is useful when a domain contains entities—such as users, orders, or devices—that have their own data and operations.

Not every program needs classes. They are most helpful when they create a clear boundary around responsibilities and preserve rules about how an object's state may change.

### Classes and instances
The constructor initializes each new instance, `self` refers to the current instance, and methods define operations it can perform. Class attributes are shared defaults; instance attributes belong to one object.
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
Inheritance creates a specialized class from a more general one. A child can reuse parent behavior or override a method, allowing callers to use a common interface with different implementations.
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
`super()` delegates work to the parent implementation. It avoids duplicating initialization logic and becomes especially important when a class hierarchy changes.
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
A property looks like a normal attribute to callers but runs method logic behind the scenes. It can calculate a value, validate an assignment, or protect an object's internal representation.
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
A class method receives the class as `cls` and is often used as an alternate constructor. A static method belongs conceptually to the class but needs neither a particular instance nor the class itself.
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
Dataclasses are designed for classes whose main purpose is storing structured data. The decorator generates routine methods so the code can focus on the fields and domain behavior.
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
These terms describe the main design ideas behind classes. Treat them as tools for organizing responsibilities, not as rules that every solution must maximize.

| Concept | Meaning |
|---|---|
| Encapsulation | Bundling data and methods; hiding internals with `_`/`__` prefixes |
| Inheritance | A class reuses/extends another class's behavior |
| Polymorphism | Different classes respond to the same method call differently |
| Abstraction | Exposing only what's necessary (e.g. via `abc.ABC`) |

---

## 12. Error Handling

Exceptions report that a program cannot complete an operation normally. Error handling lets you respond deliberately—for example, by showing a useful message, trying an alternative, or releasing a resource—instead of allowing an unexplained crash.

Catch only exceptions you can handle meaningfully. A broad catch can hide programming mistakes, whereas a specific exception documents the failure you expected and keeps unrelated bugs visible.

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

As a program grows, keeping everything in one file becomes difficult to navigate and reuse. A module is a Python file that can expose functions, classes, and variables; a package organizes related modules in a directory. Imports connect these pieces while giving each one a clear namespace.

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
A package provides a stable grouping for related modules. The dotted import path mirrors the folder structure, helping both Python and readers locate the code.
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

The **standard library** is a collection of modules included with Python. You can import these modules without installing a separate package. Each module focuses on a particular kind of task:

```python
import os           # Work with the operating system: files, folders, paths, and environment variables
import sys          # Access Python runtime features, command-line arguments, and program exit controls
import json         # Convert between Python values and JSON text or files
import re           # Search, match, and replace text using regular expressions (patterns)
import datetime     # Create, compare, and format dates and times
import random       # Generate pseudo-random numbers and choose or shuffle items
import collections  # Use specialized containers such as Counter, defaultdict, and deque
import itertools    # Build efficient iterators for combining, grouping, and repeating values
```

Importing a module makes its tools available through the module name. For example, `json.loads(text)` converts JSON text into a Python value, while `random.choice(items)` selects one item from a collection.

---

## 14. File Handling

Files let a program keep data after the process ends or exchange data with other tools. Opening a file creates a resource with a mode: read (`r`), write (`w`), or append (`a`). Be careful with write mode because it replaces existing content, while append adds content at the end.

Text encoding and error handling matter in production code; `encoding="utf-8"` is usually a good explicit choice for text files. The introductory examples focus on the core open-read/write-close lifecycle.

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
JSON stores objects, arrays, strings, numbers, booleans, and null in a language-independent text format. Python's `json` module converts between that text and familiar dictionaries, lists, and primitive values.
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
CSV represents table-like data as rows and columns. `DictReader` uses the header row as dictionary keys, which often makes code easier to understand than accessing columns by position.
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

This is an advanced section. Learn it when you need to process values one at a time or avoid keeping a large collection in memory.

Iteration is Python's common protocol for retrieving a sequence of values one at a time. Lists, files, strings, generator objects, and many library results all work with `for` because they follow this protocol. Understanding it explains both everyday loops and memory-efficient data pipelines.

### Iterators
Anything with `__iter__` and `__next__` can be looped over with `for`.

An iterator remembers its current position. Each `next()` request returns one value and advances that position until `StopIteration` signals that no values remain; a `for` loop handles that signal automatically.

```python
nums = [1, 2, 3]
it = iter(nums)
next(it)   # 1
next(it)   # 2
next(it)   # 3
next(it)   # raises StopIteration
```

### Generators — functions that yield instead of return
A generator is a convenient way to create an iterator. `yield` produces a value and pauses the function while preserving its local state, so execution can resume later instead of starting over.
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

This is an advanced section. Decorators appear often in Django and FastAPI, but first understand ordinary functions, arguments, return values, and scope.

A decorator wraps a function to add behavior without modifying its code.

The `@decorator` syntax is equivalent to replacing the original function with the decorator's returned wrapper. Common uses include logging, authorization, caching, retries, and timing. Decorators are powerful because one cross-cutting rule can be reused consistently across many functions.

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
A decorator that accepts configuration needs an extra function layer: the outer function receives configuration, the next receives the target function, and the wrapper receives the target's runtime arguments.
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
These decorators solve common language and library needs. Some change method access in classes, while others compute properties, cache results, or preserve metadata when wrapping functions.
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

A context manager defines what happens when a controlled block begins and ends. The `with` statement makes resource lifetimes visible in the code and ensures cleanup is not accidentally skipped by an early return or exception.

```python
with open("file.txt") as f:
    data = f.read()
# file is automatically closed here, even if an exception was raised
```

### Writing your own (class-based)
The class protocol uses `__enter__` for setup and `__exit__` for cleanup. Information about any exception is passed to `__exit__`, which may either allow it to propagate or deliberately suppress it.
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
`contextlib.contextmanager` turns a generator-style function into the same protocol. Code before `yield` performs setup, and code after it performs cleanup.
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

Type hints make function contracts easier to understand: readers can see what inputs are expected and what result is returned. Editors and static checkers use the annotations to find mismatches across a codebase before those paths are executed. They improve communication without changing Python's dynamic runtime model.

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

`pip` installs third-party packages, while a virtual environment gives one project its own Python executable and package directory. Without isolation, upgrading a library for one project may break another project that expects an older version. Activate the environment before installing or running project commands so the correct dependencies are used.

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

Python ships with a broad standard library, so many common tasks need no third-party dependency. The modules below cover operating-system interaction, command-line behavior, dates, pattern matching, specialized containers, iterator construction, and random selection. Learn what each module is responsible for; you can consult its documentation for the many individual functions later.

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

This is an advanced section for programs that need to coordinate multiple tasks. Beginners can skip it until a real project has slow I/O, CPU-heavy work, or many simultaneous operations.

Python has three main concurrency tools, each suited to a different kind of problem.

Concurrency means making progress on multiple tasks during overlapping periods; parallelism means tasks literally execute at the same instant. The right approach depends mainly on whether work spends time waiting for I/O or actively using the CPU. These tools also differ in memory sharing, complexity, and startup cost.

### The GIL (Global Interpreter Lock)
CPython only lets **one thread execute Python bytecode at a time**. This means threads don't give you true CPU parallelism — they're great for I/O-bound work (waiting on network/disk) but not CPU-bound work (heavy computation).

The GIL does not make threading useless: another thread can run while one waits for a file, database, or network response. It mainly changes the choice for sustained CPU-heavy Python code.

### Threading — good for I/O-bound tasks
Threads run within one process and share its memory, which makes data sharing convenient but requires care around simultaneous mutation. Always wait for required worker threads with `join()` before using their final results or exiting.
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

Separate memory enables true parallel CPU work but adds process startup and inter-process communication overhead. Use it when each unit of computation is substantial enough to justify that cost.

```python
from multiprocessing import Pool

def square(n):
    return n * n

with Pool(processes=4) as pool:
    results = pool.map(square, [1, 2, 3, 4, 5])
```

### Asyncio — good for many concurrent I/O tasks in a single thread
Asyncio uses an event loop and cooperative tasks. An `async` function pauses at `await` while an operation is waiting, allowing another task to progress; blocking code that never awaits can still freeze the loop.
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
Start by classifying the workload, then choose the simplest tool that fits. Measure real performance before adding concurrency because coordination overhead can make small workloads slower.

| Tool | Best for | Why |
|---|---|---|
| `threading` | I/O-bound, moderate concurrency | Simple, but limited by the GIL for CPU work |
| `multiprocessing` | CPU-bound (math, image processing) | True parallelism, separate memory per process |
| `asyncio` | Many concurrent I/O tasks (web servers, APIs) | Extremely lightweight, single-threaded event loop |

---

## 22. Testing

Python's built-in `unittest`, or the far more popular third-party `pytest`.

A test runs code with a known input and checks that the observed result matches the expected result. Small automated tests catch regressions after changes, document intended behavior, and make refactoring safer. Good tests cover normal behavior, boundary values, and expected failures without depending unnecessarily on one another.

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
A fixture prepares reusable test data or resources and can also clean them up afterward. This keeps setup out of individual test bodies and makes the behavior under test easier to see.
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

Some valid-looking Python patterns behave differently from what beginners expect. The examples below explain both the surprising behavior and a safer replacement. Do not merely memorize the corrected line; connect it to mutability, iteration state, closure scope, floating-point representation, or object identity so you can recognize the same issue in new code.

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

This section is a memory aid after you have studied the fuller explanations above. The left side shows common syntax or a built-in function, and the right side states its usual purpose. When a shortcut is unfamiliar, return to its main section and experiment with a small value in the REPL.

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

Learning becomes durable when you use each concept to solve a small real problem. Pick one direction, build the smallest useful version, test it, and expand it only after you understand the current code. You do not need to master every library before starting; projects reveal which topic you need next.

1. **Pick a track and build something small:**
   - Web: Flask or FastAPI (build a small API)
   - Data: pandas + matplotlib (analyze a CSV dataset)
   - Automation: `requests` + `os` (a script that solves a real annoyance in your day)
2. **Learn `pip` package idioms** — read a popular library's source to see real-world patterns.
3. **Get comfortable with `pytest`** — write tests for anything you build.
4. **Read PEP 8** (Python's style guide) — https://peps.python.org/pep-0008/
5. **Try type hints + mypy** on a real project — it pays off fast once files multiply.

> **Golden rule:** Python rewards readability. When in doubt, write the version a teammate could understand without asking you what it does.
