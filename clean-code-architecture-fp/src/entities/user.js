// User entity: pure function for creating and validating a user
function isValidEmail(email) {
    // Simple email regex for demonstration
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function createUserEntity({ id, name, email }) {
    if (!name || typeof name !== 'string' || name.length < 2) {
        throw new Error('Name is required and must be at least 2 characters');
    }
    if (!email || !isValidEmail(email)) {
        throw new Error('A valid email is required');
    }
    // Add more domain logic or methods as needed
    return Object.freeze({ id, name, email });
}

module.exports = { createUserEntity };
