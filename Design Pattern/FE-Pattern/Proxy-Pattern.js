/**
 * The Proxy Pattern provides a surrogate or placeholder
 *  for another object to control access to it.
 *
 * A credit card is a proxy for a bank account, which is a proxy for a bundle of cash.
 *  Both implement the same interface: they can be used for making a payment. 
 * A consumer feels great because there’s no need to carry loads of cash around. 
 * A shop owner is also happy since the income from a transaction gets added electronically 
 * to the shop’s bank account without the risk of losing the deposit or getting robbed 
 * on the way to the bank.
 * 
 * 
 * Use Case in Frontend:
 * - Intercepting requests/responses (e.g., logging, caching, or modifying network requests).
 * - Implementing lazy loading of images or components.
 * - Protecting access to sensitive parts of an application (like APIs).
 * - Virtual scrolling or infinite scroll lists (loading data as needed).
 * - Data validation and sanitization before updating state or sending to server.
 * - Creating mock APIs for frontend development/testing.
 */



// 1. Image Lazy Loading Proxy
class ImageProxy {
    constructor(url) {
        this.url = url;
        this.image = null;
    }

    display() {
        if (this.image === null) {
            this.loadImage();
            return 'Loading...'; // Show placeholder while loading
        }
        return this.image;
    }

    loadImage() {
        const image = new Image();
        image.onload = () => {
            this.image = image;
            console.log('Image loaded:', this.url);
        };
        image.src = this.url;
    }
}

// Usage:
const lazyImage = new ImageProxy('https://example.com/large-image.jpg');
console.log(lazyImage.display()); // Shows "Loading..."
// After loading completes, displays actual image

// 2. API Cache Proxy
class APIProxy {
    constructor() {
        this.cache = new Map();
    }

    async fetch(url) {
        if (this.cache.has(url)) {
            console.log('Returning from cache:', url);
            return this.cache.get(url);
        }

        console.log('Fetching from API:', url);
        const response = await fetch(url);
        const data = await response.json();
        this.cache.set(url, data);
        return data;
    }

    clearCache() {
        this.cache.clear();
    }
}

// Usage:
const api = new APIProxy();
// First call fetches from API
api.fetch('https://api.example.com/data');
// Second call returns cached data
api.fetch('https://api.example.com/data');

// 3. Form Validation Proxy
const formValidationProxy = {
    set(target, property, value) {
        // Validation rules
        const rules = {
            email: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            phone: value => /^\d{10}$/.test(value),
            age: value => parseInt(value) >= 18 && parseInt(value) <= 100
        };

        if (rules[property]) {
            if (!rules[property](value)) {
                throw new Error(`Invalid ${property}: ${value}`);
            }
        }

        target[property] = value;
        return true;
    }
};

// Usage:
const form = new Proxy({}, formValidationProxy);
try {
    form.email = 'invalid-email'; // Throws error
} catch (e) {
    console.error(e.message);
}
form.email = 'valid@email.com'; // Sets successfully

// 4. Virtual Scrolling Proxy
class VirtualListProxy {
    constructor(totalItems) {
        this.totalItems = totalItems;
        this.loadedItems = new Map();
    }

    getItem(index) {
        if (index < 0 || index >= this.totalItems) {
            return null;
        }

        if (!this.loadedItems.has(index)) {
            this.loadItems(index);
            return 'Loading...';
        }

        return this.loadedItems.get(index);
    }

    loadItems(startIndex) {
        // Simulate async data loading
        setTimeout(() => {
            for (let i = startIndex; i < startIndex + 10; i++) {
                if (i < this.totalItems) {
                    this.loadedItems.set(i, `Item ${i}`);
                }
            }
        }, 100);
    }
}

// Usage:
const virtualList = new VirtualListProxy(1000);
console.log(virtualList.getItem(5)); // "Loading..."
// After 100ms, would show "Item 5"

// 5. Permission Proxy
const userPermissionProxy = {
    get(target, property) {
        const userRole = target.role;
        const permissions = {
            admin: ['read', 'write', 'delete'],
            user: ['read'],
            guest: []
        };

        if (property === 'can') {
            return (action) => permissions[userRole].includes(action);
        }

        return target[property];
    }
};

// Usage:
const user = new Proxy({ role: 'user' }, userPermissionProxy);
console.log(user.can('read')); // true
console.log(user.can('delete')); // false