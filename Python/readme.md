# Python — Learn from the Beginning

Welcome. This folder is arranged as a learning path, not as a list of unrelated notes.

If you have never programmed before, start on this page. You do **not** need to understand Django, FastAPI, interview questions, or advanced Python yet.

## What Python is

Python is a programming language. A Python program is a set of written instructions that the computer runs from top to bottom.

For example:

```python
name = "Amina"
print("Hello", name)
```

The first line remembers the text `Amina` under the name `name`. The second line displays `Hello Amina`.

That small example contains the basic pattern you will use throughout this folder:

1. Store some information.
2. Do something with that information.
3. See the result.

## Start here

Follow these steps in order. Do not begin with the framework guides.

### Step 1: Run your first Python program

Open a terminal and check whether Python 3 is installed:

```bash
python3 --version
```

Create a file named `hello.py`:

```python
print("Hello, Python!")
```

Run the file from the same folder:

```bash
python3 hello.py
```

You should see:

```text
Hello, Python!
```

If `python3` is not recognized, install Python 3 from [python.org](https://www.python.org/downloads/) and then reopen the terminal. On Windows, the command may be `py hello.py` instead.

### Step 2: Learn only the essentials

Open the [Python language guide](python-language-guide.md) and study these sections first:

1. What is Python?
2. Setup and running code
3. Basic syntax
4. Variables and data types
5. Operators
6. Strings
7. Control flow
8. Lists, tuples, sets, and dictionaries
9. Functions

These topics are enough to write useful small programs. Ignore the advanced sections until the earlier examples feel comfortable.

### Step 3: Practise after every topic

Reading code is not the same as writing code. Use the [beginner exercises](beginner-exercises.md) after Sections 2–9 of the language guide.

For each exercise:

1. Type the code yourself instead of copying it.
2. Run it.
3. Change one value and predict the new result.
4. Read the error message if it fails.
5. Fix one problem at a time.

### Step 4: Build one small project

After learning functions and collections, build a command-line project such as:

- a calculator;
- a number-guessing game;
- a contact list;
- a simple expense tracker; or
- a task list saved to a text file.

The goal is not a perfect application. The goal is to combine input, variables, decisions, loops, collections, and functions in one program.

### Step 5: Continue to intermediate Python

Return to the [Python language guide](python-language-guide.md) and continue with error handling, modules, files, testing, and object-oriented programming. Learn decorators, generators, type hints, and concurrency later, when you encounter a real need for them.

### Step 6: Choose a web framework

Frameworks help you build web applications, but they assume that you already understand basic Python functions, imports, dictionaries, errors, and classes.

- Choose [Django](django.md) when you want a complete web framework with database tools, forms, authentication, templates, and an admin site.
- Choose [FastAPI](fastapi.md) when you mainly want to build an API that sends and receives JSON.

You do not need to learn both at the same time.

## Folder map

| File | What it is for | When to use it |
|---|---|---|
| [Python language guide](python-language-guide.md) | Python concepts from basic to advanced | Start with Sections 1–9, then return for later topics |
| [Beginner exercises](beginner-exercises.md) | Small tasks with hints and expected behavior | After each basic topic |
| [Django tutorial](django.md) | Building a full web application | After learning core Python |
| [FastAPI tutorial](fastapi.md) | Building a web API | After learning core Python |
| [Interview questions](questions.md) | Review and interview preparation | After learning the concepts, not at the beginning |
| [NumPy PDF](npmPy.pdf) | Numerical-array reference material | When starting data or scientific Python |

## A simple four-week route

| Week | Learn | Build or practise |
|---|---|---|
| 1 | Running code, variables, types, strings, input | Greeting and age calculator |
| 2 | Conditions, loops, lists, and dictionaries | Number game or contact list |
| 3 | Functions, errors, modules, and files | Expense tracker or task list |
| 4 | Classes and tests; then choose a framework | Test and improve the Week 3 project |

Move at your own pace. A “week” can take a day or a month. Progress means being able to explain and change your code, not finishing pages quickly.

## How to read code without getting lost

When you see an example, ask these questions in order:

1. **What are the inputs?** Look for values, function arguments, or `input()`.
2. **Where is information stored?** Look for variables and collections.
3. **What decision is made?** Look for `if`, `elif`, and `else`.
4. **What repeats?** Look for `for` and `while`.
5. **What is the result?** Look for `print()` or `return`.

Do not try to memorize every symbol. Run the example, change it, and observe what changes in the output.

## When you are ready to move forward

You are ready for Django or FastAPI when you can write a small program that:

- receives input;
- stores values in a list or dictionary;
- uses conditions and a loop;
- separates work into functions;
- imports code from another file; and
- handles at least one expected error.

If any item is unfamiliar, return to the linked language guide and practise it first.
