# Gang of Four (GoF) Design Patterns — Complete Guide

The 23 classic design patterns from *Design Patterns: Elements of Reusable Object-Oriented Software* (1994) by Gamma, Helm, Johnson, and Vlissides — the "Gang of Four." Examples use TypeScript because its types make the intent of each pattern obvious at a glance, but every pattern applies to any OOP language.

Each pattern follows the same structure: **the problem it solves → the solution → a working example → when to use it → trade-offs.**

---

## Table of Contents

**Creational** — how objects get created
1. [Singleton](#1-singleton)
2. [Factory Method](#2-factory-method)
3. [Abstract Factory](#3-abstract-factory)
4. [Builder](#4-builder)
5. [Prototype](#5-prototype)

**Structural** — how objects are composed
6. [Adapter](#6-adapter)
7. [Bridge](#7-bridge)
8. [Composite](#8-composite)
9. [Decorator](#9-decorator)
10. [Facade](#10-facade)
11. [Flyweight](#11-flyweight)
12. [Proxy](#12-proxy)

**Behavioral** — how objects communicate
13. [Chain of Responsibility](#13-chain-of-responsibility)
14. [Command](#14-command)
15. [Interpreter](#15-interpreter)
16. [Iterator](#16-iterator)
17. [Mediator](#17-mediator)
18. [Memento](#18-memento)
19. [Observer](#19-observer)
20. [State](#20-state)
21. [Strategy](#21-strategy)
22. [Template Method](#22-template-method)
23. [Visitor](#23-visitor)

[Quick Reference: Which Pattern Do I Need?](#quick-reference-which-pattern-do-i-need)

---

## Creational Patterns

Creational patterns abstract away *how* objects get instantiated, so your code depends on interfaces, not concrete constructors.

---

### 1. Singleton

**Problem:** You need exactly one instance of a class across the whole application (e.g. a database connection, a config manager) and a global point of access to it.

**Solution:** Make the constructor private and expose a static method that creates the instance once, then returns the cached instance on every later call.

```typescript
class Database {
  private static instance: Database;
  private connection: string;

  private constructor() {
    this.connection = "Connected to DB";
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  query(sql: string) {
    return `Running "${sql}" on ${this.connection}`;
  }
}

const db1 = Database.getInstance();
const db2 = Database.getInstance();
console.log(db1 === db2); // true — same instance
```

**When to use:** Shared resources like connection pools, loggers, or app-wide configuration.

**Trade-offs:** Widely considered overused — it's effectively global state, which makes unit testing harder (hidden dependencies) and can hide poor design. Prefer dependency injection where possible.

---

### 2. Factory Method

**Problem:** A class shouldn't know in advance which concrete class of object it needs to create — subclasses should decide.

**Solution:** Define a method for creating objects, but let subclasses override which class gets instantiated.

```typescript
interface Notification {
  send(message: string): void;
}

class EmailNotification implements Notification {
  send(message: string) { console.log(`Email: ${message}`); }
}

class SMSNotification implements Notification {
  send(message: string) { console.log(`SMS: ${message}`); }
}

abstract class NotifierFactory {
  abstract createNotification(): Notification;

  notify(message: string) {
    const notification = this.createNotification(); // factory method
    notification.send(message);
  }
}

class EmailNotifierFactory extends NotifierFactory {
  createNotification(): Notification { return new EmailNotification(); }
}

class SMSNotifierFactory extends NotifierFactory {
  createNotification(): Notification { return new SMSNotification(); }
}

const notifier = new EmailNotifierFactory();
notifier.notify("Your order shipped!"); // Email: Your order shipped!
```

**When to use:** When a class can't anticipate the exact type of object it needs, or you want to let subclasses extend which objects get created.

**Trade-offs:** Introduces a new subclass per product type — can lead to class explosion for many variants.

---

### 3. Abstract Factory

**Problem:** You need to create **families of related objects** (e.g. a UI kit's buttons + checkboxes) that must stay consistent with each other, without specifying their concrete classes.

**Solution:** Define an interface for creating each product in the family; concrete factories implement it for a specific "theme."

```typescript
interface Button { render(): string; }
interface Checkbox { render(): string; }

class DarkButton implements Button { render() { return "[Dark Button]"; } }
class DarkCheckbox implements Checkbox { render() { return "[Dark Checkbox]"; } }

class LightButton implements Button { render() { return "[Light Button]"; } }
class LightCheckbox implements Checkbox { render() { return "[Light Checkbox]"; } }

interface UIFactory {
  createButton(): Button;
  createCheckbox(): Checkbox;
}

class DarkThemeFactory implements UIFactory {
  createButton(): Button { return new DarkButton(); }
  createCheckbox(): Checkbox { return new DarkCheckbox(); }
}

class LightThemeFactory implements UIFactory {
  createButton(): Button { return new LightButton(); }
  createCheckbox(): Checkbox { return new LightCheckbox(); }
}

function renderUI(factory: UIFactory) {
  console.log(factory.createButton().render());
  console.log(factory.createCheckbox().render());
}

renderUI(new DarkThemeFactory());
// [Dark Button]
// [Dark Checkbox]
```

**When to use:** Cross-platform UI toolkits, swappable "theme" or "provider" systems where every product in the family must match.

**Trade-offs:** Adding a new product type (e.g. `Slider`) means updating every concrete factory — the interface grows across the whole family.

---

### 4. Builder

**Problem:** Constructing a complex object step-by-step (with many optional parameters) using a single giant constructor becomes unreadable ("telescoping constructor" problem).

**Solution:** Extract the construction logic into a separate `Builder` object that assembles the product piece by piece, exposing a fluent (chainable) API.

```typescript
class Pizza {
  constructor(
    public size: string,
    public toppings: string[],
    public crust: string
  ) {}
}

class PizzaBuilder {
  private size = "medium";
  private toppings: string[] = [];
  private crust = "regular";

  setSize(size: string): this { this.size = size; return this; }
  addTopping(topping: string): this { this.toppings.push(topping); return this; }
  setCrust(crust: string): this { this.crust = crust; return this; }

  build(): Pizza {
    return new Pizza(this.size, this.toppings, this.crust);
  }
}

const pizza = new PizzaBuilder()
  .setSize("large")
  .addTopping("mushroom")
  .addTopping("olives")
  .setCrust("thin")
  .build();

console.log(pizza);
// Pizza { size: 'large', toppings: ['mushroom', 'olives'], crust: 'thin' }
```

**When to use:** Objects with many optional configuration fields, or where you want the same construction process to produce different representations.

**Trade-offs:** Adds an extra builder class per product — overkill for simple objects with just a couple of fields.

---

### 5. Prototype

**Problem:** Creating a new object is expensive (e.g. it requires a database call or heavy computation), but you already have a similar object you could copy instead.

**Solution:** Clone existing objects instead of constructing new ones from scratch, via a `clone()` method.

```typescript
interface Cloneable<T> {
  clone(): T;
}

class Sheep implements Cloneable<Sheep> {
  constructor(public name: string, public dna: string) {}

  clone(): Sheep {
    return new Sheep(this.name, this.dna); // shallow copy of primitive fields
  }
}

const dolly = new Sheep("Dolly", "AGTC...");
const clone = dolly.clone();
clone.name = "Dolly Jr.";

console.log(dolly.name, clone.name); // Dolly, Dolly Jr.
console.log(dolly.dna === clone.dna); // true — same DNA copied
```

**When to use:** Object creation is costlier than copying, or you need many near-identical variants of a base object (e.g. game entities, document templates).

**Trade-offs:** Deep-cloning objects with nested references or circular structures requires careful handling (see `structuredClone`, or a deep-clone library).

---

## Structural Patterns

Structural patterns describe how to assemble classes and objects into larger structures while keeping them flexible and efficient.

---

### 6. Adapter

**Problem:** You have an existing class with an incompatible interface that you want to reuse without modifying its source code.

**Solution:** Wrap the incompatible object in a new class ("adapter") that translates calls into the format the client expects.

```typescript
// Existing third-party class — interface you can't change
class LegacyPrinter {
  printOldFormat(text: string) {
    console.log(`[Legacy] ${text.toUpperCase()}`);
  }
}

// Interface your app expects
interface ModernPrinter {
  print(text: string): void;
}

// Adapter bridges the two
class PrinterAdapter implements ModernPrinter {
  constructor(private legacy: LegacyPrinter) {}
  print(text: string) {
    this.legacy.printOldFormat(text); // translates the call
  }
}

const printer: ModernPrinter = new PrinterAdapter(new LegacyPrinter());
printer.print("hello world"); // [Legacy] HELLO WORLD
```

**When to use:** Integrating a third-party library, legacy code, or external API whose interface doesn't match what your app expects.

**Trade-offs:** Adds an extra layer of indirection — fine for one or two integrations, but many adapters can hint the underlying design needs rethinking.

---

### 7. Bridge

**Problem:** You have two dimensions of variation that would otherwise multiply into an explosion of subclasses (e.g. `RedCircle`, `BlueCircle`, `RedSquare`, `BlueSquare`...).

**Solution:** Split the abstraction (what) from the implementation (how) into two separate hierarchies connected by composition, so they can vary independently.

```typescript
// Implementation hierarchy — "how to render"
interface Renderer {
  renderShape(name: string): void;
}

class VectorRenderer implements Renderer {
  renderShape(name: string) { console.log(`Drawing ${name} as vectors`); }
}

class RasterRenderer implements Renderer {
  renderShape(name: string) { console.log(`Drawing ${name} as pixels`); }
}

// Abstraction hierarchy — "what to render"
abstract class Shape {
  constructor(protected renderer: Renderer) {}
  abstract draw(): void;
}

class Circle extends Shape {
  draw() { this.renderer.renderShape("Circle"); }
}

class Square extends Shape {
  draw() { this.renderer.renderShape("Square"); }
}

new Circle(new VectorRenderer()).draw(); // Drawing Circle as vectors
new Square(new RasterRenderer()).draw(); // Drawing Square as pixels
```

**When to use:** When both the abstraction and its implementation need to be extendable independently (shapes × renderers, devices × remote controls).

**Trade-offs:** Adds upfront complexity — only worth it when you genuinely expect both dimensions to grow.

---

### 8. Composite

**Problem:** You need to treat individual objects and groups of objects (trees of objects) the same way — e.g. a file and a folder full of files.

**Solution:** Define a common interface for both leaf and container nodes, so client code doesn't need to distinguish between them.

```typescript
interface FileSystemNode {
  getSize(): number;
  print(indent?: string): void;
}

class File implements FileSystemNode {
  constructor(private name: string, private size: number) {}
  getSize() { return this.size; }
  print(indent = "") { console.log(`${indent}${this.name} (${this.size}kb)`); }
}

class Folder implements FileSystemNode {
  private children: FileSystemNode[] = [];
  constructor(private name: string) {}

  add(node: FileSystemNode) { this.children.push(node); }

  getSize(): number {
    return this.children.reduce((sum, child) => sum + child.getSize(), 0);
  }

  print(indent = "") {
    console.log(`${indent}${this.name}/`);
    this.children.forEach(child => child.print(indent + "  "));
  }
}

const root = new Folder("root");
const src = new Folder("src");
src.add(new File("index.ts", 4));
src.add(new File("utils.ts", 2));
root.add(src);
root.add(new File("readme.md", 1));

root.print();
console.log("Total size:", root.getSize(), "kb"); // 7 kb
```

**When to use:** Tree structures — file systems, UI component trees, org charts, menu systems.

**Trade-offs:** Can make it harder to restrict what types of children a container accepts, since leaves and composites share one interface.

---

### 9. Decorator

**Problem:** You want to add responsibilities to an individual object dynamically, without affecting other instances of the same class or creating a rigid subclass hierarchy for every combination of features.

**Solution:** Wrap the object in decorator classes that implement the same interface and add behavior before/after delegating to the wrapped object.

```typescript
interface Coffee {
  cost(): number;
  description(): string;
}

class SimpleCoffee implements Coffee {
  cost() { return 2; }
  description() { return "Coffee"; }
}

abstract class CoffeeDecorator implements Coffee {
  constructor(protected coffee: Coffee) {}
  cost() { return this.coffee.cost(); }
  description() { return this.coffee.description(); }
}

class MilkDecorator extends CoffeeDecorator {
  cost() { return super.cost() + 0.5; }
  description() { return super.description() + " + Milk"; }
}

class SugarDecorator extends CoffeeDecorator {
  cost() { return super.cost() + 0.2; }
  description() { return super.description() + " + Sugar"; }
}

let coffee: Coffee = new SimpleCoffee();
coffee = new MilkDecorator(coffee);
coffee = new SugarDecorator(coffee);

console.log(coffee.description(), "=", coffee.cost());
// Coffee + Milk + Sugar = 2.7
```

**When to use:** Adding optional features/behaviors to objects (middleware, UI component wrapping, I/O stream layering) without an explosion of subclasses per combination.

**Trade-offs:** Many small wrapper layers can be harder to debug — the object's final behavior is the sum of every decorator applied.

---

### 10. Facade

**Problem:** A subsystem is made up of many complex, interdependent classes, and client code has to understand all of them just to perform a simple task.

**Solution:** Provide a single, simplified interface that hides the subsystem's complexity behind one entry point.

```typescript
class CPU { boot() { console.log("CPU booting..."); } }
class Memory { load() { console.log("Memory loading..."); } }
class HardDrive { read() { console.log("Reading disk..."); } }

// Facade — hides the complexity of coordinating the subsystems
class ComputerFacade {
  private cpu = new CPU();
  private memory = new Memory();
  private drive = new HardDrive();

  start() {
    this.cpu.boot();
    this.memory.load();
    this.drive.read();
    console.log("Computer ready!");
  }
}

const computer = new ComputerFacade();
computer.start(); // client doesn't need to know about CPU/Memory/HardDrive
```

**When to use:** Simplifying a complex library/subsystem's API for common use cases, or decoupling client code from a system's internal structure.

**Trade-offs:** Can become a "god object" if it accumulates too much responsibility — keep it a thin coordination layer.

---

### 11. Flyweight

**Problem:** You need to create a huge number of similar objects, and storing all their data individually would use too much memory.

**Solution:** Split object state into **intrinsic** (shared, immutable — stored once) and **extrinsic** (unique per instance, passed in at use-time) parts. A factory hands out shared instances.

```typescript
// Intrinsic state — shared, expensive to duplicate
class TreeType {
  constructor(public name: string, public color: string, public texture: string) {}
  draw(x: number, y: number) {
    console.log(`Drawing ${this.name} (${this.color}) at (${x}, ${y})`);
  }
}

class TreeTypeFactory {
  private static types = new Map<string, TreeType>();

  static get(name: string, color: string, texture: string): TreeType {
    const key = `${name}-${color}-${texture}`;
    if (!this.types.has(key)) {
      this.types.set(key, new TreeType(name, color, texture)); // create once
    }
    return this.types.get(key)!; // reuse afterwards
  }
}

// Extrinsic state — unique position for each tree in the forest
class Tree {
  constructor(private x: number, private y: number, private type: TreeType) {}
  draw() { this.type.draw(this.x, this.y); }
}

const forest: Tree[] = [];
for (let i = 0; i < 10000; i++) {
  const type = TreeTypeFactory.get("Oak", "Green", "Rough"); // same shared instance every time
  forest.push(new Tree(i, i * 2, type));
}
console.log(TreeTypeFactory["types"].size); // 1 — only one TreeType object created for 10,000 trees
```

**When to use:** Rendering huge numbers of similar objects — game particle systems, text editors (glyphs), map markers.

**Trade-offs:** Adds complexity by splitting object state — only worth it when you've confirmed a real memory problem.

---

### 12. Proxy

**Problem:** You need to control access to an object — adding lazy loading, access control, caching, or logging — without changing the object itself.

**Solution:** Create a proxy class implementing the same interface as the real object, forwarding calls to it while adding extra behavior.

```typescript
interface Image {
  display(): void;
}

class RealImage implements Image {
  constructor(private filename: string) {
    this.loadFromDisk(); // expensive
  }
  private loadFromDisk() { console.log(`Loading ${this.filename} from disk...`); }
  display() { console.log(`Displaying ${this.filename}`); }
}

// Proxy — defers loading until actually needed (lazy initialization)
class ImageProxy implements Image {
  private realImage: RealImage | null = null;
  constructor(private filename: string) {}

  display() {
    if (!this.realImage) {
      this.realImage = new RealImage(this.filename); // load only on first display
    }
    this.realImage.display();
  }
}

const image = new ImageProxy("photo.png");
console.log("Image object created, but nothing loaded yet");
image.display(); // Loading photo.png from disk... / Displaying photo.png
image.display(); // Displaying photo.png (no reload — cached)
```

**When to use:** Lazy loading, access control/permissions, caching, remote object proxies (e.g. gRPC stubs), logging/metrics wrappers.

**Trade-offs:** Similar to Decorator structurally — the distinction is intent: Proxy controls *access*, Decorator adds *behavior*.

---

## Behavioral Patterns

Behavioral patterns focus on communication and responsibility distribution between objects.

---

### 13. Chain of Responsibility

**Problem:** You want multiple handlers to get a chance to process a request, without the sender knowing which handler will actually deal with it.

**Solution:** Chain handler objects together; each either handles the request or passes it to the next handler in the chain.

```typescript
abstract class SupportHandler {
  private next: SupportHandler | null = null;

  setNext(handler: SupportHandler): SupportHandler {
    this.next = handler;
    return handler; // allows chaining: h1.setNext(h2).setNext(h3)
  }

  handle(ticket: { level: number; issue: string }) {
    if (this.next) this.next.handle(ticket);
  }
}

class Level1Support extends SupportHandler {
  handle(ticket: { level: number; issue: string }) {
    if (ticket.level <= 1) console.log(`Level 1 handling: ${ticket.issue}`);
    else super.handle(ticket);
  }
}

class Level2Support extends SupportHandler {
  handle(ticket: { level: number; issue: string }) {
    if (ticket.level <= 2) console.log(`Level 2 handling: ${ticket.issue}`);
    else super.handle(ticket);
  }
}

class Level3Support extends SupportHandler {
  handle(ticket: { level: number; issue: string }) {
    console.log(`Level 3 (escalated) handling: ${ticket.issue}`);
  }
}

const level1 = new Level1Support();
level1.setNext(new Level2Support()).setNext(new Level3Support());

level1.handle({ level: 1, issue: "Forgot password" });  // Level 1 handling
level1.handle({ level: 3, issue: "Server outage" });      // Level 3 (escalated) handling
```

**When to use:** Middleware pipelines (Express/NestJS), event bubbling, approval workflows, logging with multiple severity handlers.

**Trade-offs:** No guarantee a request gets handled at all unless a final "catch-all" handler exists — can make debugging harder since the request path isn't obvious from a single place.

---

### 14. Command

**Problem:** You want to decouple the object that invokes an action from the object that knows how to perform it — and possibly queue, log, or undo actions.

**Solution:** Wrap a request as an object (with an `execute()` method) so it can be passed around, queued, and reversed.

```typescript
interface Command {
  execute(): void;
  undo(): void;
}

class Light {
  turnOn() { console.log("Light ON"); }
  turnOff() { console.log("Light OFF"); }
}

class TurnOnCommand implements Command {
  constructor(private light: Light) {}
  execute() { this.light.turnOn(); }
  undo() { this.light.turnOff(); }
}

class RemoteControl {
  private history: Command[] = [];

  press(command: Command) {
    command.execute();
    this.history.push(command);
  }

  pressUndo() {
    const command = this.history.pop();
    command?.undo();
  }
}

const light = new Light();
const remote = new RemoteControl();
remote.press(new TurnOnCommand(light)); // Light ON
remote.pressUndo();                       // Light OFF
```

**When to use:** Undo/redo systems, task queues, macro recording, decoupling UI buttons from business logic.

**Trade-offs:** Adds a class per command type — can bloat the codebase for simple actions.

---

### 15. Interpreter

**Problem:** You need to evaluate sentences in a small, well-defined language or grammar (e.g. math expressions, search filters).

**Solution:** Represent each grammar rule as a class with an `interpret()` method; combine them into an expression tree.

```typescript
interface Expression {
  interpret(): number;
}

class NumberExpression implements Expression {
  constructor(private value: number) {}
  interpret() { return this.value; }
}

class AddExpression implements Expression {
  constructor(private left: Expression, private right: Expression) {}
  interpret() { return this.left.interpret() + this.right.interpret(); }
}

class SubtractExpression implements Expression {
  constructor(private left: Expression, private right: Expression) {}
  interpret() { return this.left.interpret() - this.right.interpret(); }
}

// Represents: (5 + 3) - 2
const expression = new SubtractExpression(
  new AddExpression(new NumberExpression(5), new NumberExpression(3)),
  new NumberExpression(2)
);

console.log(expression.interpret()); // 6
```

**When to use:** Building small DSLs — rule engines, query languages, math expression evaluators.

**Trade-offs:** Grows unwieldy for complex grammars — for real programming languages, use a proper parser generator instead.

---

### 16. Iterator

**Problem:** You want to traverse a collection's elements without exposing its internal structure (array, tree, linked list...).

**Solution:** Provide a standard interface (`next()` / `hasNext()`) for sequential access — in modern JS/TS, this is exactly what `Symbol.iterator` provides natively.

```typescript
class Range implements Iterable<number> {
  constructor(private start: number, private end: number) {}

  [Symbol.iterator](): Iterator<number> {
    let current = this.start;
    const end = this.end;
    return {
      next(): IteratorResult<number> {
        if (current < end) {
          return { value: current++, done: false };
        }
        return { value: undefined, done: true };
      },
    };
  }
}

for (const num of new Range(1, 5)) {
  console.log(num); // 1, 2, 3, 4
}

console.log([...new Range(0, 3)]); // [0, 1, 2] — spread works too
```

**When to use:** Any custom collection type — trees, graphs, paginated API results — where you want `for...of` support without exposing internals.

**Trade-offs:** Rarely need to write this by hand in modern JS/TS since the language has built-in iterator protocol support — mostly relevant for custom data structures.

---

### 17. Mediator

**Problem:** Objects communicate directly with many other objects, creating a tangled web of dependencies that's hard to change.

**Solution:** Introduce a mediator object that all components talk to instead of each other — centralizing communication logic.

```typescript
class ChatRoom {
  showMessage(user: string, message: string) {
    console.log(`[${new Date().toLocaleTimeString()}] ${user}: ${message}`);
  }
}

class User {
  constructor(private name: string, private chatRoom: ChatRoom) {}
  send(message: string) {
    this.chatRoom.showMessage(this.name, message); // talks via the mediator, not directly to other users
  }
}

const chatRoom = new ChatRoom();
const alice = new User("Alice", chatRoom);
const bob = new User("Bob", chatRoom);

alice.send("Hey Bob!");
bob.send("Hey Alice!");
```

**When to use:** Chat systems, air traffic control-style coordination, complex form validation where fields affect each other, UI widgets that need to stay in sync.

**Trade-offs:** The mediator itself can become a bloated "god object" if it absorbs too much logic.

---

### 18. Memento

**Problem:** You need to capture and restore an object's internal state (undo functionality) without violating encapsulation by exposing its internals.

**Solution:** Store snapshots of the object's state in a separate "memento" object that only the originator can read/write.

```typescript
class EditorMemento {
  constructor(private readonly content: string) {}
  getContent(): string { return this.content; }
}

class Editor {
  private content = "";

  type(text: string) { this.content += text; }
  getContent() { return this.content; }

  save(): EditorMemento {
    return new EditorMemento(this.content); // snapshot
  }

  restore(memento: EditorMemento) {
    this.content = memento.getContent();
  }
}

class History {
  private mementos: EditorMemento[] = [];
  push(memento: EditorMemento) { this.mementos.push(memento); }
  pop(): EditorMemento | undefined { return this.mementos.pop(); }
}

const editor = new Editor();
const history = new History();

editor.type("Hello");
history.push(editor.save());   // checkpoint: "Hello"

editor.type(", World!");
console.log(editor.getContent()); // "Hello, World!"

editor.restore(history.pop()!);   // undo back to checkpoint
console.log(editor.getContent()); // "Hello"
```

**When to use:** Undo/redo, transaction rollback, snapshotting state before a risky operation.

**Trade-offs:** Storing many full snapshots can use significant memory — consider storing diffs for large objects.

---

### 19. Observer

**Problem:** When one object's state changes, many other objects need to be notified automatically, without the subject knowing the concrete details of its observers.

**Solution:** The subject maintains a list of observers and notifies them all (via a common interface) whenever its state changes.

```typescript
interface Observer {
  update(temperature: number): void;
}

class WeatherStation {
  private observers: Observer[] = [];

  subscribe(observer: Observer) { this.observers.push(observer); }
  unsubscribe(observer: Observer) {
    this.observers = this.observers.filter(o => o !== observer);
  }

  setTemperature(temp: number) {
    console.log(`WeatherStation: new temperature ${temp}°C`);
    this.observers.forEach(observer => observer.update(temp));
  }
}

class PhoneDisplay implements Observer {
  update(temperature: number) {
    console.log(`Phone display: ${temperature}°C`);
  }
}

class WebDashboard implements Observer {
  update(temperature: number) {
    console.log(`Web dashboard updated: ${temperature}°C`);
  }
}

const station = new WeatherStation();
const phone = new PhoneDisplay();
const web = new WebDashboard();

station.subscribe(phone);
station.subscribe(web);
station.setTemperature(25);
// WeatherStation: new temperature 25°C
// Phone display: 25°C
// Web dashboard updated: 25°C
```

**When to use:** Event systems, pub/sub, reactive UI frameworks (this is the pattern behind React state updates, RxJS, and DOM events).

**Trade-offs:** Update order between observers isn't usually guaranteed, and it's easy to create memory leaks if observers aren't unsubscribed.

---

### 20. State

**Problem:** An object's behavior needs to change based on its internal state, and the code is riddled with conditional logic (`if/else` or `switch` on a status field) scattered across many methods.

**Solution:** Extract each state into its own class implementing a common interface; the object delegates behavior to its current state object.

```typescript
interface OrderState {
  next(order: Order): void;
  describe(): string;
}

class PendingState implements OrderState {
  next(order: Order) { order.setState(new ShippedState()); }
  describe() { return "Pending"; }
}

class ShippedState implements OrderState {
  next(order: Order) { order.setState(new DeliveredState()); }
  describe() { return "Shipped"; }
}

class DeliveredState implements OrderState {
  next(order: Order) { console.log("Already delivered — no further transitions"); }
  describe() { return "Delivered"; }
}

class Order {
  private state: OrderState = new PendingState();

  setState(state: OrderState) { this.state = state; }
  advance() { this.state.next(this); }
  getStatus() { return this.state.describe(); }
}

const order = new Order();
console.log(order.getStatus()); // Pending
order.advance();
console.log(order.getStatus()); // Shipped
order.advance();
console.log(order.getStatus()); // Delivered
```

**When to use:** Order/ticket status workflows, traffic lights, game character states (idle/running/jumping), any object whose behavior meaningfully changes based on a status field.

**Trade-offs:** Adds a class per state — for a small number of simple states, a plain `switch` may be more readable.

---

### 21. Strategy

**Problem:** You have multiple interchangeable algorithms for a task (e.g. different sorting or pricing strategies), and you want to select one at runtime without a wall of `if/else`.

**Solution:** Extract each algorithm into its own class implementing a common interface, and let the client swap strategies freely.

```typescript
interface PricingStrategy {
  calculate(basePrice: number): number;
}

class RegularPricing implements PricingStrategy {
  calculate(basePrice: number) { return basePrice; }
}

class MemberDiscountPricing implements PricingStrategy {
  calculate(basePrice: number) { return basePrice * 0.9; }
}

class BlackFridayPricing implements PricingStrategy {
  calculate(basePrice: number) { return basePrice * 0.5; }
}

class ShoppingCart {
  constructor(private strategy: PricingStrategy) {}

  setStrategy(strategy: PricingStrategy) { this.strategy = strategy; }

  checkout(basePrice: number) {
    return this.strategy.calculate(basePrice);
  }
}

const cart = new ShoppingCart(new RegularPricing());
console.log(cart.checkout(100)); // 100

cart.setStrategy(new BlackFridayPricing());
console.log(cart.checkout(100)); // 50
```

**When to use:** Payment methods, sorting/compression algorithms, validation rules, pricing tiers — anything with multiple interchangeable implementations.

**Trade-offs:** Similar structurally to State — the distinction is intent: Strategy is chosen explicitly by the client, State transitions happen internally based on the object's own logic.

---

### 22. Template Method

**Problem:** Several classes follow the same overall algorithm, but a few steps differ between them — duplicating the whole algorithm in each subclass is wasteful and error-prone.

**Solution:** Define the algorithm's skeleton in a base class method, deferring specific steps to abstract methods that subclasses override.

```typescript
abstract class DataProcessor {
  // Template method — defines the fixed skeleton, marked `final` conceptually (don't override this one)
  process() {
    this.loadData();
    this.transform();
    this.saveData();
  }

  protected loadData() { console.log("Loading data from source..."); }
  protected abstract transform(): void; // subclasses must implement this step
  protected saveData() { console.log("Saving processed data."); }
}

class CSVProcessor extends DataProcessor {
  protected transform() { console.log("Transforming CSV rows..."); }
}

class JSONProcessor extends DataProcessor {
  protected transform() { console.log("Transforming JSON objects..."); }
}

new CSVProcessor().process();
// Loading data from source...
// Transforming CSV rows...
// Saving processed data.
```

**When to use:** Data processing pipelines, test setup/teardown frameworks, report generation — anywhere multiple classes share a fixed process with a few varying steps.

**Trade-offs:** Uses inheritance, which is more rigid than composition-based alternatives (like Strategy) — subclasses are locked into the base class's overall structure.

---

### 23. Visitor

**Problem:** You need to add new operations to a set of classes without modifying those classes — especially useful when the class hierarchy is stable but the operations performed on it change often.

**Solution:** Move the operation into a separate "visitor" object; each element accepts a visitor and calls back into it (double dispatch), letting the visitor decide behavior per concrete type.

```typescript
interface Visitor {
  visitCircle(circle: Circle): void;
  visitSquare(square: Square): void;
}

interface Shape {
  accept(visitor: Visitor): void;
}

class Circle implements Shape {
  constructor(public radius: number) {}
  accept(visitor: Visitor) { visitor.visitCircle(this); }
}

class Square implements Shape {
  constructor(public side: number) {}
  accept(visitor: Visitor) { visitor.visitSquare(this); }
}

// New operation added WITHOUT touching Circle/Square
class AreaCalculator implements Visitor {
  totalArea = 0;
  visitCircle(circle: Circle) { this.totalArea += Math.PI * circle.radius ** 2; }
  visitSquare(square: Square) { this.totalArea += square.side ** 2; }
}

const shapes: Shape[] = [new Circle(3), new Square(4)];
const calculator = new AreaCalculator();
shapes.forEach(shape => shape.accept(calculator));

console.log(calculator.totalArea.toFixed(2)); // 44.27
```

**When to use:** Compilers/ASTs (one visitor per pass: type-checking, code-gen), rendering different export formats over a stable document model.

**Trade-offs:** Adding a new *shape* (element type) requires updating every visitor — the opposite trade-off from adding a new operation, which is exactly why Visitor is best when the element hierarchy is stable but operations change often.

---

## Quick Reference: Which Pattern Do I Need?

| If you need to... | Use |
|---|---|
| Guarantee only one instance exists | **Singleton** |
| Let subclasses decide which class to instantiate | **Factory Method** |
| Create families of related objects consistently | **Abstract Factory** |
| Construct a complex object step-by-step | **Builder** |
| Copy an existing object instead of building new | **Prototype** |
| Make incompatible interfaces work together | **Adapter** |
| Let an abstraction and its implementation vary independently | **Bridge** |
| Treat individual objects and groups uniformly (trees) | **Composite** |
| Add behavior to an object dynamically | **Decorator** |
| Simplify a complex subsystem's interface | **Facade** |
| Save memory by sharing common object state | **Flyweight** |
| Control or defer access to an object | **Proxy** |
| Pass a request along a chain of handlers | **Chain of Responsibility** |
| Turn a request into an object (undo, queue, log) | **Command** |
| Evaluate sentences in a small custom language | **Interpreter** |
| Traverse a collection without exposing its structure | **Iterator** |
| Centralize communication between many objects | **Mediator** |
| Capture/restore an object's state (undo) | **Memento** |
| Notify many objects when one object changes | **Observer** |
| Change behavior based on internal state | **State** |
| Swap interchangeable algorithms at runtime | **Strategy** |
| Share an algorithm's skeleton, vary a few steps | **Template Method** |
| Add new operations without touching existing classes | **Visitor** |

> **Golden rule:** don't reach for a pattern because you know its name — reach for it because you recognize its problem. Most real code needs only a handful of these; forcing a pattern where a plain function would do adds complexity without benefit.
