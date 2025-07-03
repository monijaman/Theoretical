// Use case: create user (pure function, no side effects)
// Dependencies are injected as arguments
function createUser({ userRepository, createUserEntity }) {
    return async function({ name, email }) {
        if (await userRepository.getUserByEmail(email)) {
            throw new Error('User already exists');
        }
        const user = createUserEntity({ id: Date.now(), name, email });
        return userRepository.saveUser(user);
    };
}

module.exports = { createUser };
