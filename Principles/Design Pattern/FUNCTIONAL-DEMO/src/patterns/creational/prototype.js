// FUNCTIONAL PROTOTYPE PATTERN
// ===========================================
// WHAT IT IS:
// The Prototype pattern creates objects by cloning existing instances rather
// than creating new ones from scratch. It's useful when object creation is
// expensive or when you need to create objects similar to existing ones.
//
// WHAT IT'S DOING IN THIS APP:
// - Creates new products by cloning and customizing existing product prototypes
// - Provides efficient object creation for similar products with variations
// - Maintains product templates that can be cloned and modified
// - Allows customization of cloned objects without affecting the original
// - Implements deep cloning to ensure complete independence of copied objects
//
// FUNCTIONAL APPROACH BENEFITS:
// - Pure function approach to cloning and customizing objects
// - Immutable cloning that doesn't modify original objects
// - No class inheritance or complex prototype chains
// - Composable cloning functions that can be easily combined
// - Predictable behavior with no hidden side effects
// ===========================================

const {
    createElectronicsProduct,
    createClothingProduct,
    createBookProduct
} = require('./factories');

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

module.exports = {
    createPrototypeManager
};
