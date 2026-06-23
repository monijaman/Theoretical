// PROXY PATTERN IMPLEMENTATION
// Controls access to an object by providing a surrogate or placeholder
// Benefits: Lazy loading, access control, caching, logging, monitoring

// ===========================================
// PRODUCT ACCESS PROXY
// ===========================================

class ProductProxy {
    constructor(products = []) {
        // Store products in a Map for faster lookups
        this.products = new Map();
        this.cache = new Map();
        this.accessLog = [];
        this.securityRules = new Map();

        // Initialize products
        products.forEach(product => {
            this.products.set(product.name, product);
        });

        console.log(`[PROXY] Initialized with ${products.length} products`);
    }

    // ===========================================
    // CACHING PROXY METHODS
    // ===========================================

    async getProduct(productName) {
        console.log(`[PROXY] Request for product: ${productName}`);

        // Log access attempt
        this.logAccess('getProduct', productName);

        // Check cache first
        if (this.cache.has(productName)) {
            console.log(`[PROXY] ✅ Cache HIT for ${productName}`);
            return this.cache.get(productName);
        }

        console.log(`[PROXY] ❌ Cache MISS for ${productName}`);

        // Simulate database/API call delay
        await this.simulateDelay(100);

        // Check if product exists
        if (!this.products.has(productName)) {
            console.log(`[PROXY] ⚠️ Product not found: ${productName}`);
            return null;
        }

        // Get product from "database"
        const product = this.products.get(productName);
        console.log(`[PROXY] 📦 Fetched from database: ${productName}`);

        // Cache the result
        this.cache.set(productName, product);
        console.log(`[PROXY] 💾 Cached product: ${productName}`);

        return product;
    }

    // Clear cache
    clearCache() {
        const cacheSize = this.cache.size;
        this.cache.clear();
        console.log(`[PROXY] 🗑️ Cache cleared (${cacheSize} items removed)`);
    }

    // Get cache statistics
    getCacheStats() {
        const totalRequests = this.accessLog.filter(log => log.method === 'getProduct').length;
        const cacheHits = this.accessLog.filter(log =>
            log.method === 'getProduct' && log.details && log.details.cacheHit
        ).length;

        return {
            cacheSize: this.cache.size,
            totalRequests,
            cacheHits,
            cacheHitRate: totalRequests > 0 ? ((cacheHits / totalRequests) * 100).toFixed(2) + '%' : '0%'
        };
    }

    // ===========================================
    // ACCESS CONTROL PROXY METHODS
    // ===========================================

    addProduct(product, userRole = 'user') {
        this.logAccess('addProduct', product.name, { userRole });

        // Check permissions
        if (!this.hasPermission(userRole, 'write')) {
            console.log(`[PROXY] 🚫 Access denied: ${userRole} cannot add products`);
            throw new Error('Insufficient permissions to add products');
        }

        this.products.set(product.name, product);
        // Invalidate cache for this product
        this.cache.delete(product.name);

        console.log(`[PROXY] ✅ Product added: ${product.name}`);
        return true;
    }

    removeProduct(productName, userRole = 'user') {
        this.logAccess('removeProduct', productName, { userRole });

        // Check permissions
        if (!this.hasPermission(userRole, 'delete')) {
            console.log(`[PROXY] 🚫 Access denied: ${userRole} cannot remove products`);
            throw new Error('Insufficient permissions to remove products');
        }

        const removed = this.products.delete(productName);
        this.cache.delete(productName);

        if (removed) {
            console.log(`[PROXY] ✅ Product removed: ${productName}`);
        } else {
            console.log(`[PROXY] ⚠️ Product not found for removal: ${productName}`);
        }

        return removed;
    }

    updateProduct(productName, updates, userRole = 'user') {
        this.logAccess('updateProduct', productName, { userRole, updates });

        // Check permissions
        if (!this.hasPermission(userRole, 'write')) {
            console.log(`[PROXY] 🚫 Access denied: ${userRole} cannot update products`);
            throw new Error('Insufficient permissions to update products');
        }

        if (!this.products.has(productName)) {
            console.log(`[PROXY] ⚠️ Product not found for update: ${productName}`);
            return false;
        }

        const product = this.products.get(productName);

        // Apply updates
        Object.assign(product, updates);

        // Invalidate cache
        this.cache.delete(productName);

        console.log(`[PROXY] ✅ Product updated: ${productName}`);
        return true;
    }

