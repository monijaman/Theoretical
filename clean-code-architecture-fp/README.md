# Clean Code Architecture in JavaScript (Functional Approach)

This project demonstrates a simple Clean Code Architecture using JavaScript and a functional programming style. The goal is to separate concerns, improve testability, and keep code maintainable and scalable.

## What is Clean Code Architecture?

Clean Code Architecture (inspired by Clean Architecture, Hexagonal, and Onion Architecture) organizes code into concentric layers with clear boundaries. Each layer has a specific responsibility and communicates with others through well-defined interfaces.

### Key Principles
- **Separation of Concerns:** Each layer has a single responsibility.
- **Dependency Rule:** Dependencies always point inward (outer layers depend on inner layers, never the reverse).
- **Functional Approach:** Use pure functions and avoid shared mutable state where possible.
- **Testability:** Business logic is decoupled from frameworks and infrastructure.

## Project Structure

```
clean-code-architecture-fp/
├── src/
│   ├── entities/           # Pure domain logic (no dependencies)
│   │   └── user.js
│   ├── usecases/           # Application-specific business rules
│   │   └── createUser.js
│   ├── gateways/           # Interfaces to external systems (DB, APIs)
│   │   └── userRepository.js
│   ├── delivery/           # Input/output (e.g., controllers, API)
│   │   └── userController.js
│   └── index.js            # Entry point (composition root)
└── README.md               # This documentation
```

## Layer Descriptions

- **Entities:** Pure business/domain logic. No dependencies on other layers.
- **Use Cases:** Application logic. Orchestrates entities and calls gateways. Pure functions, no side effects.
- **Gateways:** Interfaces to infrastructure (e.g., database, network). Implemented as pure functions or adapters.
- **Delivery:** Handles input/output (e.g., HTTP, CLI). Calls use cases, formats responses.

## Example: User Registration

- `entities/user.js`: Defines the User entity and validation logic.
- `usecases/createUser.js`: Implements the user creation use case.
- `gateways/userRepository.js`: Abstracts data storage (in-memory for demo).
- `delivery/userController.js`: Handles user registration requests.
- `index.js`: Wires everything together.

## Functional Programming Notes
- Use pure functions for business logic.
- Pass dependencies as arguments (dependency injection).
- Avoid shared mutable state.

---

## Running the Example

1. Clone or copy this folder.
2. Run `node src/index.js` to see the user registration flow in action.

---

## References
- [Clean Architecture by Uncle Bob](https://8thlight.com/blog/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Functional Programming in JavaScript](https://eloquentjavascript.net/)
