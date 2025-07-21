// FUNCTIONAL PROXY PATTERN
// Using function wrappers and closures instead of proxy classes
// Benefits: Function composition, controlled access, transparent caching

// ===========================================
// FUNCTIONAL PRODUCT PROXY
// ===========================================

const createProductProxy = (products = []) => {
    // Private state (closure)
    let proxyState = {
        products: new Map(),
        cache: new Map(),
        accessLog: [],
        securityRules: new Map(),
        maxCacheSize: 100,
        cacheStats: { hits: 0, misses: 0 }
    };

    // Initialize products
    products.forEach(product => {
        proxyState.products.set(product.name, product);
    });

    // Helper functions (pure)
    const logAccess = (method, resource, details = {}) => {
        const logEntry = {
            timestamp: new Date().toISOString(),
            method,
            resource,
            details
        };

        proxyState = {
            ...proxyState,
            accessLog: [...proxyState.accessLog.slice(-999), logEntry] // Keep last 1000
        };
    };

    const simulateDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const hasPermission = (userRole, action) => {
        const permissions = proxyState.securityRules.get(userRole) || ['read'];
        return permissions.includes(action);
    };

    // Cache management functions
    const getCacheKey = (productName) => `product:${productName}`;

    const addToCache = (key, value) => {
        const newCache = new Map(proxyState.cache);

        // Enforce cache size limit (LRU-style)
        if (newCache.size >= proxyState.maxCacheSize) {
            const firstKey = newCache.keys().next().value;
            newCache.delete(firstKey);
        }

        newCache.set(key, {
            value,
            timestamp: Date.now(),
            accessCount: 1
        });

        proxyState = {
            ...proxyState,
            cache: newCache
        };

        console.log(`[PROXY] 💾 Cached: ${key}`);
    };

    const getFromCache = (key) => {
        const cacheEntry = proxyState.cache.get(key);

        if (cacheEntry) {
            // Update access count
            const newCache = new Map(proxyState.cache);
            newCache.set(key, {
                ...cacheEntry,
                accessCount: cacheEntry.accessCount + 1
            });

            proxyState = {
                ...proxyState,
                cache: newCache,
                cacheStats: {
                    ...proxyState.cacheStats,
                    hits: proxyState.cacheStats.hits + 1
                }
            };

            return cacheEntry.value;
        }

        proxyState = {
            ...proxyState,
            cacheStats: {
                ...proxyState.cacheStats,
                misses: proxyState.cacheStats.misses + 1
            }
        };

        return null;
    };

    // Public interface
    return {
        // Get product with caching
        getProduct: async (productName) => {
            console.log(`[PROXY] Request for product: ${productName}`);
            logAccess('getProduct', productName);

            // Check cache first
            const cacheKey = getCacheKey(productName);
            const cached = getFromCache(cacheKey);

            if (cached) {
                console.log(`[PROXY] ✅ Cache HIT for ${productName}`);
                return cached;
            }

            console.log(`[PROXY] ❌ Cache MISS for ${productName}`);

            // Simulate database/API call delay
            await simulateDelay(100);

            // Check if product exists
            if (!proxyState.products.has(productName)) {
                console.log(`[PROXY] ⚠️ Product not found: ${productName}`);
                return null;
            }

            // Get product from "database"
            const product = proxyState.products.get(productName);
            console.log(`[PROXY] 📦 Fetched from database: ${productName}`);

            // Cache the result
            addToCache(cacheKey, product);

            return product;
        },

        // Add product with access control
        addProduct: (product, userRole = 'user') => {
            logAccess('addProduct', product.name, { userRole });

            // Check permissions
            if (!hasPermission(userRole, 'write')) {
                console.log(`[PROXY] 🚫 Access denied: ${userRole} cannot add products`);
                throw new Error('Insufficient permissions to add products');
            }

            proxyState = {
                ...proxyState,
                products: new Map(proxyState.products).set(product.name, product)
            };

            // Invalidate cache for this product
            const cacheKey = getCacheKey(product.name);
            const newCache = new Map(proxyState.cache);
            newCache.delete(cacheKey);
            proxyState = { ...proxyState, cache: newCache };

            console.log(`[PROXY] ✅ Product added: ${product.name}`);
            return true;
        },

        // Remove product with access control
        removeProduct: (productName, userRole = 'user') => {
            logAccess('removeProduct', productName, { userRole });

            // Check permissions
            if (!hasPermission(userRole, 'delete')) {
                console.log(`[PROXY] 🚫 Access denied: ${userRole} cannot remove products`);
                throw new Error('Insufficient permissions to remove products');
            }

            const newProducts = new Map(proxyState.products);
            const removed = newProducts.delete(productName);

            if (removed) {
                proxyState = { ...proxyState, products: newProducts };

                // Invalidate cache
                const cacheKey = getCacheKey(productName);
                const newCache = new Map(proxyState.cache);
                newCache.delete(cacheKey);
                proxyState = { ...proxyState, cache: newCache };

                console.log(`[PROXY] ✅ Product removed: ${productName}`);
            } else {
                console.log(`[PROXY] ⚠️ Product not found for removal: ${productName}`);
            }

            return removed;
        },

        // Set permissions for roles
        setPermissions: (role, permissions) => {
            proxyState = {
                ...proxyState,
                securityRules: new Map(proxyState.securityRules).set(role, permissions)
            };
            console.log(`[PROXY] 🔐 Permissions set for role '${role}': ${permissions.join(', ')}`);
        },

        // Initialize default permissions
        initializeDefaultPermissions: () => {
            const defaultRules = new Map([
                ['user', ['read']],
                ['admin', ['read', 'write', 'delete']],
                ['moderator', ['read', 'write']]
            ]);

            proxyState = { ...proxyState, securityRules: defaultRules };
            console.log('[PROXY] 🔐 Default permissions initialized');
        },

        // Get all products
        getAllProducts: () => {
            logAccess('getAllProducts', 'all');
            return Array.from(proxyState.products.values());
        },

        // Clear cache
        clearCache: () => {
            const cacheSize = proxyState.cache.size;
            proxyState = { ...proxyState, cache: new Map() };
            console.log(`[PROXY] 🗑️ Cache cleared (${cacheSize} items removed)`);
        },

        // Get cache statistics
        getCacheStats: () => {
            const totalRequests = proxyState.cacheStats.hits + proxyState.cacheStats.misses;
            return {
                cacheSize: proxyState.cache.size,
                hits: proxyState.cacheStats.hits,
                misses: proxyState.cacheStats.misses,
                totalRequests,
                hitRate: totalRequests > 0 ? ((proxyState.cacheStats.hits / totalRequests) * 100).toFixed(2) + '%' : '0%'
            };
        },

        // Get access log
        getAccessLog: (limit = 10) => {
            return proxyState.accessLog.slice(-limit).reverse();
        },

        // Get access statistics
        getAccessStats: () => {
            const stats = {};
            proxyState.accessLog.forEach(log => {
                stats[log.method] = (stats[log.method] || 0) + 1;
            });

            return {
                totalRequests: proxyState.accessLog.length,
                methodBreakdown: stats,
                mostRequestedProducts: getMostRequestedProducts()
            };
        },

        // Health check
        healthCheck: () => ({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            products: proxyState.products.size,
            cacheSize: proxyState.cache.size,
            accessLogs: proxyState.accessLog.length
        })
    };

    // Helper function for statistics
    function getMostRequestedProducts() {
        const productRequests = {};
        proxyState.accessLog.forEach(log => {
            if (log.method === 'getProduct') {
                productRequests[log.resource] = (productRequests[log.resource] || 0) + 1;
            }
        });

        return Object.entries(productRequests)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([product, count]) => ({ product, requests: count }));
    }
};

