/**
 * SOLID Principles: Liskov Substitution Principle (LSP) Example
 * 
 * The Liskov Substitution Principle states that subclasses should be substitutable for their base classes without altering the correctness of the program.
 * In other words, objects of a superclass should be replaceable with objects of a subclass without breaking the application.
 */

/**
 * BAD Example - Violating LSP
 * Here, the Square class inherits from Rectangle, but changes the behavior of setWidth and setHeight.
 * This breaks the expectation that a Rectangle's width and height can be set independently.
 * Substituting a Square where a Rectangle is expected leads to incorrect results.
 */

//#region  Bad Example - Violating LSP
class Rectangle {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }
    setWidth(width) {
        this.width = width;
    }
    setHeight(height) {
        this.height = height;
    }
    getArea() {
        return this.width * this.height;
    }
}

class Square extends Rectangle {
    setWidth(width) {
        this.width = width;
        this.height = width; // Forces height to be the same as width
    }
    setHeight(height) {
        this.width = height;
        this.height = height; // Forces width to be the same as height
    }
}

// Usage that expects LSP to hold
function printArea(rect) {
    rect.setWidth(5);
    rect.setHeight(4);
    console.log(rect.getArea()); // Expected: 20, but for Square: 16 (incorrect)
}

console.log('Rectangle area:');
printArea(new Rectangle(2, 3)); // 20 (correct)
console.log('Square area:');
printArea(new Square(2, 3));    // 16 (incorrect, violates LSP)


//#region  Functional-based approach for LSP
// Functional approach for LSP: use factory functions to create objects that adhere to the expected interface
/**
 * GOOD Example - Following LSP
 * Here, Square and Rectangle do not inherit from each other, but share a common interface (or base class in other languages).
 * Each class behaves as expected, and substituting one for the other does not break the program.
 */

class Shape {
    getArea() {
        throw new Error('getArea() must be implemented');
    }
}

class RectangleLSP extends Shape {
    constructor(width, height) {
        super();
        this.width = width;
        this.height = height;
    }
    getArea() {
        return this.width * this.height;
    }
}

class SquareLSP extends Shape {
    constructor(side) {
        super();
        this.side = side;
    }
    getArea() {
        return this.side * this.side;
    }
}

// Usage: both can be used interchangeably as Shape
const shapes = [
    new RectangleLSP(5, 4),
    new SquareLSP(4)
];

shapes.forEach(shape => {
    console.log('Area:', shape.getArea());
});


//#endregion  Functional-based approach for LSP

//#region  Functional-based approach for LSP
// Functional approach for Liskov Substitution Principle (LSP)
// Both rectangle and square are created by factory functions that return an object with a getArea method.
// This ensures both shapes can be used interchangeably, following LSP.

function createRectangle(width, height) {
    return {
        getArea: () => width * height
    };
}

function createSquare(side) {
    return {
        getArea: () => side * side
    };
}

// Usage: both can be used as shapes
const functionalShapes = [
    createRectangle(5, 4),
    createSquare(4)
];

functionalShapes.forEach(shape => {
    console.log('Area (functional):', shape.getArea());
});

/**
 * Benefits:
 * - Subclasses can be used wherever the base class is expected, without breaking the program.
 * - No unexpected side effects or broken logic.
 * - Follows the Liskov Substitution Principle.
 * 
 * Benefits (Functional):
 * - Both rectangle and square objects provide the same interface (getArea).
 * - You can substitute one for the other without breaking the program.
 * - Follows the Liskov Substitution Principle in a functional style.
 */