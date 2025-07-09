// Entry point: wire up dependencies and simulate a request
const { createUserEntity } = require('./entities/user');
const userRepository = require('./gateways/userRepository');
const { createUser } = require('./usecases/createUser');
const { userController } = require('./delivery/userController');

// Compose use case with injected dependencies
const createUserUseCase = createUser({ userRepository, createUserEntity });
const registerUser = userController({ createUserUseCase });

// Simulate a registration request
(async () => {
    const req = { name: 'Alice', email: 'alice@example.com' };
    const res = await registerUser(req);
    console.log('Response:', res);

    // Try duplicate
    const res2 = await registerUser(req);
    console.log('Duplicate Response:', res2);
})();