// ===========================================
// FUNCTIONAL LAZY LOADING PROXY
// ===========================================

const createLazyLoadingProxy = (resourceLoader) => {
    // Private state
    let proxyState = {
        loadedResources: new Map(),
        loadingPromises: new Map(),
        loadAttempts: new Map()
    };

    return {
        // Get resource with lazy loading
        getResource: async (resourceId) => {
            // Return if already loaded
            if (proxyState.loadedResources.has(resourceId)) {
                console.log(`[LAZY PROXY] ✅ Resource already loaded: ${resourceId}`);
                return proxyState.loadedResources.get(resourceId);
            }

            // Check if currently loading
            if (proxyState.loadingPromises.has(resourceId)) {
                console.log(`[LAZY PROXY] ⏳ Resource currently loading: ${resourceId}`);
                return proxyState.loadingPromises.get(resourceId);
            }

            // Start loading
            console.log(`[LAZY PROXY] 📥 Loading resource: ${resourceId}`);

            const attempts = proxyState.loadAttempts.get(resourceId) || 0;
            proxyState = {
                ...proxyState,
                loadAttempts: new Map(proxyState.loadAttempts).set(resourceId, attempts + 1)
            };

            const loadingPromise = resourceLoader(resourceId)
                .then(resource => {
                    // Update state immutably
                    proxyState = {
                        ...proxyState,
                        loadedResources: new Map(proxyState.loadedResources).set(resourceId, resource),
                        loadingPromises: (() => {
                            const newMap = new Map(proxyState.loadingPromises);
                            newMap.delete(resourceId);
                            return newMap;
                        })()
                    };

                    console.log(`[LAZY PROXY] ✅ Resource loaded: ${resourceId}`);
                    return resource;
                })
                .catch(error => {
                    // Remove from loading promises on error
                    proxyState = {
                        ...proxyState,
                        loadingPromises: (() => {
                            const newMap = new Map(proxyState.loadingPromises);
                            newMap.delete(resourceId);
                            return newMap;
                        })()
                    };

                    console.log(`[LAZY PROXY] ❌ Failed to load resource: ${resourceId}`);
                    throw error;
                });

            // Store loading promise
            proxyState = {
                ...proxyState,
                loadingPromises: new Map(proxyState.loadingPromises).set(resourceId, loadingPromise)
            };

            return loadingPromise;
        },

        // Check if resource is loaded
        isLoaded: (resourceId) => proxyState.loadedResources.has(resourceId),

        // Unload resource
        unloadResource: (resourceId) => {
            const newLoadedResources = new Map(proxyState.loadedResources);
            const deleted = newLoadedResources.delete(resourceId);

            if (deleted) {
                proxyState = { ...proxyState, loadedResources: newLoadedResources };
                console.log(`[LAZY PROXY] 🗑️ Resource unloaded: ${resourceId}`);
            }

            return deleted;
        },

        // Get loaded resources
        getLoadedResources: () => Array.from(proxyState.loadedResources.keys()),

        // Get loading statistics
        getStats: () => ({
            loadedCount: proxyState.loadedResources.size,
            currentlyLoading: proxyState.loadingPromises.size,
            loadAttempts: Object.fromEntries(proxyState.loadAttempts)
        }),

        // Preload resources
        preload: async (resourceIds) => {
            const loadPromises = resourceIds.map(id => exports.getResource(id));
            const results = await Promise.allSettled(loadPromises);

            return results.map((result, index) => ({
                resourceId: resourceIds[index],
                success: result.status === 'fulfilled',
                error: result.status === 'rejected' ? result.reason.message : null
            }));
        }
    };
};

