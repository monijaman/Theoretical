// FUNCTIONAL FACTORY PATTERNS
// Pure functions for creating objects without classes
// Benefits: No 'this' context, pure functions, composable, testable

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

// ===========================================
// FUNCTIONAL BUILDER PATTERN
// ===========================================

const createProductBuilder = () => {
    // Builder state (will be immutable)
    let state = {};

    // Chain of builder functions
    const builder = {
        setName: (name) => {
            state = { ...state, name };
            return builder;
        },

        setPrice: (price) => {
            state = { ...state, price };
            return builder;
        },

        setCategory: (category) => {
            state = { ...state, category };
            return builder;
        },

        setBrand: (brand) => {
            state = { ...state, brand };
            return builder;
        },

        setWarranty: (warranty) => {
            state = { ...state, warranty };
            return builder;
        },

        setSize: (size) => {
            state = { ...state, size };
            return builder;
        },

        setColor: (color) => {
            state = { ...state, color };
            return builder;
        },

        setAuthor: (author) => {
            state = { ...state, author };
            return builder;
        },

        setPages: (pages) => {
            state = { ...state, pages };
            return builder;
        },

        build: () => {
            const { category, ...options } = state;

            switch (category) {
                case 'electronics':
                    return createElectronicsProduct(options);
                case 'clothing':
                    return createClothingProduct(options);
                case 'book':
                    return createBookProduct(options);
                default:
                    throw new Error(`Unknown category: ${category}`);
            }
        },

        reset: () => {
            state = {};
            return builder;
        },

        getState: () => ({ ...state }) // Return copy of current state
    };

    return builder;
};

// ===========================================
// FUNCTIONAL PROTOTYPE PATTERN
// ===========================================

const createPrototypeManager = () => {
    // Prototype registry (closure)
    const prototypes = new Map();

    // Initialize with default prototypes
    prototypes.set('laptop', createElectronicsProduct({
        name: 'Laptop Template',
        price: 999.99,
        brand: 'TechCorp',
        warranty: '2 years'
    }));

    prototypes.set('shirt', createClothingProduct({
        name: 'Shirt Template',
        price: 29.99,
        size: 'M',
        color: 'Blue'
    }));

    prototypes.set('book', createBookProduct({
        name: 'Book Template',
        price: 19.99,
        author: 'Author',
        pages: 300
    }));

    return {
        // Clone prototype with customizations (pure function)
        clone: (prototypeKey, customizations = {}) => {
            const prototype = prototypes.get(prototypeKey);
            if (!prototype) {
                throw new Error(`Prototype '${prototypeKey}' not found`);
            }

            // Create new object with prototype properties and customizations
            const cloned = {
                ...prototype,
                ...customizations,
                id: Math.random().toString(36).substr(2, 9), // New ID
                createdAt: new Date().toISOString() // New timestamp
            };

            console.log(`[PROTOTYPE] Cloned ${prototypeKey} with customizations`);
            return cloned;
        },

        // Add new prototype
        addPrototype: (key, prototype) => {
            prototypes.set(key, prototype);
        },

        // List available prototypes
        listPrototypes: () => Array.from(prototypes.keys()),

        // Get prototype (without cloning)
        getPrototype: (key) => prototypes.get(key)
    };
};

// Export all factory functions
module.exports = {
    createProductFactory,
    createUserFactory,
    createProductBuilder,
    createPrototypeManager,
    // Individual creators for direct use
    createElectronicsProduct,
    createClothingProduct,
    createBookProduct,
    createCustomer,
    createAdmin,
    createGuest
};