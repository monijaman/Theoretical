# 🚀 TypeScript Complete Presentation
## From Beginner to Advanced - Comprehensive Guide

---

## 📋 **Table of Contents**
1. [What is TypeScript?](#what-is-typescript)
2. [Why TypeScript?](#why-typescript)
3. [Getting Started](#getting-started)
4. [Simple Types](#simple-types)
5. [Special Types](#special-types)
6. [Arrays](#arrays)
7. [Tuples](#tuples)
8. [Object Types](#object-types)
9. [Enums](#enums)
10. [Aliases & Interfaces](#aliases--interfaces)
11. [Union Types](#union-types)
12. [Functions](#functions)
13. [Casting](#casting)
14. [Classes](#classes)
15. [Basic Generics](#basic-generics)
16. [Utility Types](#utility-types)
17. [Keyof](#keyof)
18. [Null](#null)
19. [Definitely Typed](#definitely-typed)
20. [TypeScript 5 Updates](#typescript-5-updates)
21. [Advanced Types](#advanced-types)
22. [Modules](#modules)
23. [Decorators](#decorators)
24. [Best Practices](#best-practices)
25. [Real-World Examples](#real-world-examples)

---

## 🎯 **What is TypeScript?**

TypeScript is a **statically typed superset of JavaScript** that compiles to plain JavaScript. It adds optional static type definitions to JavaScript, enabling better tooling at any scale.

### Key Features:
- ✅ **Static Type Checking**
- ✅ **Modern JavaScript Features**
- ✅ **Excellent IDE Support**
- ✅ **Gradual Adoption**
- ✅ **Compile-time Error Detection**

```typescript
// JavaScript
function greet(name) {
    return "Hello, " + name;
}

// TypeScript
function greet(name: string): string {
    return "Hello, " + name;
}
```

---

## 🔍 **Why TypeScript?**

### **🐛 Catches Errors Early**
```typescript
// This will cause a compile-time error
function add(a: number, b: number): number {
    return a + b;
}

add("5", "10"); // ❌ Error: Argument of type 'string' is not assignable to parameter of type 'number'
```

### **🧠 Better IntelliSense**
```typescript
interface User {
    id: number;
    name: string;
    email: string;
}

function processUser(user: User) {
    user. // IDE will show: id, name, email with autocomplete
}
```

### **📚 Self-Documenting Code**
```typescript
// Types serve as documentation
function calculateTax(income: number, rate: number, deductions?: number): number {
    // Implementation clearly shows what types are expected
    return (income - (deductions || 0)) * rate;
}
```

### **🔄 Easy Refactoring**
```typescript
// Rename interface property - TypeScript will update all usages
interface Product {
    id: number;
    title: string; // Rename this...
    price: number;
}

// All usages will show errors until updated
```

---

## 🚀 **Getting Started**

### **1. Installation**
```bash
# Global installation
npm install -g typescript

# Local installation
npm install --save-dev typescript

# Using latest version
npm install typescript@latest
```

### **2. Basic Setup**
```bash
# Initialize TypeScript project
tsc --init

# Compile TypeScript file
tsc app.ts

# Watch mode
tsc --watch
```

### **3. tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 📊 **Simple Types**

TypeScript has three very commonly used primitives: `string`, `number`, and `boolean`.

```typescript
// String
let firstName: string = "Dylan";

// Number
let age: number = 25;
let price: number = 99.99;

// Boolean
let isActive: boolean = true;

// Type inference - TypeScript can automatically determine types
let message = "Hello World"; // TypeScript knows this is a string
let count = 42; // TypeScript knows this is a number
let isComplete = false; // TypeScript knows this is a boolean
```

### **Explicit vs Implicit Types**
```typescript
// Explicit typing
let explicitString: string = "Hello";
let explicitNumber: number = 42;

// Implicit typing (type inference)
let implicitString = "Hello"; // TypeScript infers string
let implicitNumber = 42; // TypeScript infers number

// Best practice: Use implicit typing when possible
```

---

## 🔄 **Special Types**

TypeScript has special types that may not refer to any specific type of data.

### **Any Type**
```typescript
// any disables type checking
let value: any = 42;
value = "hello";
value = true;
value = {};

// Avoid using any when possible as it defeats the purpose of TypeScript
```

### **Unknown Type**
```typescript
// unknown is a safer alternative to any
let userInput: unknown;
let userName: string;

userInput = 5;
userInput = "Max";

// Type checking required before assignment
if (typeof userInput === "string") {
    userName = userInput; // ✅ OK
}

// userName = userInput; // ❌ Error without type check
```

### **Never Type**
```typescript
// never represents values that never occur
function throwError(message: string): never {
    throw new Error(message);
}

function infiniteLoop(): never {
    while (true) {
        // This function never returns
    }
}
```

### **Undefined and Null**
```typescript
let u: undefined = undefined;
let n: null = null;

// With strict null checks, these are only assignable to themselves
let name: string = "John";
// name = null; // ❌ Error with strict null checks
// name = undefined; // ❌ Error with strict null checks
```

---

## 📚 **Arrays**

TypeScript arrays can be typed in multiple ways.

```typescript
// Array of strings
let fruits: string[] = ["apple", "banana", "orange"];
let colors: Array<string> = ["red", "green", "blue"];

// Array of numbers
let numbers: number[] = [1, 2, 3, 4, 5];
let scores: Array<number> = [95, 87, 92];

// Mixed types with union
let mixed: (string | number)[] = ["hello", 42, "world", 99];

// Readonly arrays
let readonlyNumbers: readonly number[] = [1, 2, 3];
// readonlyNumbers.push(4); // ❌ Error - cannot modify readonly array

// Multi-dimensional arrays
let matrix: number[][] = [[1, 2], [3, 4], [5, 6]];
```

### **Array Methods with Types**
```typescript
let names: string[] = ["Alice", "Bob", "Charlie"];

// Type-safe array methods
let lengths: number[] = names.map(name => name.length);
let longNames: string[] = names.filter(name => name.length > 4);
let found: string | undefined = names.find(name => name.startsWith("A"));
```

---

## 📦 **Tuples**

Tuples are arrays with fixed sizes and types for each position.

```typescript
// Basic tuple
let person: [string, number] = ["John", 30];

// Accessing tuple elements
let name = person[0]; // string
let age = person[1]; // number

// Tuple with optional elements
let coordinate: [number, number, number?] = [10, 20];
coordinate = [10, 20, 30]; // ✅ OK

// Named tuples (TypeScript 4.0+)
let point: [x: number, y: number] = [10, 20];

// Rest elements in tuples
let restTuple: [string, ...number[]] = ["hello", 1, 2, 3, 4, 5];

// Readonly tuples
let readonlyTuple: readonly [string, number] = ["hello", 42];
// readonlyTuple[0] = "hi"; // ❌ Error - readonly
```

### **Destructuring Tuples**
```typescript
let userInfo: [string, number, boolean] = ["Alice", 25, true];

// Destructuring assignment
let [userName, userAge, isActive] = userInfo;

// Swapping values using tuples
let a = 1;
let b = 2;
[a, b] = [b, a]; // Swap values
```

---

## 🏗️ **Object Types**

Objects can be typed by declaring what the object should look like.

```typescript
// Object type annotation
let person: { name: string; age: number } = {
    name: "John",
    age: 30
};

// Optional properties
let user: { name: string; age?: number } = {
    name: "Alice"
    // age is optional
};

// Readonly properties
let config: { readonly apiUrl: string; timeout: number } = {
    apiUrl: "https://api.example.com",
    timeout: 5000
};
// config.apiUrl = "new url"; // ❌ Error - readonly

// Index signatures
let scores: { [studentName: string]: number } = {
    "Alice": 95,
    "Bob": 87,
    "Charlie": 92
};

// Nested objects
let employee: {
    personal: { name: string; age: number };
    work: { department: string; salary: number };
} = {
    personal: { name: "John", age: 30 },
    work: { department: "IT", salary: 75000 }
};
```

---

## 🎯 **Enums**

Enums allow you to define a set of named constants.

```typescript
// Numeric enums
enum Direction {
    Up,    // 0
    Down,  // 1
    Left,  // 2
    Right  // 3
}

let playerDirection: Direction = Direction.Up;

// String enums
enum Color {
    Red = "red",
    Green = "green",
    Blue = "blue"
}

let favoriteColor: Color = Color.Red;

// Heterogeneous enums (mixed)
enum Mixed {
    No = 0,
    Yes = "yes"
}

// Const enums (better performance)
const enum HttpStatus {
    OK = 200,
    BadRequest = 400,
    NotFound = 404,
    InternalServerError = 500
}

let status: HttpStatus = HttpStatus.OK;

// Reverse mapping (numeric enums only)
console.log(Direction[0]); // "Up"
console.log(Direction.Up); // 0
```

---

## 🔗 **Aliases & Interfaces**

Type aliases and interfaces allow you to create reusable type definitions.

### **Type Aliases**
```typescript
// Basic type alias
type UserID = string | number;
type Status = "pending" | "approved" | "rejected";

// Object type alias
type User = {
    id: UserID;
    name: string;
    status: Status;
};

// Function type alias
type GreetFunction = (name: string) => string;

// Generic type alias
type Container<T> = {
    value: T;
    timestamp: Date;
};
```

### **Interfaces**
```typescript
// Basic interface
interface Person {
    name: string;
    age: number;
    email?: string; // Optional property
}

// Interface with methods
interface Calculator {
    add(a: number, b: number): number;
    subtract(a: number, b: number): number;
}

// Extending interfaces
interface Student extends Person {
    studentId: string;
    courses: string[];
}

// Interface merging
interface Window {
    customProperty: string;
}

interface Window {
    anotherProperty: number;
}
// Window now has both customProperty and anotherProperty
```

### **Type Aliases vs Interfaces**
```typescript
// Use interfaces for object shapes that might be extended
interface Animal {
    name: string;
}

interface Dog extends Animal {
    breed: string;
}

// Use type aliases for unions, primitives, and computed types
type StringOrNumber = string | number;
type EventHandler<T> = (event: T) => void;
```

---

## 🔀 **Union Types**

Union types allow a value to be one of several types.

```typescript
// Basic union types
let id: string | number;
id = "abc123";
id = 123;

// Union with more types
let value: string | number | boolean;

// Arrays with union types
let mixedArray: (string | number)[] = ["hello", 42, "world", 99];

// Function parameters with union types
function printId(id: string | number) {
    if (typeof id === "string") {
        console.log(`String ID: ${id.toUpperCase()}`);
    } else {
        console.log(`Number ID: ${id.toFixed(2)}`);
    }
}

// Union types with objects
type Cat = { type: "cat"; meows: boolean };
type Dog = { type: "dog"; barks: boolean };
type Pet = Cat | Dog;

function petAction(pet: Pet) {
    if (pet.type === "cat") {
        console.log(pet.meows ? "Meowing" : "Silent cat");
    } else {
        console.log(pet.barks ? "Barking" : "Quiet dog");
    }
}
```

---

## 🔧 **Functions**

### **Function Types**
```typescript
// Function declaration
function add(x: number, y: number): number {
    return x + y;
}

// Function expression
let myAdd = function(x: number, y: number): number {
    return x + y;
};

// Arrow function
let myAdd2 = (x: number, y: number): number => x + y;

// Function type
let myAdd3: (x: number, y: number) => number = 
    function(x: number, y: number): number {
        return x + y;
    };
```

### **Optional and Default Parameters**
```typescript
// Optional parameters
function buildName(firstName: string, lastName?: string): string {
    if (lastName)
        return firstName + " " + lastName;
    else
        return firstName;
}

// Default parameters
function buildName2(firstName: string, lastName = "Smith"): string {
    return firstName + " " + lastName;
}

// Rest parameters
function buildName3(firstName: string, ...restOfName: string[]): string {
    return firstName + " " + restOfName.join(" ");
}
```

### **Function Overloads**
```typescript
// Overload signatures
function pickCard(x: {suit: string; card: number}[]): number;
function pickCard(x: number): {suit: string; card: number};

// Implementation
function pickCard(x: any): any {
    if (typeof x == "object") {
        let pickedCard = Math.floor(Math.random() * x.length);
        return pickedCard;
    } else if (typeof x == "number") {
        let pickedSuit = Math.floor(x / 13);
        return { suit: suits[pickedSuit], card: x % 13 };
    }
}
```

---

## 🎭 **Casting**

Type casting allows you to override TypeScript's inferred types.

### **Angle Bracket Syntax**
```typescript
let someValue: unknown = "this is a string";
let strLength: number = (<string>someValue).length;
```

### **As Syntax (Recommended)**
```typescript
let someValue: unknown = "this is a string";
let strLength: number = (someValue as string).length;

// More examples
let userInput: unknown = "42";
let numericValue: number = userInput as number; // ⚠️ Dangerous if not actually a number

// Safe casting with type guards
if (typeof userInput === "string") {
    let numericValue: number = parseInt(userInput);
}
```

### **DOM Element Casting**
```typescript
// Getting DOM elements
let canvas = document.getElementById("canvas") as HTMLCanvasElement;
let button = document.querySelector(".btn") as HTMLButtonElement;

// Non-null assertion operator
let element = document.getElementById("myElement")!; // ! asserts non-null
```

### **Const Assertions**
```typescript
// Without const assertion
let colors1 = ["red", "green", "blue"]; // string[]

// With const assertion
let colors2 = ["red", "green", "blue"] as const; // readonly ["red", "green", "blue"]

// Object const assertion
let config = {
    apiUrl: "https://api.example.com",
    timeout: 5000
} as const;
// config is now readonly
```

---

## 🏛️ **Classes**

### **Basic Class**
```typescript
class Greeter {
    greeting: string;

    constructor(message: string) {
        this.greeting = message;
    }

    greet(): string {
        return "Hello, " + this.greeting;
    }
}

let greeter = new Greeter("world");
console.log(greeter.greet());
```

### **Access Modifiers**
```typescript
class Animal {
    public name: string;           // Public by default
    private species: string;       // Only accessible within this class
    protected habitat: string;     // Accessible within this class and subclasses
    readonly id: number;           // Cannot be modified after initialization

    constructor(name: string, species: string, habitat: string) {
        this.name = name;
        this.species = species;
        this.habitat = habitat;
        this.id = Math.random();
    }

    public move(distanceInMeters: number = 0): void {
        console.log(`${this.name} moved ${distanceInMeters}m.`);
    }

    protected getSpecies(): string {
        return this.species;
    }
}
```

### **Inheritance**
```typescript
class Dog extends Animal {
    breed: string;

    constructor(name: string, breed: string) {
        super(name, "Canine", "Domestic"); // Call parent constructor
        this.breed = breed;
    }

    public bark(): void {
        console.log("Woof! Woof!");
    }

    public move(distanceInMeters = 5): void {
        console.log("Running...");
        super.move(distanceInMeters);
    }

    // Can access protected members
    public getInfo(): string {
        return `${this.name} is a ${this.getSpecies()}`;
    }
}
```

### **Abstract Classes**
```typescript
abstract class Department {
    constructor(public name: string) {}

    printName(): void {
        console.log("Department name: " + this.name);
    }

    abstract printMeeting(): void; // Must be implemented in derived classes
}

class AccountingDepartment extends Department {
    constructor() {
        super("Accounting and Auditing");
    }

    printMeeting(): void {
        console.log("The Accounting Department meets at 10am.");
    }

    generateReports(): void {
        console.log("Generating accounting reports...");
    }
}
```

### **Getters and Setters**
```typescript
class Employee {
    private _fullName: string;

    get fullName(): string {
        return this._fullName;
    }

    set fullName(newName: string) {
        if (newName && newName.length > 0) {
            this._fullName = newName;
        } else {
            console.log("Invalid name");
        }
    }
}

let employee = new Employee();
employee.fullName = "Bob Smith";
console.log(employee.fullName);
```

### **Static Members**
```typescript
class Grid {
    static origin = { x: 0, y: 0 };

    calculateDistanceFromOrigin(point: { x: number; y: number }) {
        let xDist = point.x - Grid.origin.x;
        let yDist = point.y - Grid.origin.y;
        return Math.sqrt(xDist * xDist + yDist * yDist) / this.scale;
    }

    constructor(public scale: number) {}
}
```

---

## 🧬 **Basic Generics**

Generics provide a way to create reusable components that work with multiple types.

### **Generic Functions**
```typescript
// Basic generic function
function identity<T>(arg: T): T {
    return arg;
}

// Usage
let stringResult = identity<string>("hello");
let numberResult = identity<number>(42);
let booleanResult = identity<boolean>(true);

// Type inference
let inferredResult = identity("hello"); // TypeScript infers T as string
```

### **Generic Interfaces**
```typescript
interface Pair<T, U> {
    first: T;
    second: U;
}

let stringNumberPair: Pair<string, number> = {
    first: "hello",
    second: 42
};

let numberBooleanPair: Pair<number, boolean> = {
    first: 100,
    second: true
};
```

### **Generic Classes**
```typescript
class Container<T> {
    private _value: T;

    constructor(value: T) {
        this._value = value;
    }

    getValue(): T {
        return this._value;
    }

    setValue(value: T): void {
        this._value = value;
    }
}

let stringContainer = new Container<string>("hello");
let numberContainer = new Container<number>(42);
```

### **Generic Constraints**
```typescript
interface Lengthwise {
    length: number;
}

function logLength<T extends Lengthwise>(arg: T): T {
    console.log(arg.length);
    return arg;
}

logLength("hello"); // ✅ OK - string has length
logLength([1, 2, 3]); // ✅ OK - array has length
// logLength(42); // ❌ Error - number doesn't have length
```

---

## 🛠️ **Utility Types**

TypeScript provides built-in utility types for common type transformations.

### **Partial**
```typescript
interface User {
    id: number;
    name: string;
    email: string;
}

// Makes all properties optional
type PartialUser = Partial<User>;
// { id?: number; name?: string; email?: string; }

function updateUser(id: number, updates: Partial<User>) {
    // Can update any subset of user properties
}
```

### **Required**
```typescript
interface Config {
    apiUrl?: string;
    timeout?: number;
    retries?: number;
}

// Makes all properties required
type RequiredConfig = Required<Config>;
// { apiUrl: string; timeout: number; retries: number; }
```

### **Readonly**
```typescript
interface Mutable {
    x: number;
    y: number;
}

type ReadonlyPoint = Readonly<Mutable>;
// { readonly x: number; readonly y: number; }
```

### **Pick**
```typescript
interface User {
    id: number;
    name: string;
    email: string;
    password: string;
}

// Pick specific properties
type PublicUser = Pick<User, "id" | "name" | "email">;
// { id: number; name: string; email: string; }
```

### **Omit**
```typescript
// Omit specific properties
type UserWithoutPassword = Omit<User, "password">;
// { id: number; name: string; email: string; }
```

### **Record**
```typescript
// Create an object type with specific keys and value type
type UserRoles = Record<string, "admin" | "user" | "guest">;
// { [x: string]: "admin" | "user" | "guest"; }

let roles: UserRoles = {
    "john": "admin",
    "jane": "user",
    "bob": "guest"
};
```

### **Exclude and Extract**
```typescript
type T1 = Exclude<"a" | "b" | "c", "a">; // "b" | "c"
type T2 = Extract<"a" | "b" | "c", "a" | "f">; // "a"
```

---

## 🔑 **Keyof**

The `keyof` operator takes an object type and produces a string or numeric literal union of its keys.

```typescript
interface Person {
    name: string;
    age: number;
    email: string;
}

type PersonKeys = keyof Person; // "name" | "age" | "email"

// Using keyof in functions
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}

let person: Person = {
    name: "John",
    age: 30,
    email: "john@example.com"
};

let name = getProperty(person, "name"); // string
let age = getProperty(person, "age"); // number
// let invalid = getProperty(person, "invalid"); // ❌ Error
```

### **Keyof with Index Signatures**
```typescript
interface StringArray {
    [index: string]: string;
}

type StringArrayKeys = keyof StringArray; // string | number

interface NumberArray {
    [index: number]: string;
}

type NumberArrayKeys = keyof NumberArray; // number
```

### **Practical Examples**
```typescript
// Creating a type-safe pick function
function pick<T, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    for (const key of keys) {
        result[key] = obj[key];
    }
    return result;
}

// Usage
let user = { id: 1, name: "John", email: "john@example.com", password: "secret" };
let publicInfo = pick(user, "id", "name", "email");
// { id: number; name: string; email: string; }
```

---

## ❌ **Null**

TypeScript handles null and undefined values with strict null checks.

### **Null and Undefined**
```typescript
// With strictNullChecks: false (not recommended)
let name: string = null; // ✅ OK (but not safe)

// With strictNullChecks: true (recommended)
let name: string = null; // ❌ Error

// Explicitly allow null
let name: string | null = null; // ✅ OK
let age: number | undefined = undefined; // ✅ OK
```

### **Non-null Assertion Operator**
```typescript
function processUser(user: string | null) {
    // Non-null assertion - use when you're certain value is not null
    console.log(user!.length); // ! tells TypeScript user is not null
    
    // Better approach - use type guards
    if (user !== null) {
        console.log(user.length);
    }
}
```

### **Optional Chaining**
```typescript
interface User {
    id: number;
    profile?: {
        name?: string;
        address?: {
            street?: string;
            city?: string;
        };
    };
}

let user: User = { id: 1 };

// Optional chaining
let street = user.profile?.address?.street; // string | undefined
let name = user.profile?.name; // string | undefined

// With arrays
let users: User[] | undefined = [user];
let firstUserName = users?.[0]?.profile?.name;
```

### **Nullish Coalescing**
```typescript
let userInput: string | null = null;

// Nullish coalescing operator (??)
let name = userInput ?? "Default Name"; // "Default Name"

// Different from ||
let emptyString = "";
let result1 = emptyString || "default"; // "default"
let result2 = emptyString ?? "default"; // ""
```

---

## 📚 **Definitely Typed**

DefinitelyTyped provides type definitions for JavaScript libraries.

### **Installing Type Definitions**
```bash
# Install types for popular libraries
npm install --save-dev @types/node
npm install --save-dev @types/express
npm install --save-dev @types/lodash
npm install --save-dev @types/react
npm install --save-dev @types/jest
```

### **Using Third-Party Libraries**
```typescript
// After installing @types/lodash
import _ from "lodash";

let users = [
    { name: "John", age: 30 },
    { name: "Jane", age: 25 },
    { name: "Bob", age: 35 }
];

// TypeScript knows about lodash methods and types
let sortedUsers = _.sortBy(users, "age");
let userNames = _.map(users, "name");
```

### **Ambient Declarations**
```typescript
// For libraries without types, create ambient declarations
declare module "my-library" {
    export function doSomething(param: string): number;
    export interface MyInterface {
        prop: string;
    }
}

// Usage
import { doSomething, MyInterface } from "my-library";
```

### **Global Type Declarations**
```typescript
// In a .d.ts file
declare global {
    interface Window {
        myCustomProperty: string;
        myCustomFunction(): void;
    }
    
    var customGlobal: {
        version: string;
        config: object;
    };
}

// Usage in any TypeScript file
window.myCustomProperty = "hello";
console.log(customGlobal.version);
```

---

## 🆕 **TypeScript 5 Updates**

TypeScript 5.0 brought significant improvements and new features.

### **Decorators (Stable)**
```typescript
// Decorators are now stable (not experimental)
function logged(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args: any[]) {
        console.log(`Calling ${propertyKey} with args:`, args);
        return originalMethod.apply(this, args);
    };
}

class Calculator {
    @logged
    add(a: number, b: number): number {
        return a + b;
    }
}
```

### **const Type Parameters**
```typescript
// Type parameters can now be declared as const
function createArray<const T>(items: readonly T[]): T[] {
    return [...items];
}

// Better type inference
const arr = createArray(["hello", "world"] as const);
// arr is ["hello", "world"] instead of string[]
```

### **Extends Constraints on infer**
```typescript
// More powerful type inference with extends on infer
type GetElementType<T> = T extends readonly (infer U extends string)[] ? U : never;

type StringArrayElement = GetElementType<["a", "b", "c"]>; // "a" | "b" | "c"
type NumberArrayElement = GetElementType<[1, 2, 3]>; // never
```

### **Multiple Config Files Support**
```typescript
// Better support for extending multiple config files
// tsconfig.json
{
  "extends": ["./base.json", "./strict.json"],
  "compilerOptions": {
    "outDir": "./dist"
  }
}
```

### **Bundler Module Resolution**
```typescript
// New moduleResolution option for bundlers
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "module": "esnext",
    "target": "esnext"
  }
}
```

### **Performance Improvements**
```typescript
// TypeScript 5.0 includes significant performance improvements:
// - Faster type checking
// - Reduced memory usage
// - Better incremental compilation
// - Optimized watch mode

// Speed improvements in real projects:
// - 10-20% faster type checking
// - 15-30% reduction in memory usage
// - Faster startup times for large projects
```

### **New --verbatimModuleSyntax Flag**
```typescript
// Ensures import/export syntax is preserved exactly
{
  "compilerOptions": {
    "verbatimModuleSyntax": true
  }
}

// Forces explicit type-only imports
import type { User } from "./types"; // Must use 'type' keyword
import { createUser } from "./utils"; // Runtime import
```

---

## 🔥 **Advanced Types**

### **Union Types**
```typescript
function padLeft(value: string, padding: string | number) {
    if (typeof padding === "number") {
        return Array(padding + 1).join(" ") + value;
    }
    if (typeof padding === "string") {
        return padding + value;
    }
    throw new Error(`Expected string or number, got '${padding}'.`);
}
```

### **Intersection Types**
```typescript
interface ErrorHandling {
    success: boolean;
    error?: { message: string };
}

interface ArtworksData {
    artworks: { title: string }[];
}

interface ArtistsData {
    artists: { name: string }[];
}

// Intersection types
type ArtworksResponse = ArtworksData & ErrorHandling;
type ArtistsResponse = ArtistsData & ErrorHandling;
```

### **Type Guards**
```typescript
// typeof type guards
function isNumber(x: any): x is number {
    return typeof x === "number";
}

function isString(x: any): x is string {
    return typeof x === "string";
}

// instanceof type guards
class Bird {
    fly() { console.log("flying..."); }
    layEggs() { console.log("laying eggs..."); }
}

class Fish {
    swim() { console.log("swimming..."); }
    layEggs() { console.log("laying eggs..."); }
}

function getSmallPet(): Fish | Bird {
    return Math.random() > 0.5 ? new Fish() : new Bird();
}

let pet = getSmallPet();

if (pet instanceof Fish) {
    pet.swim();
} else {
    pet.fly();
}
```

### **Discriminated Unions**
```typescript
interface Square {
    kind: "square";
    size: number;
}

interface Rectangle {
    kind: "rectangle";
    width: number;
    height: number;
}

interface Circle {
    kind: "circle";
    radius: number;
}

type Shape = Square | Rectangle | Circle;

function area(s: Shape): number {
    switch (s.kind) {
        case "square": return s.size * s.size;
        case "rectangle": return s.height * s.width;
        case "circle": return Math.PI * s.radius ** 2;
    }
}
```

### **Mapped Types**
```typescript
// Make all properties optional
type Partial<T> = {
    [P in keyof T]?: T[P];
}

// Make all properties required
type Required<T> = {
    [P in keyof T]-?: T[P];
}

// Make all properties readonly
type Readonly<T> = {
    readonly [P in keyof T]: T[P];
}

// Pick specific properties
type Pick<T, K extends keyof T> = {
    [P in K]: T[P];
}

interface Person {
    name: string;
    age: number;
    email: string;
}

type PersonSubset = Pick<Person, "name" | "email">;
// { name: string; email: string; }
```

### **Conditional Types**
```typescript
type TypeName<T> = 
    T extends string ? "string" :
    T extends number ? "number" :
    T extends boolean ? "boolean" :
    T extends undefined ? "undefined" :
    T extends Function ? "function" :
    "object";

type T0 = TypeName<string>;   // "string"
type T1 = TypeName<"a">;      // "string"
type T2 = TypeName<true>;     // "boolean"
type T3 = TypeName<() => void>; // "function"
```

---

## 📦 **Modules**

### **ES6 Modules**
```typescript
// math.ts
export function add(x: number, y: number): number {
    return x + y;
}

export function subtract(x: number, y: number): number {
    return x - y;
}

export default function multiply(x: number, y: number): number {
    return x * y;
}

// app.ts
import multiply, { add, subtract } from "./math";
import * as math from "./math";

console.log(add(1, 2));
console.log(math.subtract(5, 3));
console.log(multiply(2, 4));
```

### **CommonJS Modules**
```typescript
// math.ts
function add(x: number, y: number): number {
    return x + y;
}

module.exports = { add };

// app.ts
const { add } = require("./math");
```

### **Namespace**
```typescript
namespace Validation {
    export interface StringValidator {
        isAcceptable(s: string): boolean;
    }

    const lettersRegexp = /^[A-Za-z]+$/;
    const numberRegexp = /^[0-9]+$/;

    export class LettersOnlyValidator implements StringValidator {
        isAcceptable(s: string) {
            return lettersRegexp.test(s);
        }
    }

    export class ZipCodeValidator implements StringValidator {
        isAcceptable(s: string) {
            return s.length === 5 && numberRegexp.test(s);
        }
    }
}

// Usage
let validators: { [s: string]: Validation.StringValidator } = {};
validators["ZIP code"] = new Validation.ZipCodeValidator();
validators["Letters only"] = new Validation.LettersOnlyValidator();
```

---

## ✨ **Decorators**

### **Class Decorators**
```typescript
// Enable decorators in tsconfig.json
// "experimentalDecorators": true

function sealed(constructor: Function) {
    Object.seal(constructor);
    Object.seal(constructor.prototype);
}

@sealed
class Greeter {
    greeting: string;
    constructor(message: string) {
        this.greeting = message;
    }
    greet() {
        return "Hello, " + this.greeting;
    }
}
```

### **Method Decorators**
```typescript
function enumerable(value: boolean) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        descriptor.enumerable = value;
    };
}

class Greeter {
    greeting: string;
    constructor(message: string) {
        this.greeting = message;
    }

    @enumerable(false)
    greet() {
        return "Hello, " + this.greeting;
    }
}
```

### **Property Decorators**
```typescript
function format(formatString: string) {
    return function (target: any, propertyKey: string) {
        let value = target[propertyKey];

        const getter = function () {
            return `${formatString} ${value}`;
        };

        const setter = function (newVal: string) {
            value = newVal;
        };

        Object.defineProperty(target, propertyKey, {
            get: getter,
            set: setter,
            enumerable: true,
            configurable: true,
        });
    };
}

class Greeter {
    @format("Hello")
    greeting: string;

    constructor(message: string) {
        this.greeting = message;
    }
}
```

---

## 🎯 **Best Practices**

### **1. Use Strict Configuration**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### **2. Prefer Type Inference**
```typescript
// ❌ Redundant type annotation
const message: string = "Hello World";

// ✅ Let TypeScript infer
const message = "Hello World";

// ✅ Type annotation needed here
function greet(name: string): string {
    return `Hello, ${name}`;
}
```

### **3. Use Union Types Instead of Any**
```typescript
// ❌ Avoid any
function processId(id: any) {
    // ...
}

// ✅ Use union types
function processId(id: string | number) {
    if (typeof id === "string") {
        // TypeScript knows id is string here
        return id.toUpperCase();
    } else {
        // TypeScript knows id is number here
        return id.toString();
    }
}
```

### **4. Use Type Assertions Carefully**
```typescript
// ❌ Dangerous type assertion
const canvas = document.getElementById("canvas") as HTMLCanvasElement;

// ✅ Safe type assertion with check
const canvas = document.getElementById("canvas");
if (canvas instanceof HTMLCanvasElement) {
    // Safe to use canvas methods
    const ctx = canvas.getContext("2d");
}
```

### **5. Prefer Interfaces for Object Shapes**
```typescript
// ✅ Use interface for object shapes
interface User {
    id: number;
    name: string;
    email: string;
}

// ✅ Use type for unions, primitives, computed types
type Status = "pending" | "approved" | "rejected";
type UserWithStatus = User & { status: Status };
```

### **6. Use Readonly for Immutable Data**
```typescript
interface ReadonlyUser {
    readonly id: number;
    readonly name: string;
    readonly email: string;
}

// For arrays
const numbers: readonly number[] = [1, 2, 3];
// numbers.push(4); // ❌ Error
```

---

## 🌟 **Real-World Examples**

### **1. API Response Handling**
```typescript
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
}

interface Product {
    id: string;
    title: string;
    price: number;
    inStock: boolean;
}

// Generic API function
async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        return {
            success: true,
            data,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// Usage
async function getUser(id: number): Promise<User | null> {
    const response = await fetchData<User>(`/api/users/${id}`);
    
    if (response.success && response.data) {
        return response.data;
    }
    
    console.error("Failed to fetch user:", response.error);
    return null;
}
```

### **2. Event System with Type Safety**
```typescript
// Event definitions
interface EventMap {
    "user:login": { userId: number; timestamp: Date };
    "user:logout": { userId: number };
    "product:purchase": { productId: string; userId: number; amount: number };
    "cart:update": { items: CartItem[]; total: number };
}

interface CartItem {
    productId: string;
    quantity: number;
    price: number;
}

// Type-safe event emitter
class TypedEventEmitter {
    private listeners: { [K in keyof EventMap]?: Array<(data: EventMap[K]) => void> } = {};

    on<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): void {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event]!.push(listener);
    }

    emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
        const eventListeners = this.listeners[event];
        if (eventListeners) {
            eventListeners.forEach(listener => listener(data));
        }
    }

    off<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): void {
        const eventListeners = this.listeners[event];
        if (eventListeners) {
            this.listeners[event] = eventListeners.filter(l => l !== listener);
        }
    }
}

// Usage
const eventEmitter = new TypedEventEmitter();

eventEmitter.on("user:login", (data) => {
    console.log(`User ${data.userId} logged in at ${data.timestamp}`);
});

eventEmitter.on("product:purchase", (data) => {
    console.log(`User ${data.userId} purchased product ${data.productId} for $${data.amount}`);
});

// Type-safe event emission
eventEmitter.emit("user:login", { 
    userId: 123, 
    timestamp: new Date() 
});

// This would cause a TypeScript error:
// eventEmitter.emit("user:login", { userId: "123" }); // ❌ Error: string not assignable to number
```

### **3. Database Layer with Generics**
```typescript
// Database entity base
interface BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}

// Specific entities
interface User extends BaseEntity {
    name: string;
    email: string;
    role: "admin" | "user" | "moderator";
}

interface Post extends BaseEntity {
    title: string;
    content: string;
    authorId: string;
    published: boolean;
}

// Generic repository pattern
interface Repository<T extends BaseEntity> {
    findById(id: string): Promise<T | null>;
    findAll(): Promise<T[]>;
    create(data: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T>;
    update(id: string, data: Partial<Omit<T, "id" | "createdAt" | "updatedAt">>): Promise<T | null>;
    delete(id: string): Promise<boolean>;
}

// Implementation
class GenericRepository<T extends BaseEntity> implements Repository<T> {
    constructor(private tableName: string) {}

    async findById(id: string): Promise<T | null> {
        // Database query implementation
        console.log(`Finding ${this.tableName} with id: ${id}`);
        return null; // Placeholder
    }

    async findAll(): Promise<T[]> {
        console.log(`Finding all ${this.tableName}`);
        return []; // Placeholder
    }

    async create(data: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T> {
        const entity = {
            ...data,
            id: Math.random().toString(36),
            createdAt: new Date(),
            updatedAt: new Date()
        } as T;

        console.log(`Creating ${this.tableName}:`, entity);
        return entity;
    }

    async update(id: string, data: Partial<Omit<T, "id" | "createdAt" | "updatedAt">>): Promise<T | null> {
        console.log(`Updating ${this.tableName} ${id}:`, data);
        return null; // Placeholder
    }

    async delete(id: string): Promise<boolean> {
        console.log(`Deleting ${this.tableName} with id: ${id}`);
        return true;
    }
}

// Usage
const userRepository = new GenericRepository<User>("users");
const postRepository = new GenericRepository<Post>("posts");

// Type-safe operations
async function createUser() {
    const user = await userRepository.create({
        name: "John Doe",
        email: "john@example.com",
        role: "user"
    });
    
    console.log("Created user:", user);
}

async function createPost() {
    const post = await postRepository.create({
        title: "TypeScript is Awesome",
        content: "Learning TypeScript has improved my development experience...",
        authorId: "user123",
        published: false
    });
    
    console.log("Created post:", post);
}
```

### **4. React Component with TypeScript**
```typescript
import React, { useState, useEffect } from 'react';

// Props interface
interface UserCardProps {
    userId: number;
    showEmail?: boolean;
    onUserClick?: (user: User) => void;
    className?: string;
}

// Component state
interface UserCardState {
    user: User | null;
    loading: boolean;
    error: string | null;
}

// User data interface
interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    isOnline: boolean;
}

// React component with TypeScript
const UserCard: React.FC<UserCardProps> = ({ 
    userId, 
    showEmail = true, 
    onUserClick, 
    className = "" 
}) => {
    const [state, setState] = useState<UserCardState>({
        user: null,
        loading: true,
        error: null
    });

    useEffect(() => {
        fetchUser(userId);
    }, [userId]);

    const fetchUser = async (id: number): Promise<void> => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null }));
            
            const response = await fetch(`/api/users/${id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch user');
            }
            
            const user: User = await response.json();
            setState(prev => ({ ...prev, user, loading: false }));
        } catch (error) {
            setState(prev => ({ 
                ...prev, 
                error: error instanceof Error ? error.message : 'Unknown error',
                loading: false 
            }));
        }
    };

    const handleClick = (): void => {
        if (state.user && onUserClick) {
            onUserClick(state.user);
        }
    };

    if (state.loading) {
        return <div className={`user-card loading ${className}`}>Loading...</div>;
    }

    if (state.error) {
        return <div className={`user-card error ${className}`}>Error: {state.error}</div>;
    }

    if (!state.user) {
        return <div className={`user-card not-found ${className}`}>User not found</div>;
    }

    return (
        <div className={`user-card ${className}`} onClick={handleClick}>
            <div className="user-avatar">
                {state.user.avatar ? (
                    <img src={state.user.avatar} alt={state.user.name} />
                ) : (
                    <div className="avatar-placeholder">{state.user.name[0]}</div>
                )}
                <span className={`status ${state.user.isOnline ? 'online' : 'offline'}`} />
            </div>
            
            <div className="user-info">
                <h3>{state.user.name}</h3>
                {showEmail && <p>{state.user.email}</p>}
            </div>
        </div>
    );
};

export default UserCard;

// Usage example
const App: React.FC = () => {
    const handleUserClick = (user: User): void => {
        console.log('User clicked:', user);
    };

    return (
        <div>
            <UserCard 
                userId={1} 
                showEmail={true}
                onUserClick={handleUserClick}
                className="my-custom-class"
            />
        </div>
    );
};
```

---

## 🏆 **Conclusion**

TypeScript provides:

✅ **Better Developer Experience** - IntelliSense, refactoring, navigation  
✅ **Early Error Detection** - Catch bugs at compile time  
✅ **Self-Documenting Code** - Types serve as documentation  
✅ **Gradual Adoption** - Can be introduced incrementally  
✅ **Modern JavaScript Features** - Latest ECMAScript features  
✅ **Large Community** - Extensive ecosystem and support  

### **Next Steps:**
1. **Practice** - Start with simple projects and gradually add complexity
2. **Read Documentation** - Official TypeScript handbook
3. **Join Community** - TypeScript Discord, Stack Overflow
4. **Contribute** - Open source projects using TypeScript
5. **Stay Updated** - Follow TypeScript releases and new features

### **Resources:**
- [TypeScript Official Documentation](https://www.typescriptlang.org/docs/)
- [TypeScript Playground](https://www.typescriptlang.org/play)
- [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) - Type definitions
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/) - Free online book

---

**Happy Coding with TypeScript! 🚀**
