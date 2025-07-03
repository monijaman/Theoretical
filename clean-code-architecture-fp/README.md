# Clean Code Architecture in JavaScript (Functional Approach)

## Why is this Project Clean Code?

This project is designed to embody clean code principles by:

- **Separation of Concerns:** Each file and folder has a single, well-defined responsibility. Business logic, data access, and input/output are all separated.
- **Explicit Dependencies:** All dependencies are injected as arguments, making the code easy to test and reason about. No module imports another layer directly except through explicit composition in the entry point.
- **Pure Functions:** Core logic (entities and use cases) is implemented as pure functions, which are predictable and have no side effects.
- **No Framework Lock-in:** The business logic is decoupled from frameworks and infrastructure, so you can swap out delivery mechanisms (e.g., HTTP, CLI) or data storage (e.g., in-memory, database) without changing the core logic.
- **Readability and Maintainability:** The code is modular, easy to follow, and each part can be understood in isolation.

## How the Layers Work and Depend on Each Other

- **Entities:** Contain only domain logic and validation. They do not depend on any other layer.
- **Use Cases:** Contain application-specific business rules. They depend on entities and receive gateways (e.g., repositories) as arguments. They never import or know about delivery mechanisms.
- **Gateways:** Abstract external systems (like databases). They are passed into use cases as dependencies, so the use cases are not tied to any specific implementation.
- **Delivery:** Handles input/output (e.g., API controllers). They depend on use cases, never the other way around. They format requests and responses but do not contain business logic.
- **Composition Root (index.js):** Wires everything together by injecting dependencies. This is the only place where layers are composed.

**Dependency Direction:**

- All dependencies point inward: delivery → use cases → entities.
- Outer layers depend on inner layers, never the reverse.
- This makes the core logic (entities, use cases) independent and reusable.

---

## Running the Example

1. Clone or copy this folder.
2. Run `node src/index.js` to see the user registration flow in action.

---

## References

- [Clean Architecture by Uncle Bob](https://8thlight.com/blog/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Functional Programming in JavaScript](https://eloquentjavascript.net/)
