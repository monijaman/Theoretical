// FUNCTIONAL DESIGN PATTERNS DEMO APPLICATION
// This demonstrates all major design patterns using Functional Programming principles
// Benefits: Pure functions, immutability, composability, predictability

// ===== IMPORT ALL FUNCTIONAL PATTERN IMPLEMENTATIONS =====
const { createProductFactory, createUserFactory, createProductBuilder } = require('./patterns/creational/factories');
const { createConfigManager } = require('./patterns/creational/singleton');
const { createCartModule } = require('./patterns/creational/module');
const { createProductDecorator } = require('./patterns/structural/decorator');
const { createProductProxy } = require('./patterns/structural/proxy');
const { createEventManager } = require('./patterns/behavioral/observer');
const { createPaymentProcessor } = require('./patterns/behavioral/strategy');
const { createCommandManager } = require('./patterns/behavioral/command');

// ===== APPLICATION INITIALIZATION =====
console.log('🚀 Starting Functional Design Patterns Demo\n');

async function runFunctionalDemo() {
    // ===========================================
    // 1. SINGLETON PATTERN (FUNCTIONAL) - Module with Closures
    // ===========================================
    console.log('📋 1. FUNCTIONAL SINGLETON - Configuration Management');

    // Create singleton using closure
    const configManager = createConfigManager();
    configManager.set('appName', 'Functional E-Commerce Demo');
    configManager.set('version', '2.0.0');
    configManager.set('debugMode', true);

    console.log(`App: ${configManager.get('appName')} v${configManager.get('version')}`);
    console.log(`Debug Mode: ${configManager.get('debugMode')}\n`);

    // ===========================================
    // 2. FACTORY PATTERN (FUNCTIONAL) - Pure Factory Functions
    // ===========================================
    console.log('🏭 2. FUNCTIONAL FACTORY - Creating Products and Users');

    // Create factory functions
    const productFactory = createProductFactory();
    const userFactory = createUserFactory();

    // Create products using pure functions
    const laptop = productFactory.createElectronics({
        name: 'Gaming Laptop',
        price: 1299.99,
        brand: 'TechCorp',
        warranty: '2 years'
    });

    const tshirt = productFactory.createClothing({
        name: 'Cotton T-Shirt',
        price: 29.99,
        size: 'L',
        color: 'Blue'
    });

    const book = productFactory.createBook({
        name: 'Functional Programming',
        price: 49.99,
        author: 'Jane Smith',
        pages: 350
    });

    console.log('Created products:', laptop.getInfo());
    console.log('Created products:', tshirt.getInfo());
    console.log('Created products:', book.getInfo());

    // Create users using factory functions
    const customer = userFactory.createCustomer({
        name: 'John Doe',
        email: 'john@example.com'
    });

    const admin = userFactory.createAdmin({
        name: 'Admin User',
        email: 'admin@example.com'
    });

    console.log(`Customer created: ${customer.getInfo()}`);
    console.log(`Admin created: ${admin.getInfo()}\n`);

    // ===========================================
    // 3. BUILDER PATTERN (FUNCTIONAL) - Function Composition
    // ===========================================
    console.log('🔨 3. FUNCTIONAL BUILDER - Composable Product Creation');

    const productBuilder = createProductBuilder();

    // Chain functions to build complex product
    const complexLaptop = productBuilder
        .setName('Custom Gaming Laptop')
        .setPrice(2199.99)
        .setCategory('electronics')
        .setBrand('CustomTech')
        .setWarranty('3 years')
        .build();

    console.log('Built complex product:', complexLaptop.getInfo());
    console.log('');

    // ===========================================
    // 4. MODULE PATTERN (FUNCTIONAL) - Shopping Cart
    // ===========================================
    console.log('📦 4. FUNCTIONAL MODULE - Shopping Cart Management');

    const cart = createCartModule();

    cart.addItem(laptop, 1);
    cart.addItem(tshirt, 2);
    cart.addItem(book, 1);

    console.log(`Items in cart: ${cart.getItemCount()}`);
    console.log(`Cart total: $${cart.getTotal()}`);
    console.log('Cart state:', cart.getState());
    console.log('');

    // ===========================================
    // 5. OBSERVER PATTERN (FUNCTIONAL) - Event System
    // ===========================================
    console.log('👀 5. FUNCTIONAL OBSERVER - Event Notifications');

    const eventManager = createEventManager();

    // Subscribe to events using pure functions
    const emailNotifier = (data) => {
        console.log(`📧 Email Service: Welcome back, ${data.userName}!`);
    };

    const analyticsTracker = (data) => {
        console.log(`📊 Analytics: User ${data.userName} logged in at ${data.timestamp}`);
    };

    const inventoryUpdater = (data) => {
        console.log(`📦 Inventory: Reduce stock for ${data.productName}`);
    };

    // Subscribe functions to events
    eventManager.subscribe('userLogin', emailNotifier);
    eventManager.subscribe('userLogin', analyticsTracker);
    eventManager.subscribe('productPurchased', inventoryUpdater);

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
    // 6. DECORATOR PATTERN (FUNCTIONAL) - Higher-Order Functions
    // ===========================================
    console.log('🎨 6. FUNCTIONAL DECORATOR - Product Enhancement');

    const decorator = createProductDecorator();

    // Start with base laptop
    let enhancedLaptop = laptop;
    console.log(`Base product: ${enhancedLaptop.getInfo()}`);
    console.log(`Base price: $${enhancedLaptop.price}`);

    // Apply decorators using function composition
    enhancedLaptop = decorator.addExtendedWarranty(enhancedLaptop);
    console.log(`With extended warranty: $${enhancedLaptop.price}`);

    enhancedLaptop = decorator.addGiftWrap(enhancedLaptop);
    console.log(`With gift wrap: $${enhancedLaptop.price}`);

    enhancedLaptop = decorator.addExpressShipping(enhancedLaptop);
    console.log(`With express shipping: $${enhancedLaptop.price}`);
    console.log(`Final enhanced product: ${enhancedLaptop.getInfo()}\n`);

    // ===========================================
    // 7. PROXY PATTERN (FUNCTIONAL) - Function Wrappers
    // ===========================================
    console.log('🛡️ 7. FUNCTIONAL PROXY - Access Control & Caching');

    const productProxy = createProductProxy([laptop, tshirt, book]);

    // First access - will fetch from "database"
    console.log('First access (fetching from database):');
    const product1 = await productProxy.getProduct('Gaming Laptop');
    console.log(`Retrieved: ${product1.getInfo()}`);

    // Second access - will use cache
    console.log('Second access (using cache):');
    const product2 = await productProxy.getProduct('Gaming Laptop');
    console.log(`Retrieved: ${product2.getInfo()}`);
    console.log('');

    // ===========================================
    // 8. STRATEGY PATTERN (FUNCTIONAL) - Strategy Functions
    // ===========================================
    console.log('💳 8. FUNCTIONAL STRATEGY - Payment Processing');

    const paymentProcessor = createPaymentProcessor();
    const orderTotal = cart.getTotal();

    // Pay with credit card
    console.log('Processing payment with Credit Card:');
    const result1 = paymentProcessor.processPayment('creditcard', orderTotal, {
        cardNumber: '1234-5678-9012-3456',
        cvv: '123',
        expiryDate: '12/25'
    });
    console.log(`Payment result: ${result1.message}`);

    // Pay with PayPal
    console.log('Processing payment with PayPal:');
    const result2 = paymentProcessor.processPayment('paypal', orderTotal, {
        email: 'john@example.com',
        password: 'securepassword'
    });
    console.log(`Payment result: ${result2.message}`);
    console.log('');

    // ===========================================
    // 9. COMMAND PATTERN (FUNCTIONAL) - Command Functions
    // ===========================================
    console.log('⚡ 9. FUNCTIONAL COMMAND - User Actions with Undo/Redo');

    const commandManager = createCommandManager();

    // Execute commands
    console.log('Executing commands:');
    commandManager.execute('addToCart', {
        item: laptop,
        quantity: 1,
        cart: cart
    });

    commandManager.execute('removeFromCart', {
        itemName: 'Cotton T-Shirt',
        cart: cart
    });

    console.log(`Current cart total: $${cart.getTotal()}`);
    console.log(`Items in cart: ${cart.getItemCount()}`);

    // Undo last command
    console.log('\nUndoing last command:');
    commandManager.undo();

    console.log(`After undo - cart total: $${cart.getTotal()}`);
    console.log(`After undo - items in cart: ${cart.getItemCount()}`);
    console.log('');

    // ===========================================
    // FUNCTIONAL PROGRAMMING BENEFITS DEMO
    // ===========================================
    console.log('🎯 FUNCTIONAL PROGRAMMING BENEFITS:');
    console.log('='.repeat(50));
    console.log('✅ Pure Functions - Predictable, no side effects');
    console.log('✅ Immutability - Data never changes unexpectedly');
    console.log('✅ Composability - Functions easily combine');
    console.log('✅ Testability - Easy to unit test pure functions');
    console.log('✅ Concurrency - Safe for parallel execution');
    console.log('='.repeat(50));

    // ===========================================
    // SUMMARY
    // ===========================================
    console.log('\n🎉 FUNCTIONAL DEMO COMPLETE - All Patterns Demonstrated!');
    console.log('='.repeat(60));
    console.log('✅ Functional Singleton - Module pattern with closures');
    console.log('✅ Functional Factory - Pure factory functions');
    console.log('✅ Functional Builder - Function composition');
    console.log('✅ Functional Module - Encapsulation with closures');
    console.log('✅ Functional Observer - Event functions');
    console.log('✅ Functional Decorator - Higher-order functions');
    console.log('✅ Functional Proxy - Function wrappers');
    console.log('✅ Functional Strategy - Strategy function maps');
    console.log('✅ Functional Command - Command functions with undo');
    console.log('='.repeat(60));
}

// Run the functional demo
runFunctionalDemo().catch(console.error);