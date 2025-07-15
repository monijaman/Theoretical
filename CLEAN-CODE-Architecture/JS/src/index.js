// Entry point: wire up dependencies and simulate a request
// This file demonstrates Clean Architecture dependency injection and composition

// Import all layers of Clean Architecture
const { createUserEntity } = require('./entities/user');        // Domain Layer: Pure business entities
const { createUserRepository } = require('./gateways/userRepository'); // Interface Layer: Repository factory
const { createUser } = require('./usecases/createUser');         // Use Case Layer: Business logic orchestration
const { userController } = require('./delivery/userController'); // Delivery Layer: External interface (HTTP-like)

// STEP 1: Create dependencies (Infrastructure Layer)
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

// STEP 2: Compose dependencies using factory functions
// Create repository with injected dependencies
const userRepository = createUserRepository(mockDatabase, mockLogger, mockCache);

// Create use case with injected dependencies (closure pattern)
const createUserUseCase = createUser({ userRepository, createUserEntity });

// Create controller with injected use case (closure pattern)
const registerUser = userController({ createUserUseCase });

// STEP 3: Simulate HTTP-like requests
(async () => {
    console.log('=== Clean Architecture Demo ===\n');

    // This simulates an HTTP POST request with user data
    const req = { name: 'Alice Johnson', email: 'alice@example.com', birthYear: 1990 };

    // DETAILED FLOW EXPLANATION:
    // 1. registerUser(req) - Controller receives request object
    // 2. Controller extracts data from req
    // 3. Controller calls createUserUseCase with parsed data
    // 4. Use case validates business rules
    // 5. Use case calls createUserEntity to create domain object
    // 6. Use case calls userRepository.saveUser to persist
    // 7. Repository uses injected database to save
    // 8. Repository uses injected logger to log operations
    // 9. Repository uses injected cache to cache results
    // 10. Result flows back through all layers

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
