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

// ===========================================
// 🎯 WHEN TO USE BUILDER vs FACTORY:
// ===========================================
//
// USE FACTORY WHEN:
// ✅ Simple object creation with all parameters known upfront
// ✅ Fast, direct construction needed
// ✅ Objects are straightforward
//
// USE BUILDER WHEN:
// ✅ Complex objects with many optional parameters
// ✅ Step-by-step construction needed (forms, wizards, UI)
// ✅ Conditional building logic
// ✅ Method chaining desired for readability
// ✅ Configuration from multiple sources
// ✅ Validation during construction
//
// EXAMPLE COMPARISON:
// Factory: productFactory.create('electronics', { name: 'Laptop', price: 999, brand: 'Dell' })
// Builder: productBuilder.setName('Laptop').setPrice(999).setBrand('Dell').setCategory('electronics').build()
//
// REAL-WORLD EXAMPLE:
// ❌ Factory with many parameters (hard to read):
// const product = productFactory.create('electronics', {
//     name: 'Gaming PC',
//     price: 2999,
//     brand: 'CustomTech',
//     warranty: '3 years',
//     processor: 'Intel i9',
//     ram: '32GB',
//     storage: '2TB SSD',
//     graphics: 'RTX 4080'
// });
//
// ✅ Builder step-by-step (readable):
// const product = productBuilder
//     .setName('Gaming PC')
//     .setPrice(2999)
//     .setCategory('electronics')
//     .setBrand('CustomTech')
//     .setWarranty('3 years')
//     .setProcessor('Intel i9')
//     .setRAM('32GB')
//     .setStorage('2TB SSD')
//     .setGraphics('RTX 4080')
//     .build();
//
// Builder excels at: SQL queries, HTTP requests, complex forms, configuration objects
// Factory excels at: Simple objects, known parameters, performance-critical creation
// ===========================================

// ===========================================
// 🔍 Alternative Without Factory (Problems):
// ===========================================
//
// This shows why the Builder delegating to Factory is GOOD DESIGN
// vs trying to do everything in the Builder itself
//
// ❌ BAD APPROACH: Builder doing everything (DON'T DO THIS)
//
// const createProductBuilderWithoutFactory = () => {
//     let state = {};
//
//     const builder = {
//         // ... setter methods same as above ...
//
//         build: () => {
//             const { category, name, price, brand, warranty, size, color, author, pages } = state;
//
//             // ❌ PROBLEM 1: MASSIVE DUPLICATION
//             switch (category) {
//                 case 'electronics':
//                     // Builder now has to duplicate ALL electronics logic
//                     const electronicsProduct = {
//                         id: Math.random().toString(36).substr(2, 9),
//                         name,
//                         price,
//                         category: 'electronics',
//                         brand,
//                         warranty,
//                         createdAt: new Date().toISOString(),
//                         // ❌ PROBLEM 2: Duplicate business logic
//                         getInfo: function() {
//                             return `${this.name} by ${this.brand} - $${this.price}`;
//                         },
//                         getPrice: function() {
//                             return this.price;
//                         },
//                         // ❌ PROBLEM 3: Duplicate validation logic
//                         changeWarranty: function(newWarranty) {
//                             return { ...this, warranty: newWarranty };
//                         }
//                     };
//                     // ❌ PROBLEM 4: Duplicate immutability logic
//                     return Object.freeze(electronicsProduct);
//
//                 case 'clothing':
//                     // ❌ PROBLEM 5: MORE DUPLICATION for clothing
//                     const clothingProduct = {
//                         id: Math.random().toString(36).substr(2, 9), // ❌ Duplicate ID generation
//                         name,
//                         price,
//                         category: 'clothing',
//                         size,
//                         color,
//                         createdAt: new Date().toISOString(), // ❌ Duplicate timestamp logic
//                         getInfo: function() {
//                             return `${this.name} (${this.size}, ${this.color}) - $${this.price}`;
//                         },
//                         getPrice: function() { // ❌ Duplicate getPrice logic
//                             return this.price;
//                         },
//                         changeSize: function(newSize) {
//                             return { ...this, size: newSize };
//                         }
//                     };
//                     return Object.freeze(clothingProduct); // ❌ Duplicate freeze logic
//
//                 case 'book':
//                     // ❌ PROBLEM 6: EVEN MORE DUPLICATION for books
//                     const bookProduct = {
//                         id: Math.random().toString(36).substr(2, 9), // ❌ Duplicate ID generation
//                         name,
//                         price,
//                         category: 'book',
//                         author,
//                         pages,
//                         createdAt: new Date().toISOString(), // ❌ Duplicate timestamp logic
//                         getInfo: function() {
//                             return `"${this.name}" by ${this.author} - $${this.price}`;
//                         },
//                         getPrice: function() { // ❌ Duplicate getPrice logic
//                             return this.price;
//                         },
//                         getReadingTime: function() {
//                             return Math.ceil(this.pages / 250);
//                         }
//                     };
//                     return Object.freeze(bookProduct); // ❌ Duplicate freeze logic
//
//                 default:
//                     throw new Error(`Unknown category: ${category}`);
//             }
//         }
//     };
//
//     return builder;
// };
//
// ❌ PROBLEMS WITH THIS APPROACH:
//
// 1. MASSIVE CODE DUPLICATION
//    - ID generation logic repeated 3 times
//    - Timestamp logic repeated 3 times
//    - getPrice() method repeated 3 times
//    - Object.freeze() repeated 3 times
//    - Validation logic scattered everywhere
//
// 2. VIOLATES DRY PRINCIPLE
//    - Same logic written multiple times
//    - Changes need to be made in multiple places
//    - High chance of introducing bugs
//
// 3. VIOLATES SINGLE RESPONSIBILITY
//    - Builder now responsible for:
//       * Building process (its job)
//       * Object creation logic (factory's job)
//       * Business rules (domain's job)
//       * Validation (domain's job)
//
// 4. MAINTENANCE NIGHTMARE
//    - Want to change electronics creation? Edit both builder AND factory
//    - Want to add new product type? Modify builder instead of just adding factory
//    - Bug in ID generation? Fix in 3+ places
//
// 5. TESTING BECOMES HARDER
//    - Can't test creation logic independently
//    - Builder tests become massive and complex
//    - Factory logic can't be unit tested separately
//
// 6. VIOLATES OPEN/CLOSED PRINCIPLE
//    - Adding new product types requires modifying existing builder code
//    - Can't extend without modification
//
// ✅ WHY DELEGATION TO FACTORY IS BETTER:
//
// 1. SINGLE RESPONSIBILITY
//    - Builder: Focus on construction process
//    - Factory: Focus on object creation
//
// 2. DRY PRINCIPLE
//    - Creation logic exists in one place
//    - Changes made once, affect everywhere
//
// 3. REUSABILITY
//    - Factory can be used by Builder, direct calls, other patterns
//    - Builder can use different factories
//
// 4. TESTABILITY
//    - Test builder logic separately from creation logic
//    - Mock factories for builder tests
//    - Test factories independently
//
// 5. MAINTAINABILITY
//    - Change creation logic? Only touch factory
//    - Change building process? Only touch builder
//    - Add new product type? Just add new factory
//
// 6. FLEXIBILITY
//    - Easy to swap different factories
//    - Builder can choose factory based on configuration
//    - Supports strategy pattern for creation
//
// CONCLUSION: Builder + Factory delegation is EXCELLENT DESIGN! 🎯
// ===========================================
