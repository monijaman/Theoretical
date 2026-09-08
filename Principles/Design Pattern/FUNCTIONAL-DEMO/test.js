#!/usr/bin/env node

// FUNCTIONAL DESIGN PATTERNS DEMO - TEST RUNNER
// Quick test to verify all patterns work correctly

const { createProductFactory } = require('./src/patterns/creational/factories');
const { createConfigManager } = require('./src/patterns/creational/singleton');
const { createCartModule } = require('./src/patterns/creational/module');

console.log('🧪 Testing Functional Design Patterns Demo...\n');

// Test 1: Factory Pattern
console.log('1. Testing Factory Pattern:');
try {
    const factory = createProductFactory();
    const laptop = factory.createElectronics({
        name: 'Test Laptop',
        price: 999.99,
        brand: 'TestCorp',
        warranty: '1 year'
    });
    console.log('✅ Factory test passed:', laptop.getInfo());
} catch (error) {
    console.log('❌ Factory test failed:', error.message);
}

// Test 2: Singleton Pattern
console.log('\n2. Testing Singleton Pattern:');
try {
    const config = createConfigManager();
    config.set('testKey', 'testValue');
    const value = config.get('testKey');
    console.log('✅ Singleton test passed:', value);
} catch (error) {
    console.log('❌ Singleton test failed:', error.message);
}

// Test 3: Module Pattern
console.log('\n3. Testing Module Pattern:');
try {
    const cart = createCartModule();
    const testItem = {
        name: 'Test Item',
        price: 29.99,
        getInfo: () => 'Test Item - $29.99'
    };

    cart.addItem(testItem, 2);
    console.log('✅ Module test passed - Items:', cart.getItemCount(), 'Total:', cart.getTotal());
} catch (error) {
    console.log('❌ Module test failed:', error.message);
}

console.log('\n🎉 Basic tests completed! Run "npm start" for full demo.');