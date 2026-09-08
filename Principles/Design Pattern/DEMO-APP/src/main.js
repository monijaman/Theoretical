// E-Commerce Design Patterns Demo Application
// This file demonstrates all major design patterns working together in a real-world scenario

// ===== IMPORT ALL PATTERN IMPLEMENTATIONS =====
const {
    ProductFactory,
    UserFactory,
    ProductBuilder,
    FactoryRegistry,
    PremiumProductFactory,
    BudgetProductFactory,
    ProductPrototype
} = require('./patterns/creational/factory');
const { ConfigManager } = require('./patterns/creational/singleton');
const { CartModule } = require('./patterns/creational/module');
const { ProductDecorator } = require('./patterns/structural/decorator');
const { ProductProxy } = require('./patterns/structural/proxy');
const { EventManager } = require('./patterns/behavioral/observer');
const { PaymentContext } = require('./patterns/behavioral/strategy');
const { CommandManager } = require('./patterns/behavioral/command');

// ===== APPLICATION INITIALIZATION =====
console.log('🚀 Starting E-Commerce Design Patterns Demo\n');

async function runDemo() {
    // ===========================================
    // 1. SINGLETON PATTERN - Configuration Management
    // ===========================================
    console.log('📋 1. SINGLETON PATTERN - Configuration Management');
    const config = ConfigManager.getInstance();
    config.set('appName', 'E-Commerce Demo');
    config.set('version', '1.0.0');
    config.set('debugMode', true);

    console.log(`App: ${config.get('appName')} v${config.get('version')}`);
    console.log(`Debug Mode: ${config.get('debugMode')}\n`);    // ===========================================
    // 2. FACTORY PATTERN - Creating Objects
    // ===========================================
    console.log('🏭 2. FACTORY PATTERN - Creating Products and Users');

    // Create different types of products using factory
    const laptop = ProductFactory.createProduct('electronics', {
        name: 'Gaming Laptop',
        price: 1299.99,
        brand: 'TechCorp',
        warranty: '2 years'
    });

    const tshirt = ProductFactory.createProduct('clothing', {
        name: 'Cotton T-Shirt',
        price: 29.99,
        size: 'L',
        color: 'Blue'
    });

    const book = ProductFactory.createProduct('book', {
        name: 'Design Patterns',
        price: 49.99,
        author: 'Gang of Four',
        pages: 395
    });

    console.log('Created products:', laptop.getInfo());
    console.log('Created products:', tshirt.getInfo());
    console.log('Created products:', book.getInfo());

    // ===========================================
    // 2B. BUILDER PATTERN - Complex Construction
    // ===========================================
    console.log('\n🔨 2B. BUILDER PATTERN - Complex Product Construction');

    const builder = new ProductBuilder();
    const complexLaptop = builder
        .setName('Custom Gaming Laptop')
        .setPrice(2199.99)
        .setCategory('electronics')
        .setBrand('CustomTech')
        .setWarranty('3 years')
        .build();

    console.log('Built complex product:', complexLaptop.getInfo());

    // ===========================================
    // 2C. ABSTRACT FACTORY - Product Families
    // ===========================================
    console.log('\n🏭 2C. ABSTRACT FACTORY - Product Families');

    const premiumFactory = new PremiumProductFactory();
    const budgetFactory = new BudgetProductFactory();

    const premiumLaptop = premiumFactory.createProduct('electronics', {
        name: 'Premium Laptop',
        price: 1999.99,
        brand: 'PremiumTech',
        warranty: '2 years'
    });

    const budgetLaptop = budgetFactory.createProduct('electronics', {
        name: 'Budget Laptop',
        price: 699.99,
        brand: 'BudgetTech',
        warranty: '1 year'
    });

    console.log('Premium product:', premiumLaptop.getInfo());
    console.log('Premium features:', premiumLaptop.premiumFeatures);
    console.log('Budget product:', budgetLaptop.getInfo());
    console.log('Budget price after discount:', budgetLaptop.price);

    // ===========================================
    // 2D. PROTOTYPE PATTERN - Object Cloning
    // ===========================================
    console.log('\n📋 2D. PROTOTYPE PATTERN - Object Cloning');

    const prototype = new ProductPrototype();
    const clonedLaptop = prototype.clone('laptop', {
        name: 'Cloned Gaming Laptop',
        price: 1499.99,
        brand: 'CloneTech'
    });

    console.log('Cloned product:', clonedLaptop.getInfo());

    // ===========================================
    // 2E. REGISTRY PATTERN - Factory Management
    // ===========================================
    console.log('\n📚 2E. REGISTRY PATTERN - Factory Management');

    const registry = new FactoryRegistry();
    console.log('Available factories:', registry.listFactories());

    const registryProduct = registry.create('product', 'electronics', {
        name: 'Registry Laptop',
        price: 1099.99,
        brand: 'RegistryTech',
        warranty: '2 years'
    });

    console.log('Registry created product:', registryProduct.getInfo());

    // Create users using factory
    const customer = UserFactory.createUser('customer', {
        name: 'John Doe',
        email: 'john@example.com'
    });

    const admin = UserFactory.createUser('admin', {
        name: 'Admin User',
        email: 'admin@example.com'
    });

    console.log(`Customer created: ${customer.getInfo()}`);
    console.log(`Admin created: ${admin.getInfo()}\n`);

    // ===========================================
    // 3. MODULE PATTERN - Shopping Cart
    // ===========================================
    console.log('📦 3. MODULE PATTERN - Shopping Cart Management');
    const cart = CartModule.createCart();

    cart.addItem(laptop, 1);
    cart.addItem(tshirt, 2);
    cart.addItem(book, 1);

    console.log(`Items in cart: ${cart.getItemCount()}`);
    console.log(`Cart total: $${cart.getTotal()}`);
    console.log('Cart contents:', cart.getItems());
    console.log('');

    // ===========================================
    // 4. OBSERVER PATTERN - Event Notifications
    // ===========================================
    console.log('👀 4. OBSERVER PATTERN - Event Notifications');
    const eventManager = new EventManager();

    // Subscribe to different events
    eventManager.subscribe('userLogin', (data) => {
        console.log(`📧 Email Service: Welcome back, ${data.userName}!`);
    });

    eventManager.subscribe('userLogin', (data) => {
        console.log(`📊 Analytics: User ${data.userName} logged in at ${data.timestamp}`);
    });

    eventManager.subscribe('productPurchased', (data) => {
        console.log(`📦 Inventory: Reduce stock for ${data.productName}`);
    });

    eventManager.subscribe('productPurchased', (data) => {
        console.log(`💰 Accounting: Record sale of $${data.price}`);
    });

    // Trigger events
    eventManager.notify('userLogin', {
        userName: 'John Doe',
        timestamp: new Date().toISOString()
    });

    eventManager.notify('productPurchased', {
        productName: 'Gaming Laptop',
        price: 1299.99
    });
    console.log('');

    // ===========================================
    // 5. DECORATOR PATTERN - Enhancing Products
    // ===========================================
    console.log('🎨 5. DECORATOR PATTERN - Product Enhancements');

    // Start with base laptop
    let enhancedLaptop = laptop;
    console.log(`Base product: ${enhancedLaptop.getInfo()}`);
    console.log(`Base price: $${enhancedLaptop.getPrice()}`);

    // Add extended warranty
    enhancedLaptop = ProductDecorator.addExtendedWarranty(enhancedLaptop);
    console.log(`With extended warranty: $${enhancedLaptop.getPrice()}`);

    // Add gift wrapping
    enhancedLaptop = ProductDecorator.addGiftWrap(enhancedLaptop);
    console.log(`With gift wrap: $${enhancedLaptop.getPrice()}`);

    // Add express shipping
    enhancedLaptop = ProductDecorator.addExpressShipping(enhancedLaptop);
    console.log(`With express shipping: $${enhancedLaptop.getPrice()}`);
    console.log(`Final enhanced product: ${enhancedLaptop.getInfo()}\n`);

    // ===========================================
    // 6. PROXY PATTERN - Caching and Access Control
    // ===========================================
    console.log('🛡️ 6. PROXY PATTERN - Product Access Control & Caching');

    const productProxy = new ProductProxy([laptop, tshirt, book]);

    // First access - will fetch from "database"
    console.log('First access (fetching from database):');
    const product1 = await productProxy.getProduct('Gaming Laptop');
    console.log(`Retrieved: ${product1.getInfo()}`);

    // Second access - will use cache
    console.log('Second access (using cache):');
    const product2 = await productProxy.getProduct('Gaming Laptop');
    console.log(`Retrieved: ${product2.getInfo()}`);

    // Try to access non-existent product
    console.log('Accessing non-existent product:');
    const product3 = await productProxy.getProduct('Non-existent Product');
    console.log('');

    // ===========================================
    // 7. STRATEGY PATTERN - Payment Processing
    // ===========================================
    console.log('💳 7. STRATEGY PATTERN - Payment Processing');

    const paymentProcessor = new PaymentContext();
    const orderTotal = cart.getTotal();

    // Pay with credit card
    console.log('Processing payment with Credit Card:');
    paymentProcessor.setStrategy('creditcard');
    let result1 = paymentProcessor.processPayment(orderTotal, {
        cardNumber: '1234-5678-9012-3456',
        cvv: '123',
        expiryDate: '12/25'
    });
    console.log(`Payment result: ${result1}`);

    // Pay with PayPal
    console.log('Processing payment with PayPal:');
    paymentProcessor.setStrategy('paypal');
    let result2 = paymentProcessor.processPayment(orderTotal, {
        email: 'john@example.com',
        password: 'securepassword'
    });
    console.log(`Payment result: ${result2}`);

    // Pay with cryptocurrency
    console.log('Processing payment with Cryptocurrency:');
    paymentProcessor.setStrategy('crypto');
    let result3 = paymentProcessor.processPayment(orderTotal, {
        walletAddress: '1A2B3C4D5E6F7G8H9I',
        privateKey: 'private_key_here'
    });
    console.log(`Payment result: ${result3}\n`);

    // ===========================================
    // 8. COMMAND PATTERN - User Actions & Undo/Redo
    // ===========================================
    console.log('⚡ 8. COMMAND PATTERN - User Actions with Undo/Redo');

    const commandManager = new CommandManager();

    // Execute commands
    console.log('Executing commands:');
    commandManager.executeCommand('addToCart', {
        item: laptop,
        quantity: 1,
        cart: cart
    });

    commandManager.executeCommand('removeFromCart', {
        itemName: 'Cotton T-Shirt',
        cart: cart
    });

    commandManager.executeCommand('updateQuantity', {
        itemName: 'Gaming Laptop',
        newQuantity: 2,
        cart: cart
    });

    console.log(`Current cart total: $${cart.getTotal()}`);
    console.log(`Items in cart: ${cart.getItemCount()}`);

    // Undo last two commands
    console.log('\nUndoing last 2 commands:');
    commandManager.undo();
    commandManager.undo();

    console.log(`After undo - cart total: $${cart.getTotal()}`);
    console.log(`After undo - items in cart: ${cart.getItemCount()}`);

    // Redo one command
    console.log('\nRedoing 1 command:');
    commandManager.redo();

    console.log(`After redo - cart total: $${cart.getTotal()}`);
    console.log(`After redo - items in cart: ${cart.getItemCount()}\n`);

    // ===========================================
    // SUMMARY
    // ===========================================
    console.log('🎉 DEMO COMPLETE - All Design Patterns Demonstrated!');
    console.log('='.repeat(60));
    console.log('✅ Singleton Pattern - Configuration management');
    console.log('✅ Factory Pattern - Object creation');
    console.log('✅ Builder Pattern - Complex object construction');
    console.log('✅ Abstract Factory - Product families');
    console.log('✅ Prototype Pattern - Object cloning');
    console.log('✅ Registry Pattern - Factory management');
    console.log('✅ Module Pattern - Encapsulation');
    console.log('✅ Observer Pattern - Event system');
    console.log('✅ Decorator Pattern - Feature enhancement');
    console.log('✅ Proxy Pattern - Access control & caching');
    console.log('✅ Strategy Pattern - Algorithm selection');
    console.log('✅ Command Pattern - Action management');
    console.log('='.repeat(60));
}

// Run the demo
runDemo().catch(console.error);