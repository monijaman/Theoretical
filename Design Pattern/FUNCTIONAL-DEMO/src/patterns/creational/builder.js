// FUNCTIONAL BUILDER PATTERN
// ===========================================
// WHAT IT IS:
// The Builder pattern provides a way to construct complex objects step by step.
// It separates the construction of complex objects from their representation,
// allowing the same construction process to create different representations.
//
// WHAT IT'S DOING IN THIS APP:
// - Creates complex products (electronics, clothing, books) using method chaining
// - Builds products step-by-step with fluent interface (setName().setPrice().build())
// - Validates required fields before creating the final product
// - Provides immutable state management during the building process
// - Allows flexible product creation without requiring all parameters upfront
//
// FUNCTIONAL APPROACH BENEFITS:
// - Pure function approach to building complex objects step by step
// - Immutable state - each setter returns new state without mutating original
// - Fluent interface with method chaining for readable code
// - No classes or 'this' context - just functions and closures
// ===========================================

const {
    createElectronicsProduct,
    createClothingProduct,
    createBookProduct
} = require('./factories');

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

module.exports = {
    createProductBuilder
};
