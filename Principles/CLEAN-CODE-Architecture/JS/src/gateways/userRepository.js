// User Repository: handles database persistence (infrastructure concern)
// FUNCTIONAL APPROACH - using pure functions instead of classes

// EXAMPLE: Database User Model (this would be in repository/infrastructure layer)
// This is what the database table might look like:
/*
DATABASE TABLE: users
- user_id (primary key, auto-increment)
- full_name (varchar)
- email_address (varchar, unique)
- birth_year (integer)
- created_at (timestamp)
- updated_at (timestamp)
- is_active (boolean)
- password_hash (varchar)
*/

// FUNCTIONAL DATABASE MODEL - Pure functions instead of classes
/**
 * * UserDbModel provides pure functions to map between database models and domain entities
 */
const UserDbModel = {
    // MAPPING: Database Model → Domain Entity (Pure Function)
    toDomainEntity(dbUser) {
        const { createUserEntity } = require('../entities/user');
        return createUserEntity({
            id: dbUser.user_id,           // Map DB field to domain concept
            name: dbUser.full_name,       // Map DB field to domain concept
            email: dbUser.email_address,  // Map DB field to domain concept
            birthYear: dbUser.birth_year  // Map DB field to domain concept
            // Note: we DON'T expose DB fields like created_at, password_hash to domain
        });
    },

    // MAPPING: Domain Entity → Database Model (Pure Function)
    fromDomainEntity(domainUser) {
        return {
            user_id: domainUser.id,
            full_name: domainUser.name,
            email_address: domainUser.email,
            birth_year: domainUser.birthYear,
            created_at: new Date(),     // DB concern
            updated_at: new Date(),     // DB concern
            is_active: true,            // DB concern
            password_hash: null         // DB concern (handled elsewhere)
        };
    },

    // Additional pure utility functions
    withUpdatedTimestamp(dbUser) {
        return {
            ...dbUser,
            updated_at: new Date()
        };
    },

    withActiveStatus(dbUser, isActive) {
        return {
            ...dbUser,
            is_active: isActive
        };
    }
};

// FUNCTIONAL REPOSITORY IMPLEMENTATION - Pure functions with dependency injection
/**
 * 
 * @param {*} database 
 * @param {*} logger 
 * @param {*} cache 
 * @returns 
 */
function createUserRepository(database, logger, cache) {
    // DEPENDENCIES are injected here and captured in closure
    // This makes the repository testable and configurable

    return {
        async saveUser(domainUser) {
            // STEP 14: Repository uses injected logger to log operations
            logger?.info(`Saving user: ${domainUser.email}`);

            // STEP 12: Repository converts domain entity to database model
            const dbModel = UserDbModel.fromDomainEntity(domainUser);

            try {
                // STEP 13: Repository uses injected database to save
                const savedDbModel = await database.insert('users', dbModel);

                // STEP 15: Repository uses injected cache to cache results
                if (cache) {
                    await cache.set(`user:${domainUser.email}`, savedDbModel);
                }

                logger?.info(`User saved successfully: ${domainUser.email}`);

                // STEP 16: Repository converts database result back to domain entity
                return UserDbModel.toDomainEntity(savedDbModel);
            } catch (error) {
                logger?.error(`Failed to save user: ${error.message}`);
                throw error;
            }
        },

        async getUserByEmail(email) {
            logger?.info(`Fetching user by email: ${email}`);

            // Try cache first (if injected)
            if (cache) {
                const cached = await cache.get(`user:${email}`);
                if (cached) {
                    logger?.info(`User found in cache: ${email}`);
                    return UserDbModel.toDomainEntity(cached);
                }
            }

            // Use injected database dependency
            const dbResult = await database.query(
                'SELECT * FROM users WHERE email_address = ? AND is_active = true',
                [email]
            );

            if (!dbResult) {
                logger?.info(`User not found: ${email}`);
                return null;
            }

            // Cache the result (if cache is available)
            if (cache) {
                await cache.set(`user:${email}`, dbResult);
            }

            logger?.info(`User fetched from database: ${email}`);
            return UserDbModel.toDomainEntity(dbResult);
        },

        async updateUser(domainUser) {
            logger?.info(`Updating user: ${domainUser.email}`);

            const dbModel = UserDbModel.fromDomainEntity(domainUser);
            const updatedDbModel = UserDbModel.withUpdatedTimestamp(dbModel);

            const savedDbModel = await database.update('users', updatedDbModel);

            // Invalidate cache
            if (cache) {
                await cache.delete(`user:${domainUser.email}`);
            }

            return UserDbModel.toDomainEntity(savedDbModel);
        },

        async deactivateUser(domainUser) {
            // FUNCTIONAL COMPOSITION
            const dbModel = UserDbModel.fromDomainEntity(domainUser);
            const deactivatedDbModel = UserDbModel.withActiveStatus(
                UserDbModel.withUpdatedTimestamp(dbModel),
                false
            );

            // Database update logic here...
            return UserDbModel.toDomainEntity(deactivatedDbModel);
        }
    };
}

// BENEFITS OF FACTORY FUNCTION:
// ✅ Dependency Injection - database, logger, cache can be swapped
// ✅ Testability - inject mock dependencies for testing
// ✅ Configuration - different environments get different dependencies
// ✅ Closure - dependencies are captured and available to all methods
// ✅ Pure functions - repository methods use injected dependencies, no globals

// USAGE EXAMPLES (commented out - these would be in your app setup):

// Production usage with real dependencies
// const productionRepository = createUserRepository(
//     require('./database/postgres'),     // Real database
//     require('./logging/winston'),       // Real logger
//     require('./cache/redis')            // Real cache
// );

// Test usage with mock dependencies
// const testRepository = createUserRepository(
//     mockDatabase,                       // Mock database
//     mockLogger,                         // Mock logger
//     null                               // No cache in tests
// );

// Development usage with simple dependencies
// const devRepository = createUserRepository(
//     require('./database/sqlite'),       // SQLite for dev
//     console,                           // Console logging
//     new Map()                          // In-memory cache
// );

// Export the factory function, not a pre-configured instance
module.exports = { createUserRepository };

// FUNCTIONAL BENEFITS:
// ✅ Pure functions - predictable inputs/outputs
// ✅ Immutable transformations - no side effects
// ✅ Composable - functions can be combined easily
// ✅ Testable - easy to unit test pure transformations
// ✅ No hidden state - everything is explicit

// SEPARATION OF CONCERNS (Functional Style):
// ✅ Domain Entity: Pure functions for business logic
// ✅ Database Model: Pure transformation functions
// ✅ Repository: Pure functions for data access with dependency injection