    // ===========================================
    // SECURITY & PERMISSIONS
    // ===========================================

    setPermissions(role, permissions) {
        this.securityRules.set(role, permissions);
        console.log(`[PROXY] 🔐 Permissions set for role '${role}': ${permissions.join(', ')}`);
    }

    hasPermission(role, action) {
        const permissions = this.securityRules.get(role) || ['read'];
        return permissions.includes(action);
    }

    // Initialize default permissions
    initializeDefaultPermissions() {
        this.setPermissions('user', ['read']);
        this.setPermissions('admin', ['read', 'write', 'delete']);
        this.setPermissions('moderator', ['read', 'write']);
    }

    // ===========================================
    // LOGGING & MONITORING
    // ===========================================

    logAccess(method, resource, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            method,
            resource,
            details
        };

        this.accessLog.push(logEntry);

        // Keep only last 1000 log entries
        if (this.accessLog.length > 1000) {
            this.accessLog = this.accessLog.slice(-1000);
        }
    }

    getAccessLog(limit = 10) {
        return this.accessLog.slice(-limit).reverse();
    }

    getAccessStats() {
        const stats = {};
        this.accessLog.forEach(log => {
            stats[log.method] = (stats[log.method] || 0) + 1;
        });

        return {
            totalRequests: this.accessLog.length,
            methodBreakdown: stats,
            mostRequestedProducts: this.getMostRequestedProducts()
        };
    }

    getMostRequestedProducts() {
        const productRequests = {};
        this.accessLog.forEach(log => {
            if (log.method === 'getProduct') {
                productRequests[log.resource] = (productRequests[log.resource] || 0) + 1;
            }
        });

        return Object.entries(productRequests)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([product, count]) => ({ product, requests: count }));
    }

    // ===========================================
    // UTILITY METHODS
    // ===========================================

    async simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getAllProducts() {
        this.logAccess('getAllProducts', 'all');
        return Array.from(this.products.values());
    }

    getProductCount() {
        return this.products.size;
    }

    // Health check method
    healthCheck() {
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            products: this.products.size,
            cacheSize: this.cache.size,
            accessLogs: this.accessLog.length,
            uptime: process.uptime()
        };
    }
}

// ===========================================
// LAZY LOADING PROXY
// ===========================================

class LazyLoadingProxy {
    constructor(resourceLoader) {
        this.resourceLoader = resourceLoader;
        this.loadedResources = new Map();
        this.loadingPromises = new Map();
    }

    async getResource(resourceId) {
        // Return if already loaded
        if (this.loadedResources.has(resourceId)) {
            console.log(`[LAZY PROXY] ✅ Resource already loaded: ${resourceId}`);
            return this.loadedResources.get(resourceId);
        }

        // Check if currently loading
        if (this.loadingPromises.has(resourceId)) {
            console.log(`[LAZY PROXY] ⏳ Resource currently loading: ${resourceId}`);
            return this.loadingPromises.get(resourceId);
        }

        // Start loading
        console.log(`[LAZY PROXY] 📥 Loading resource: ${resourceId}`);
        const loadingPromise = this.resourceLoader(resourceId)
            .then(resource => {
                this.loadedResources.set(resourceId, resource);
                this.loadingPromises.delete(resourceId);
                console.log(`[LAZY PROXY] ✅ Resource loaded: ${resourceId}`);
                return resource;
            })
            .catch(error => {
                this.loadingPromises.delete(resourceId);
                console.log(`[LAZY PROXY] ❌ Failed to load resource: ${resourceId}`);
                throw error;
            });

        this.loadingPromises.set(resourceId, loadingPromise);
        return loadingPromise;
    }

    isLoaded(resourceId) {
        return this.loadedResources.has(resourceId);
    }

    unloadResource(resourceId) {
        this.loadedResources.delete(resourceId);
        console.log(`[LAZY PROXY] 🗑️ Resource unloaded: ${resourceId}`);
    }

    getLoadedResources() {
        return Array.from(this.loadedResources.keys());
    }
}

module.exports = {
    ProductProxy,
    LazyLoadingProxy
};