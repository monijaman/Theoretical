# SOLID Principles - S: Single Responsibility Principle

The **Single Responsibility Principle (SRP)** is the first principle in SOLID, which emphasizes designing classes, modules, or functions with a single responsibility or purpose.

---

## What is SRP?

The **Single Responsibility Principle** states:

**"A class should have only one reason to change."**

This means that a class or function should focus on a single task or responsibility. If a class has multiple responsibilities, changes in one part can inadvertently affect the other, leading to tightly coupled code.

---

## Benefits of SRP

1. **Improved Maintainability**  
   By limiting a class to a single responsibility, it becomes easier to understand, test, and modify.

2. **Reduced Coupling**  
   Classes with distinct responsibilities are less likely to depend on one another unnecessarily.

3. **Enhanced Reusability**  
   Focused classes or functions are easier to reuse in different parts of an application.

4. **Better Collaboration**  
   Developers can work on separate responsibilities without stepping on each other’s toes.

---

## Examples

### Example of Violating SRP

```typescript
class ReportManager {
  generateReport(data: string): string {
    // Logic to generate a report
    return `Report: ${data}`;
  }

  saveToFile(report: string): void {
    // Logic to save the report to a file
    console.log(`Saving report to file: ${report}`);
  }

  sendByEmail(report: string, email: string): void {
    // Logic to send the report via email
    console.log(`Sending report to ${email}: ${report}`);
  }
}
```

### Why it violates SRP:

The ReportManager class has multiple responsibilities:

- Generating a report.
- Saving it to a file.
- Sending it via email.
- Any change to one responsibility might impact the others.

## Refactored Example Following SRP

```typescript
class ReportGenerator {
  generate(data: string): string {
    // Logic to generate a report
    return `Report: ${data}`;
  }
}

class FileManager {
  saveToFile(content: string): void {
    // Logic to save content to a file
    console.log(`Saving content to file: ${content}`);
  }
}

class EmailSender {
  sendEmail(content: string, email: string): void {
    // Logic to send content via email
    console.log(`Sending content to ${email}: ${content}`);
  }
}

// Usage
const generator = new ReportGenerator();
const fileManager = new FileManager();
const emailSender = new EmailSender();

const report = generator.generate("Sales Data");
fileManager.saveToFile(report);
emailSender.sendEmail(report, "example@example.com");
```

---

## SOLID Principles - O: Open-Closed Principle

The **Open-Closed Principle (OCP)** is the second principle in SOLID, emphasizing extensibility in software design.

---

## What is OCP?

The **Open-Closed Principle** states:

**"Software entities (classes, modules, functions, etc.) should be open for extension, but closed for modification."**

This principle ensures that new functionality can be added to existing code without altering it, thereby reducing the risk of introducing bugs and preserving system stability.

---

## Benefits of OCP

1. **Easier Maintenance**  
   Changes can be introduced by adding new code instead of modifying existing code.

2. **Better Scalability**  
   New features can be added without disrupting existing functionality.

3. **Reduced Risk**  
   Avoids unintentional side effects caused by altering established code.

---

## Examples

### Bad Example (Violating OCP)

```typescript
class Invoice {
  calculateTotal(invoiceType: string, amount: number): number {
    if (invoiceType === "regular") {
      return amount;
    } else if (invoiceType === "discounted") {
      return amount * 0.9;
    } else if (invoiceType === "premium") {
      return amount * 1.2;
    } else {
      throw new Error("Unknown invoice type");
    }
  }
}
```

#### Why this violates OCP:

- Adding a new invoiceType requires modifying the calculateTotal method.
- This increases the likelihood of introducing bugs and impacts the stability of existing functionality.

### Good Example (Following OCP)

