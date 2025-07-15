// Entry point: wire up dependencies and simulate a request
// This file demonstrates Clean Architecture dependency injection and composition

// Import all layers of Clean Architecture
// Domain Layer: User entity with validation rules, business methods (getAge, canVote, etc.)
const { createUserEntity } = require('./entities/user');

// Interface Layer: Data access abstraction with DB mapping, caching, logging
const { createUserRepository } = require('./gateways/userRepository');

// Use Case Layer: Registration business logic, duplicate checking, entity creation
const { createUser } = require('./usecases/createUser');

// Delivery Layer: HTTP request/response handling, error formatting, status codes
const { userController } = require('./delivery/userController');

//#region STEP 1: Create dependencies (Infrastructure Layer)
// Mock dependencies for demo - in real app, these would be real implementations
const mockDatabase = {
    async insert(table, data) {
        console.log(`DB: Inserting into ${table}:`, data);
        return { ...data, user_id: Date.now() };
    },
    async query(sql, params) {
        console.log(`DB: Querying "${sql}" with params:`, params);
        return null; // Simulate no user found
    },
    async update(table, data) {
        console.log(`DB: Updating ${table}:`, data);
        return data;
    }
};

const mockLogger = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`)
};

const mockCache = new Map(); // Simple in-memory cache


//#region STEP 2: Compose dependencies using factory functions
// Create repository with injected dependencies
const userRepository = createUserRepository(mockDatabase, mockLogger, mockCache);

// Create use case with injected dependencies (closure pattern)
const createUserUseCase = createUser({ userRepository, createUserEntity });

// Create controller with injected use case (closure pattern)
const registerUser = userController({ createUserUseCase });


//#region STEP 3: Simulate HTTP-like requests

(async () => {
    console.log('=== Clean Architecture Demo ===\n');

    // This simulates an HTTP POST request with user data
    const req = { name: 'Alice Johnson', email: 'alice@example.com', birthYear: 1990 };

    // DETAILED FLOW EXPLANATION (Clean Architecture Layers):
    // 
    // 🎯 DELIVERY LAYER (./delivery/userController.js):
    // 1. registerUser(req) - Controller receives HTTP-like request object
    // 2. Controller extracts { name, email, birthYear } from req
    // 3. Controller calls createUserUseCase({ name, email, birthYear })
    // 4. Controller handles errors and formats response
    //
    // 🏢 USE CASE LAYER (./usecases/createUser.js):
    // 5. Use case checks if user already exists (business rule)
    // 6. Use case calls createUserEntity() to validate and create domain object
    // 7. Use case calls userRepository.saveUser() to persist the entity
    // 8. Use case returns the saved user or throws business errors
    //
    // 🏛️ DOMAIN LAYER (./entities/user.js):
    // 9. Entity validates business rules (name length, email format, age)
    // 10. Entity creates immutable user object with domain methods
    // 11. Entity throws domain errors if validation fails
    //
    // 🔌 INTERFACE LAYER (./gateways/userRepository.js):
    // 12. Repository converts domain entity to database model (UserDbModel.fromDomainEntity)
    // 13. Repository uses injected database to save (database.insert method)
    // 14. Repository uses injected logger to log operations (logger.info method)
    // 15. Repository uses injected cache to cache results (cache.set method)
    // 16. Repository converts database result back to domain entity (UserDbModel.toDomainEntity)
    //
    // 🔄 RESULT FLOWS BACK:
    // 17. Repository → Use Case → Controller → Response
    // 18. Each layer adds its own concerns (formatting, logging, error handling)

    console.log('Registering new user...');
    const res = await registerUser(req);
    console.log('Response:', res);

    console.log('\nTrying duplicate registration...');
    const res2 = await registerUser(req);
    console.log('Duplicate Response:', res2);
})();

// WHY FACTORY FUNCTIONS ARE USEFUL:
// ✅ **Different Environments**: Production vs Test vs Development
// ✅ **Testability**: Inject mocks for unit testing
// ✅ **Configuration**: Different databases per environment
// ✅ **Flexibility**: Swap implementations without changing business logic
// ✅ **Dependency Injection**: No hard-coded dependencies

// COMPARISON: Without Factory vs With Factory
// ❌ Without: const userRepository = require('./userRepository'); // Hard-coded
// ✅ With: const userRepository = createUserRepository(db, logger, cache); // Configurable
