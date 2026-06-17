// User entity: pure functions for creating, validating, and operating on user domain objects
// CLEAN ARCHITECTURE PRINCIPLE:
// - Domain entities represent BUSINESS CONCEPTS, not database tables
// - They should be independent of how data is stored
// - Database concerns belong in the infrastructure/repository layer

// DOMAIN VALIDATION FUNCTIONS (Business Rules)
function isValidEmail(email) {
    // Business rule: what constitutes a valid email in our domain
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function isValidName(name) {
    // Business rule: what constitutes a valid name in our domain
    return name && typeof name === 'string' && name.length >= 2 && name.length <= 50;
}

function isAdultUser(birthYear) {
    // Business rule: user must be 18+ years old
    const currentYear = new Date().getFullYear();
    return (currentYear - birthYear) >= 18;
}

// ENTITY CREATION FUNCTION (Domain Logic Only)
function createUserEntity({ id, name, email, birthYear }) {
    // STEP 9: Entity validates business rules (name length, email format, age)
    if (!isValidName(name)) {
        throw new Error('Name is required and must be 2-50 characters');
    }
    if (!isValidEmail(email)) {
        throw new Error('A valid email is required');
    }
    if (birthYear && !isAdultUser(birthYear)) {
        // STEP 11: Entity throws domain errors if validation fails
        throw new Error('User must be 18 years or older');
    }

    // STEP 10: Entity creates immutable user object with domain methods
    const user = {
        // IDENTITY (required for entities)
        id,

        // BUSINESS ATTRIBUTES (what the business cares about)
        name,
        email,
        birthYear,

        // BUSINESS BEHAVIOR (domain methods - what users can DO)
        getDisplayName() {
            return this.name.trim().split(' ').map(part =>
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            ).join(' ');
        },

        getEmailDomain() {
            return this.email.split('@')[1];
        },

        getAge() {
            if (!this.birthYear) return null;
            return new Date().getFullYear() - this.birthYear;
        },

        isEmailFromDomain(domain) {
            return this.getEmailDomain().toLowerCase() === domain.toLowerCase();
        },

        // BUSINESS RULES as methods
        canVote() {
            return this.getAge() >= 18;
        },

        isEligibleForSeniorDiscount() {
            return this.getAge() >= 65;
        }
    };

    // Return frozen object to prevent mutations (immutability)
    return Object.freeze(user);
}

// DOMAIN UTILITY FUNCTIONS (Business Logic)
function compareUsersByName(user1, user2) {
    return user1.name.localeCompare(user2.name);
}

function isSameUser(user1, user2) {
    return user1.id === user2.id;
}

// DATABASE CONCERNS SHOULD BE SEPARATE:
// ❌ DON'T PUT IN ENTITY: createdAt, updatedAt, table_id, foreign_keys
// ❌ DON'T PUT IN ENTITY: Database-specific validation, SQL constraints
// ✅ PUT IN REPOSITORY: Database mapping, persistence logic, queries
// ✅ PUT IN ENTITY: Business rules, domain behavior, validation

module.exports = {
    createUserEntity,
    isValidEmail,
    isValidName,
    isAdultUser,
    compareUsersByName,
    isSameUser
};