```typescript
interface InvoiceType {
  calculate(amount: number): number;
}

class RegularInvoice implements InvoiceType {
  calculate(amount: number): number {
    return amount;
  }
}

class DiscountedInvoice implements InvoiceType {
  calculate(amount: number): number {
    return amount * 0.9;
  }
}

class PremiumInvoice implements InvoiceType {
  calculate(amount: number): number {
    return amount * 1.2;
  }
}

class InvoiceProcessor {
  process(invoice: InvoiceType, amount: number): number {
    return invoice.calculate(amount);
  }
}

// Usage
const processor = new InvoiceProcessor();

const regular = new RegularInvoice();
console.log(processor.process(regular, 100)); // Output: 100

const discounted = new DiscountedInvoice();
console.log(processor.process(discounted, 100)); // Output: 90

const premium = new PremiumInvoice();
console.log(processor.process(premium, 100)); // Output: 120
```

### Why this follows OCP:

- New invoice types can be introduced by creating additional classes that implement the InvoiceType interface.
- The existing code (e.g., InvoiceProcessor) remains unchanged, ensuring stability.

### Key Points to Remember

- Favor Polymorphism
  Use interfaces, abstract classes, or composition to extend functionality without modifying existing code.

- Avoid Conditionals
  Replace long if-else or switch statements with extensible designs like polymorphism or the strategy pattern.

- Balance Design
  Avoid overengineering for OCP. Apply it judiciously where future extension is likely.

---

## SOLID Principles - R: Liskov Substitution Principle

The **Liskov Substitution Principle (LSP)** is the third principle in SOLID, ensuring that derived classes can be used interchangeably with their base classes without breaking the application.

---

### What is LSP?

The **Liskov Substitution Principle** states:

**"Objects of a superclass should be replaceable with objects of its subclasses without altering the correctness of the program."**

This means that a subclass should only extend the functionality of a parent class and not override or break its behavior.

---

## Benefits of LSP

1. **Polymorphic Behavior**  
   Ensures that the system can leverage inheritance effectively without introducing inconsistencies.

2. **Code Reusability**  
   Promotes the reuse of base class functionality without the risk of breaking the application.

3. **Stable Interfaces**  
   Ensures that subclass implementations adhere to the contract defined by the base class.

---

## Examples

### Bad Example (Violating LSP)

```typescript
class Bird {
  fly(): string {
    return "I can fly!";
  }
}

class Penguin extends Bird {
  fly(): string {
    throw new Error("Penguins can't fly!");
  }
}

function makeBirdFly(bird: Bird) {
  console.log(bird.fly());
}

const sparrow = new Bird();
const penguin = new Penguin();

makeBirdFly(sparrow); // Output: "I can fly!"
makeBirdFly(penguin); // Error: Penguins can't fly!
```

### Why this violates LSP:

- The Penguin class does not adhere to the contract of the Bird class (i.e., the ability to fly).
- Substituting Penguin for Bird breaks the program's expected behavior.

### Good Example (Following LSP)

```typescript
abstract class Bird {
  abstract move(): string;
}

class FlyingBird extends Bird {
  move(): string {
    return "I can fly!";
  }
}

class NonFlyingBird extends Bird {
  move(): string {
    return "I can walk!";
  }
}

function makeBirdMove(bird: Bird) {
  console.log(bird.move());
}

const sparrow = new FlyingBird();
const penguin = new NonFlyingBird();

makeBirdMove(sparrow); // Output: "I can fly!"
makeBirdMove(penguin); // Output: "I can walk!"
```

Why this follows LSP:

- The behavior of Bird subclasses (FlyingBird and NonFlyingBird) is consistent with their design.
- Substituting FlyingBird or NonFlyingBird for Bird works as expected without breaking functionality.

---

# SOLID Principles - I: Interface Segregation Principle

The **Interface Segregation Principle (ISP)** is the fourth principle in SOLID, emphasizing that interfaces should be small and specific, catering to the exact needs of their clients.

---

## What is ISP?

The **Interface Segregation Principle** states:

**"A client should not be forced to depend on interfaces it does not use."**

This principle aims to avoid large, unwieldy interfaces that require clients to implement methods they do not need, promoting a more focused and modular design.

---

## Benefits of ISP

