// FUNCTIONAL FACTORY PATTERNS
// ===========================================
// WHAT IT IS:
// The Factory pattern provides an interface for creating objects without specifying
// their exact classes. It encapsulates object creation logic and provides a way to
// create families of related objects.
//
// WHAT IT'S DOING IN THIS APP:
// - Creates different types of products (electronics, clothing, books) using dedicated factory functions
// - Creates different types of users (customers, admins, guests) with specific properties and methods
// - Encapsulates the complex object creation logic in pure functions
// - Provides consistent interfaces for creating related object families
// - Returns objects with methods and properties specific to their type
//
// FUNCTIONAL APPROACH BENEFITS:
// - Pure functions for creating objects without classes
// - No 'this' context - just functions returning objects with methods
// - Composable and testable factory functions
// - Immutable object creation with consistent interfaces
// - Easy to extend with new product types without changing existing code
// ===========================================

// ===========================================
// PRODUCT CREATION FUNCTIONS
// ===========================================

// Pure function to create base product
const createProduct = (name, price, category) => ({
    id: Math.random().toString(36).substr(2, 9),
    name,
    price,
    category,
    createdAt: new Date().toISOString(),
    getInfo: function () { return `${this.name} - $${this.price}`; },
    getPrice: function () { return this.price; }
});

// Electronics product creator (pure function)
const createElectronicsProduct = ({ name, price, brand, warranty }) => ({
    ...createProduct(name, price, 'electronics'),
    brand,
    warranty,
    getInfo: function () {
        return `${this.name} by ${this.brand} - $${this.price} (${this.warranty} warranty)`;
    },
    extendWarranty: (months) => ({
        ...this,
        warranty: `${parseInt(this.warranty) + months} years`
    })
});

// Clothing product creator (pure function)
const createClothingProduct = ({ name, price, size, color }) => ({
    ...createProduct(name, price, 'clothing'),
    size,
    color,
    getInfo: function () {
        return `${this.name} (${this.size}, ${this.color}) - $${this.price}`;
    },
    changeSize: (newSize) => ({
        ...this,
        size: newSize
    })
});

// Book product creator (pure function)
const createBookProduct = ({ name, price, author, pages }) => ({
    ...createProduct(name, price, 'book'),
    author,
    pages,
    getInfo: function () {
        return `"${this.name}" by ${this.author} - $${this.price} (${this.pages} pages)`;
    },
    getReadingTime: function () {
        return Math.ceil(this.pages / 250);
    }
});

// ===========================================
// FUNCTIONAL FACTORY - Higher-Order Function
// ===========================================

const createProductFactory = () => {
    // Private creators map (closure)
    const creators = new Map([
        ['electronics', createElectronicsProduct],
        ['clothing', createClothingProduct],
        ['book', createBookProduct]
    ]);

    // Return factory interface
    return {
        // Generic create method
        create: (type, options) => {
            const creator = creators.get(type);
            if (!creator) {
                throw new Error(`Unknown product type: ${type}`);
            }
            return creator(options);
        },

        // Specific creation methods
        createElectronics: (options) => createElectronicsProduct(options),
        createClothing: (options) => createClothingProduct(options),
        createBook: (options) => createBookProduct(options),

        // Register new creator
        registerCreator: (type, creator) => {
            creators.set(type, creator);
            console.log(`[FACTORY] Registered creator: ${type}`);
        },

        // Get available types
        getTypes: () => Array.from(creators.keys()),

        // Batch create products
        createBatch: (productSpecs) => {
            return productSpecs.map(({ type, options }) => {
                return creators.get(type)(options);
            });
        }
    };
};

// ===========================================
// USER CREATION FUNCTIONS
// ===========================================

// Base user creator (pure function)
const createUser = (name, email, type) => ({
    id: Math.random().toString(36).substr(2, 9),
    name,
    email,
    type,
    createdAt: new Date().toISOString(),
    getInfo: function () { return `${this.name} (${this.email})`; }
});

// Customer creator (pure function)
const createCustomer = ({ name, email }) => ({
    ...createUser(name, email, 'customer'),
    orderHistory: [],
    loyaltyPoints: 0,
    getInfo: function () {
        return `Customer: ${this.name} (${this.email}) - ${this.loyaltyPoints} points`;
    },
    addOrder: function (order) {
        return {
            ...this,
            orderHistory: [...this.orderHistory, order],
            loyaltyPoints: this.loyaltyPoints + Math.floor(order.total / 10)
        };
    }
});

// Admin creator (pure function)
const createAdmin = ({ name, email }) => ({
    ...createUser(name, email, 'admin'),
    permissions: ['read', 'write', 'delete', 'manage_users'],
    getInfo: function () {
        return `Admin: ${this.name} (${this.email}) - ${this.permissions.length} permissions`;
    },
    addPermission: function (permission) {
        if (this.permissions.includes(permission)) {
            return this;
        }
        return {
            ...this,
            permissions: [...this.permissions, permission]
        };
    }
});

// Guest creator (pure function)
const createGuest = () => ({
    ...createUser('Guest User', 'guest@temp.com', 'guest'),
    sessionId: Math.random().toString(36).substr(2, 16),
    getInfo: function () {
        return `Guest User (Session: ${this.sessionId})`;
    }
});

// ===========================================
// FUNCTIONAL USER FACTORY
// ===========================================

const createUserFactory = () => {
    // Private creators map
    const creators = new Map([
        ['customer', createCustomer],
        ['admin', createAdmin],
        ['guest', createGuest]
    ]);

    return {
        // Generic create method
        create: (type, options = {}) => {
            const creator = creators.get(type);
            if (!creator) {
                throw new Error(`Unknown user type: ${type}`);
            }
            return creator(options);
        },

        // Specific creation methods
        createCustomer: (options) => createCustomer(options),
        createAdmin: (options) => createAdmin(options),
        createGuest: () => createGuest(),

        // Get available types
        getTypes: () => Array.from(creators.keys()),

        // Batch create users
        createBatch: (userSpecs) => {
            return userSpecs.map(({ type, options }) => {
                return creators.get(type)(options);
            });
        }
    };
};

// Export all factory functions
module.exports = {
    createProductFactory,
    createUserFactory,
    // Individual creators for direct use
    createElectronicsProduct,
    createClothingProduct,
    createBookProduct,
    createCustomer,
    createAdmin,
    createGuest
};