// ===========================================
// FUNCTIONAL CACHING PROXY
// ===========================================

const createCachingProxy = (targetFunction, options = {}) => {
    const {
        maxCacheSize = 100,
        ttl = 5 * 60 * 1000, // 5 minutes
        keyGenerator = (...args) => JSON.stringify(args)
    } = options;

    // Private cache state
    let cacheState = {
        cache: new Map(),
        stats: { hits: 0, misses: 0, evictions: 0 }
    };

    // Cache cleanup function
    const cleanup = () => {
        const now = Date.now();
        const newCache = new Map();
        let evicted = 0;

        for (const [key, entry] of cacheState.cache) {
            if (now - entry.timestamp < ttl) {
                newCache.set(key, entry);
            } else {
                evicted++;
            }
        }

        cacheState = {
            ...cacheState,
            cache: newCache,
            stats: {
                ...cacheState.stats,
                evictions: cacheState.stats.evictions + evicted
            }
        };

        if (evicted > 0) {
            console.log(`[CACHE PROXY] Evicted ${evicted} expired entries`);
        }
    };

    // Proxied function
    const proxiedFunction = async (...args) => {
        const key = keyGenerator(...args);

        // Cleanup expired entries
        cleanup();

        // Check cache
        const cached = cacheState.cache.get(key);
        if (cached) {
            cacheState = {
                ...cacheState,
                stats: { ...cacheState.stats, hits: cacheState.stats.hits + 1 }
            };
            console.log(`[CACHE PROXY] Cache hit for key: ${key}`);
            return cached.value;
        }

        // Cache miss - call target function
        cacheState = {
            ...cacheState,
            stats: { ...cacheState.stats, misses: cacheState.stats.misses + 1 }
        };
        console.log(`[CACHE PROXY] Cache miss for key: ${key}`);

        const result = await targetFunction(...args);

        // Add to cache
        const newCache = new Map(cacheState.cache);

        // Enforce cache size limit (LRU)
        if (newCache.size >= maxCacheSize) {
            const firstKey = newCache.keys().next().value;
            newCache.delete(firstKey);
        }

        newCache.set(key, {
            value: result,
            timestamp: Date.now()
        });

        cacheState = { ...cacheState, cache: newCache };

        return result;
    };

    // Add cache management methods
    proxiedFunction.clearCache = () => {
        const size = cacheState.cache.size;
        cacheState = { ...cacheState, cache: new Map() };
        console.log(`[CACHE PROXY] Cache cleared (${size} entries)`);
    };

    proxiedFunction.getCacheStats = () => ({
        size: cacheState.cache.size,
        maxSize: maxCacheSize,
        ttl: ttl,
        ...cacheState.stats,
        hitRate: cacheState.stats.hits / (cacheState.stats.hits + cacheState.stats.misses) || 0
    });

    return proxiedFunction;
};

module.exports = {
    createProductProxy,
    createLazyLoadingProxy,
    createCachingProxy
};