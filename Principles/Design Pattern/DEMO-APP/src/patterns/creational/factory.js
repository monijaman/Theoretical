// FACTORY PATTERN IMPLEMENTATION WITH ADDITIONAL PATTERNS
// Creates different types of objects without specifying the exact class to create
// Benefits: Encapsulates object creation logic, easy to extend with new types
//
// ADDITIONAL PATTERNS USED:
// - BUILDER PATTERN: For complex object construction
// - PROTOTYPE PATTERN: For object cloning
// - REGISTRY PATTERN: For managing factories
// - ABSTRACT FACTORY PATTERN: For creating families of related objects

// ===========================================
// PRODUCT FACTORIES
// ===========================================

// Base Product class - all products inherit from this
class Product {
    constructor(name, price) {
        this.name = name;
        this.price = price;
        this.id = Math.random().toString(36).substr(2, 9);
        this.createdAt = new Date();
    }

    getInfo() {
        return `${this.name} - $${this.price}`;
    }

    getPrice() {
        return this.price;
    }
}

// Electronics Product - specific implementation
class ElectronicsProduct extends Product {
    constructor(name, price, brand, warranty) {
        super(name, price);
        this.brand = brand;
        this.warranty = warranty;
        this.category = 'electronics';
    }

    getInfo() {
        return `${this.name} by ${this.brand} - $${this.price} (${this.warranty} warranty)`;
    }

    // Electronics-specific methods
    extendWarranty(months) {
        this.warranty = `${parseInt(this.warranty) + months} years`;
    }
}

// Clothing Product - specific implementation
class ClothingProduct extends Product {
    constructor(name, price, size, color) {
        super(name, price);
        this.size = size;
        this.color = color;
        this.category = 'clothing';
    }

    getInfo() {
        return `${this.name} (${this.size}, ${this.color}) - $${this.price}`;
    }

    // Clothing-specific methods
    changeSize(newSize) {
        this.size = newSize;
    }
}

// Book Product - specific implementation
class BookProduct extends Product {
    constructor(name, price, author, pages) {
        super(name, price);
        this.author = author;
        this.pages = pages;
        this.category = 'book';
    }

    getInfo() {
        return `"${this.name}" by ${this.author} - $${this.price} (${this.pages} pages)`;
    }

    // Book-specific methods
    getReadingTime() {
        return Math.ceil(this.pages / 250); // Assume 250 words per page, 200 wpm
    }

    // PROTOTYPE PATTERN: Clone method for creating copies
    clone() {
        return new BookProduct(this.name, this.price, this.author, this.pages);
    }
}

// ===========================================
// BUILDER PATTERN - Complex Product Construction
// ===========================================

class ProductBuilder {
    constructor() {
        this.reset();
    }

    reset() {
        this.product = {};
        return this;
    }

    setName(name) {
        this.product.name = name;
        return this;
    }

    setPrice(price) {
        this.product.price = price;
        return this;
    }

    setCategory(category) {
        this.product.category = category;
        return this;
    }

    // Electronics specific
    setBrand(brand) {
        this.product.brand = brand;
        return this;
    }

    setWarranty(warranty) {
        this.product.warranty = warranty;
        return this;
    }

    // Clothing specific
    setSize(size) {
        this.product.size = size;
        return this;
    }

    setColor(color) {
        this.product.color = color;
        return this;
    }

    // Book specific
    setAuthor(author) {
        this.product.author = author;
        return this;
    }

    setPages(pages) {
        this.product.pages = pages;
        return this;
    }

    build() {
        const category = this.product.category;

        switch (category) {
            case 'electronics':
                return new ElectronicsProduct(
                    this.product.name,
                    this.product.price,
                    this.product.brand,
                    this.product.warranty
                );
            case 'clothing':
                return new ClothingProduct(
                    this.product.name,
                    this.product.price,
                    this.product.size,
                    this.product.color
                );
            case 'book':
                return new BookProduct(
                    this.product.name,
                    this.product.price,
                    this.product.author,
                    this.product.pages
                );
            default:
                throw new Error(`Unknown category: ${category}`);
        }
    }
}

// ===========================================
// REGISTRY PATTERN - Factory Management
// ===========================================