1. **Focused Interfaces**  
   Interfaces are specific to the client's needs, reducing unnecessary complexity.

2. **Ease of Implementation**  
   Classes are only required to implement methods relevant to their functionality.

3. **Improved Flexibility**  
   Changes in one interface do not affect unrelated classes.

## Examples

### Bad Example (Violating ISP)

```typescript
interface Worker {
  work(): void;
  attendMeetings(): void;
  manageTeam(): void;
}

class Developer implements Worker {
  work(): void {
    console.log("Writing code");
  }

  attendMeetings(): void {
    console.log("Attending meetings");
  }

  manageTeam(): void {
    throw new Error("Developers don't manage teams!");
  }
}

class Manager implements Worker {
  work(): void {
    console.log("Supervising work");
  }

  attendMeetings(): void {
    console.log("Leading meetings");
  }

  manageTeam(): void {
    console.log("Managing the team");
  }
}
```

## Good Example (Following ISP)

```typescript
interface Workable {
  work(): void;
}

interface MeetingParticipant {
  attendMeetings(): void;
}

interface TeamManager {
  manageTeam(): void;
}

class Developer implements Workable, MeetingParticipant {
  work(): void {
    console.log("Writing code");
  }

  attendMeetings(): void {
    console.log("Attending meetings");
  }
}

class Manager implements Workable, MeetingParticipant, TeamManager {
  work(): void {
    console.log("Supervising work");
  }

  attendMeetings(): void {
    console.log("Leading meetings");
  }

  manageTeam(): void {
    console.log("Managing the team");
  }
}
```

Why this violates ISP:

- The Developer class is forced to implement manageTeam(), which it does not need.
- This creates unnecessary dependencies and potential for misuse.

### SOLID Principles - D: Dependency Inversion Principle

The **Dependency Inversion Principle (DIP)** is the fifth principle in SOLID, focusing on reducing the coupling between high-level modules and low-level modules by relying on abstractions.

---

## What is DIP?

The **Dependency Inversion Principle** states:

**"High-level modules should not depend on low-level modules. Both should depend on abstractions. Abstractions should not depend on details. Details should depend on abstractions."**

This principle ensures that high-level business logic is not tightly coupled to low-level implementation details, promoting flexibility and scalability.

---

## Benefits of DIP

1. **Reduced Coupling**
   High-level modules remain independent of changes in low-level implementations.

2. **Improved Testability**
   Using abstractions makes it easier to test high-level modules by substituting dependencies with mock implementations.

3. **Scalability**
   New low-level modules can be added without affecting high-level modules.

---

## Examples

### Bad Example (Violating DIP)

```typescript
class Keyboard {
  connect(): string {
    return "Keyboard connected";
  }
}

class Monitor {
  connect(): string {
    return "Monitor connected";
  }
}

class Computer {
  private keyboard: Keyboard;
  private monitor: Monitor;

  constructor() {
    this.keyboard = new Keyboard();
    this.monitor = new Monitor();
  }

  start(): void {
    console.log(this.keyboard.connect());
    console.log(this.monitor.connect());
  }
}

const computer = new Computer();
computer.start();
```

Why this violates ISP:

- The Developer class is forced to implement manageTeam(), which it does not need.
- This creates unnecessary dependencies and potential for misuse.

### Good Example (Following DIP)

```typescript
interface Device {
  connect(): string;
}

class Keyboard implements Device {
  connect(): string {
    return "Keyboard connected";
  }
}

class Monitor implements Device {
  connect(): string {
    return "Monitor connected";
  }
}

class Computer {
  private devices: Device[];

  constructor(devices: Device[]) {
    this.devices = devices;
  }

  start(): void {
    this.devices.forEach((device) => console.log(device.connect()));
  }
}

// Usage
const keyboard = new Keyboard();
const monitor = new Monitor();
const computer = new Computer([keyboard, monitor]);
computer.start();
```

Why this follows DIP:

- The Computer class depends on the Device abstraction instead of concrete implementations.
- New devices can be added or replaced without modifying the Computer class.
