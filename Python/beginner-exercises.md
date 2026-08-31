# Beginner Python Exercises

These exercises turn the first part of the [Python language guide](python-language-guide.md) into small, manageable steps.

Create one `.py` file for each exercise. Type your solution, run it, and change the input at least once. An error is useful information: read its last line first because it normally names the problem.

## 1. Display text

**What you are practising:** running a file and using `print()` to display a result.

Write a program that displays your name and your reason for learning Python on two separate lines.

Expected shape of the output:

```text
My name is Amina.
I am learning Python to automate tasks.
```

**Hint:** use two `print()` calls.

## 2. Store information in variables

**What you are practising:** giving names to values so they can be reused.

Store a person's name, age, and city in three variables. Print one sentence containing all three values.

**Hint:** an f-string starts with `f` before the opening quote, such as `f"Hello, {name}"`.

## 3. Receive user input

**What you are practising:** allowing the user to provide a value while the program is running.

Ask the user for their name, then display a personal greeting.

```text
What is your name? Amina
Hello, Amina!
```

**Hint:** `input()` always gives you text.

## 4. Work with numbers

**What you are practising:** converting text to a number and performing arithmetic.

Ask for two numbers. Display their sum, difference, and product.

**Hint:** use `float(input("First number: "))` if you want to accept decimals.

## 5. Make a decision

**What you are practising:** choosing which instructions run with `if` and `else`.

Ask for a person's age. Print `Adult` when the age is 18 or more; otherwise print `Minor`.

Test the program with `17`, `18`, and `30`.

## 6. Repeat work with a loop

**What you are practising:** running the same instruction for several values.

Use a `for` loop to display the numbers 1 through 10. Then change it to display only even numbers.

**Hint:** explore `range(1, 11)`.

## 7. Use a list

**What you are practising:** storing an ordered group of values.

Create a list containing five grocery items. Add one item, remove one item, and print every remaining item with a loop.

## 8. Use a dictionary

**What you are practising:** connecting a key, such as `name`, to a value.

Create a dictionary for a book with the keys `title`, `author`, and `year`. Print a readable sentence using those values.

## 9. Write a function

**What you are practising:** putting reusable work behind a clear name.

Write a function named `calculate_total` that receives a price and quantity and returns their product. Call it with at least two different pairs of values.

```python
def calculate_total(price, quantity):
    # Replace this comment with your calculation.
    pass
```

## 10. Combine the basics

**What you are practising:** combining input, a list, a loop, a decision, and a function.

Build a tiny task list that repeatedly asks the user to:

1. add a task;
2. show all tasks; or
3. quit.

Start with an empty list. Keep the program running until the user chooses `quit`.

## How to check your own work

Before looking for another solution, check that:

- the file runs without an unexpected error;
- the output matches the task;
- different inputs produce sensible results;
- variable and function names explain their purpose; and
- you can describe what every line does in your own words.

There can be several correct solutions. Clear code you understand is better than a clever solution you cannot explain.
