// User entity: pure function for creating and validating a user
function createUserEntity({ id, name, email }) {
    if (!name || !email) throw new Error('Name and email are required');
    // Add more validation as needed
    return Object.freeze({ id, name, email });
}

module.exports = { createUserEntity };
