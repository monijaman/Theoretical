// Use case: create user (pure function, no side effects)
// This demonstrates CLOSURE-BASED DEPENDENCY INJECTION

// CLOSURE EXPLANATION:
// This function returns another function that "closes over" the injected dependencies
// The inner function has access to userRepository and createUserEntity even after
// the outer function has finished executing - this is a closure!

function createUser({ userRepository, createUserEntity }) {
    // OUTER FUNCTION: Receives dependencies and stores them in closure scope
    // userRepository and createUserEntity are now "captured" in the closure

    return async function ({ name, email }) {
        // INNER FUNCTION: Uses the captured dependencies from closure scope
        // This function "remembers" userRepository and createUserEntity

        // Business Logic: Check if user already exists
        if (await userRepository.getUserByEmail(email)) {
            throw new Error('User already exists');
        }

        // Business Logic: Create domain entity using captured dependency
        const user = createUserEntity({ id: Date.now(), name, email });

        // Business Logic: Save user using captured dependency
        return userRepository.saveUser(user);
    };
}

// WHY CLOSURE FOR DEPENDENCY INJECTION?
// 1. The inner function has access to injected dependencies
// 2. Dependencies are "baked in" when we call createUser()
// 3. The returned function is pure - same inputs always give same outputs
// 4. Easy to test - just inject mock dependencies
// 5. No global state or imports needed in the use case

module.exports = { createUser };
