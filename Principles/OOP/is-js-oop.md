# Is JavaScript object-oriented?

Is JavaScript object-oriented?
Before answering this question, first there is a dire need to know what object-oriented programming is and its four core principles.
Object-Oriented Programming (OOP) is a style of programming that is centered around objects rather than functions. In other words, it focuses on what developers want to manipulate rather than how they want to manipulate it.
Remember: Object-oriented programming is not a language or a tool! It is a programming paradigm.

The four core concepts in object-oriented programming are:

Encapsulation
In OOP we combine a group of related variables and functions into a unit, i.e object. The variables are referred as properties and functions as methods.

Let’s have a look at this example.

## A. procedural implementation

```js
let baseSalary = 4000;
let overtime = 5;
let rate = 10;

function getWage(baseSalary, overtime, rate) {
  return baseSalary + overtime * rate;
}
```

## B. OOP Implementation

```js
let employee {
  let baseSalary: 4000;
  let overtime: 5;
  let rate: 10;
  getWage: function () {
    return this.baseSalary + (this.overtime * this.rate);
  }
};
employee.getWage();

```

# “The best functions are those with no parameters!” - Robert C Martin
## Encapsulation

## Abstraction

We can hide some of the properties and methods from the outside and only show the essentials which gives us a couple of benefits.

- Make the interface of the objects simpler
- Reduce the impact of change

## Inheritance

It is a mechanism that allows a programmer to eliminate redundant code. For example, HTML elements like text boxes, check boxes, and drop-down lists. All these elements have few properties in common, i.e. hidden, innerHTML, etc, and methods, i.e click(),focus(), etc. Instead of redefining all these properties and methods for every type of HTML element we can define it once in a generic object such as an HTML element and have other objects (textBox, CheckBox, Drop-down lists) inherit these properties and methods.

## Polymorphism

Poly means many and morph means form, so polymorphism simply means many forms. It is a technique that allows a programmer to get rid of long switches and case statements.
Let us step back to the HTML elements example. All the objects (textBox, CheckBox, Drop-down lists) should have the ability to be rendered on a page, right? But the way each element is rendered is different from the others. So, in a procedural way, there would be several switch and case statements. But in OOP we can implement a render method in each of these objects and the render method will behave differently depending on the type of object the viewer is referencing.

Although JavaScript is not a class-based object-oriented language, it is a prototype-based object-oriented language.

#https://www.topcoder.com/thrive/articles/common-javascript-questions-is-javascript-object-oriented-and-more#:~:text=As%20discussed%20before%2C%20JavaScript%20is,JavaScript%20debuted%20the%20class%20keyword.