class FactoryRegistry {
    constructor() {
        this.factories = new Map();
        this.defaultFactories();
    }

    // Register default factories
    defaultFactories() {
        this.registerFactory('product', ProductFactory);
        this.registerFactory('user', UserFactory);
    }

    // Register a factory
    registerFactory(type, factory) {
        this.factories.set(type, factory);
        console.log(`[REGISTRY] Registered factory: ${type}`);
    }

    // Get factory by type
    getFactory(type) {
        if (!this.factories.has(type)) {
            throw new Error(`Factory '${type}' not found in registry`);
        }
        return this.factories.get(type);
    }

    // Create object using registered factory
    create(factoryType, objectType, options) {
        const factory = this.getFactory(factoryType);

        if (factoryType === 'product') {
            return factory.createProduct(objectType, options);
        } else if (factoryType === 'user') {
            return factory.createUser(objectType, options);
        }

        throw new Error(`Unknown factory type: ${factoryType}`);
    }

    // List all registered factories
    listFactories() {
        return Array.from(this.factories.keys());
    }
}

// ===========================================
// ABSTRACT FACTORY PATTERN - Product Families
// ===========================================

// Abstract Factory Interface
class AbstractProductFactory {
    createProduct() {
        throw new Error('createProduct method must be implemented');
    }

    createAccessories() {
        throw new Error('createAccessories method must be implemented');
    }

    createWarranty() {
        throw new Error('createWarranty method must be implemented');
    }
}

// Premium Product Family Factory
class PremiumProductFactory extends AbstractProductFactory {
    createProduct(type, options) {
        const product = ProductFactory.createProduct(type, options);

        // Add premium features
        product.isPremium = true;
        product.premiumFeatures = ['Priority Support', 'Extended Warranty', 'Premium Packaging'];

        return product;
    }

    createAccessories(productType) {
        const accessories = {
            electronics: ['Premium Case', 'Wireless Charger', 'Screen Protector'],
            clothing: ['Premium Hanger', 'Garment Bag', 'Care Instructions'],
            book: ['Bookmark', 'Book Cover', 'Reading Light']
        };

        return accessories[productType] || [];
    }

    createWarranty(productType) {
        return {
            type: 'Premium Warranty',
            duration: '3 years',
            coverage: 'Full coverage including accidental damage',
            support: '24/7 premium support'
        };
    }
}

// Budget Product Family Factory
class BudgetProductFactory extends AbstractProductFactory {
    createProduct(type, options) {
        const product = ProductFactory.createProduct(type, options);

        // Add budget features
        product.isBudget = true;
        product.budgetFeatures = ['Basic Support', 'Standard Warranty'];

        // Apply budget discount
        product.price = product.price * 0.8; // 20% discount

        return product;
    }

    createAccessories(productType) {
        const accessories = {
            electronics: ['Basic Case'],
            clothing: ['Standard Hanger'],
            book: ['Paper Bookmark']
        };

        return accessories[productType] || [];
    }

    createWarranty(productType) {
        return {
            type: 'Basic Warranty',
            duration: '1 year',
            coverage: 'Manufacturing defects only',
            support: 'Email support only'
        };
    }
}

// ===========================================
// PROTOTYPE PATTERN - Object Cloning
// ===========================================

class ProductPrototype {
    constructor() {
        this.prototypes = new Map();
        this.initializePrototypes();
    }

    initializePrototypes() {
        // Create prototype instances
        const laptopPrototype = new ElectronicsProduct('Laptop Template', 999.99, 'TechCorp', '2 years');
        const shirtPrototype = new ClothingProduct('Shirt Template', 29.99, 'M', 'Blue');
        const bookPrototype = new BookProduct('Book Template', 19.99, 'Author', 300);

        this.prototypes.set('laptop', laptopPrototype);
        this.prototypes.set('shirt', shirtPrototype);
        this.prototypes.set('book', bookPrototype);
    }

