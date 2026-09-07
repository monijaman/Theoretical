// Use case: create user (pure function, no side effects)
// This demonstrates CLOSURE-BASED DEPENDENCY INJECTION

// CLOSURE EXPLANATION:
// This function returns another function that "closes over" the injected dependencies
// The inner function has access to userRepository and createUserEntity even after
// the outer function has finished executing - this is a closure!

function createUser({ userRepository, createUserEntity }) {
    // OUTER FUNCTION: Receives dependencies and stores them in closure scope
    // userRepository and createUserEntity are now "captured" in the closure

    return async function ({ name, email, birthYear }) {
        // INNER FUNCTION: Uses the captured dependencies from closure scope
        // This function "remembers" userRepository and createUserEntity

        // STEP 5: Use case checks if user already exists (business rule)
        if (await userRepository.getUserByEmail(email)) {
            throw new Error('User already exists');
        }

        // STEP 6: Use case calls createUserEntity() to validate and create domain object
        const user = createUserEntity({ id: Date.now(), name, email, birthYear });

        // STEP 7: Use case calls userRepository.saveUser() to persist the entity
        // STEP 8: Use case returns the saved user or throws business errors
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
