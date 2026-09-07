# Functional Design Patterns Demo Application

A comprehensive JavaScript application demonstrating design patterns using **Functional Programming** principles instead of Object-Oriented Programming.

## 🎯 **Functional vs OOP Approach**

### **Key Differences:**

- **Pure Functions** instead of classes and methods
- **Immutable Data** instead of mutable objects
- **Function Composition** instead of inheritance
- **Higher-Order Functions** instead of interfaces
- **Closures** for encapsulation instead of private members

## 🏗️ **Architecture Overview**

```
src/
├── patterns/
│   ├── creational/      # Factory functions, builders, singletons
│   ├── structural/      # Decorators, proxies using functions
│   └── behavioral/      # Observers, strategies, commands as functions
├── utils/               # Utility functions and helpers
└── main.js             # Application entry point
```

## 🎨 **Patterns Implemented (Functional Style):**

### **Creational Patterns:**

- ✅ **Factory Functions** - Pure functions that create objects
- ✅ **Builder Functions** - Chainable function composition
- ✅ **Singleton Functions** - Module pattern with closures
- ✅ **Prototype Functions** - Object cloning with spread/assign

### **Structural Patterns:**

- ✅ **Decorator Functions** - Higher-order functions
- ✅ **Proxy Functions** - Function wrappers for access control

### **Behavioral Patterns:**

- ✅ **Observer Functions** - Event emitters with closures
- ✅ **Strategy Functions** - Strategy selection with maps
- ✅ **Command Functions** - Command objects with undo/redo

## 🚀 **Functional Programming Benefits:**

- **Predictability** - Pure functions with no side effects
- **Testability** - Easy to test pure functions
- **Composability** - Functions can be easily combined
- **Immutability** - No unexpected mutations
- **Concurrency** - Safe for parallel execution

## 📚 **Learning Objectives:**

- Understand how to implement patterns functionally
- Learn functional programming principles
- See the benefits of immutable data structures
- Master function composition and higher-order functions
- Compare functional vs object-oriented approaches