    clone(prototypeKey, customizations = {}) {
        const prototype = this.prototypes.get(prototypeKey);

        if (!prototype) {
            throw new Error(`Prototype '${prototypeKey}' not found`);
        }

        // Clone the prototype
        let cloned;
        if (prototype instanceof ElectronicsProduct) {
            cloned = new ElectronicsProduct(prototype.name, prototype.price, prototype.brand, prototype.warranty);
        } else if (prototype instanceof ClothingProduct) {
            cloned = new ClothingProduct(prototype.name, prototype.price, prototype.size, prototype.color);
        } else if (prototype instanceof BookProduct) {
            cloned = new BookProduct(prototype.name, prototype.price, prototype.author, prototype.pages);
        }

        // Apply customizations
        Object.assign(cloned, customizations);

        console.log(`[PROTOTYPE] Cloned ${prototypeKey} with customizations`);
        return cloned;
    }

    addPrototype(key, prototype) {
        this.prototypes.set(key, prototype);
    }

    listPrototypes() {
        return Array.from(this.prototypes.keys());
    }
}

// FACTORY CLASS - Creates products based on type
class ProductFactory {
    // Factory method - creates different types of products
    static createProduct(type, options) {
        switch (type.toLowerCase()) {
            case 'electronics':
                return new ElectronicsProduct(
                    options.name,
                    options.price,
                    options.brand,
                    options.warranty
                );

            case 'clothing':
                return new ClothingProduct(
                    options.name,
                    options.price,
                    options.size,
                    options.color
                );

            case 'book':
                return new BookProduct(
                    options.name,
                    options.price,
                    options.author,
                    options.pages
                );

            default:
                throw new Error(`Unknown product type: ${type}`);
        }
    }

    // Factory method to get available product types
    static getAvailableTypes() {
        return ['electronics', 'clothing', 'book'];
    }
}

// ===========================================
// USER FACTORIES
// ===========================================

// Base User class
class User {
    constructor(name, email) {
        this.name = name;
        this.email = email;
        this.id = Math.random().toString(36).substr(2, 9);
        this.createdAt = new Date();
    }

    getInfo() {
        return `${this.name} (${this.email})`;
    }
}

// Customer User - specific implementation
class Customer extends User {
    constructor(name, email) {
        super(name, email);
        this.type = 'customer';
        this.orderHistory = [];
        this.loyaltyPoints = 0;
    }

    // Customer-specific methods
    addOrder(order) {
        this.orderHistory.push(order);
        this.loyaltyPoints += Math.floor(order.total / 10); // 1 point per $10 spent
    }

    getInfo() {
        return `Customer: ${this.name} (${this.email}) - ${this.loyaltyPoints} points`;
    }
}

// Admin User - specific implementation
class Admin extends User {
    constructor(name, email) {
        super(name, email);
        this.type = 'admin';
        this.permissions = ['read', 'write', 'delete', 'manage_users'];
    }

    // Admin-specific methods
    addPermission(permission) {
        if (!this.permissions.includes(permission)) {
            this.permissions.push(permission);
        }
    }

    getInfo() {
        return `Admin: ${this.name} (${this.email}) - ${this.permissions.length} permissions`;
    }
}

// Guest User - specific implementation
class Guest extends User {
    constructor() {
        super('Guest User', 'guest@temp.com');
        this.type = 'guest';
        this.sessionId = Math.random().toString(36).substr(2, 16);
    }

    getInfo() {
        return `Guest User (Session: ${this.sessionId})`;
    }
}

// USER FACTORY CLASS
class UserFactory {
    static createUser(type, options = {}) {
        switch (type.toLowerCase()) {
            case 'customer':
                return new Customer(options.name, options.email);

            case 'admin':
                return new Admin(options.name, options.email);

            case 'guest':
                return new Guest();

            default:
                throw new Error(`Unknown user type: ${type}`);
        }
    }

    static getAvailableTypes() {
        return ['customer', 'admin', 'guest'];
    }
}

// Export the factories and additional patterns
module.exports = {
    ProductFactory,
    UserFactory,
    ProductBuilder,
    FactoryRegistry,
    AbstractProductFactory,
    PremiumProductFactory,
    BudgetProductFactory,
    ProductPrototype,
    Product,
    ElectronicsProduct,
    ClothingProduct,
    BookProduct,
    User,
    Customer,
    Admin,
    Guest
};