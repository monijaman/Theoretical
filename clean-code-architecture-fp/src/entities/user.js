// User entity: pure function for creating and validating a user
// In clean architecture, an "entity" represents a core business 
// object with its own rules and invariants.
// This function encapsulates the creation and validation logic
//  for a User, ensuring all user objects are valid and consistent.
// Entities are independent of frameworks and external concerns, 
// focusing only on business rules and data integrity.
function createUserEntity({ id, name, email }) {
    if (!name || !email) throw new Error('Name and email are required');
    // Add more validation as needed
    return Object.freeze({ id, name, email });
}

module.exports = { createUserEntity };
