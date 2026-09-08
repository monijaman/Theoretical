// FUNCTIONAL PROXY PATTERN
// ===========================================
// WHAT IT IS:
// The Proxy pattern provides a placeholder or surrogate for another object
// to control access to it. It can add functionality like caching, logging,
// access control, or lazy loading without changing the original object.
//
// WHAT IT'S DOING IN THIS APP:
// - Controls access to bank card data with caching and security logging
// - Simulates secure banking API access with artificial delays
// - Implements intelligent caching to improve performance for card lookups
// - Provides transparent access control and transaction monitoring
// - Adds security layers and fraud detection without changing card objects
//
// FUNCTIONAL APPROACH BENEFITS:
// - Uses function wrappers and closures instead of proxy classes
// - Function composition for layering security and caching functionality
// - Controlled access through wrapper functions with role-based permissions
// - Transparent caching that's invisible to banking operations
// - Pure functions that maintain predictable and secure behavior
// ===========================================

// ===========================================
// FUNCTIONAL BANK CARD PROXY
// ===========================================

const createBankCardProxy = (cards = []) => {
    // Private state (closure) - Simulates secure bank database
    let proxyState = {
        cards: new Map(),
        cache: new Map(),
        accessLog: [],
        securityRules: new Map(),
        maxCacheSize: 50, // Smaller cache for security
        cacheStats: { hits: 0, misses: 0 },
        fraudAlerts: []
    };

    // Initialize cards in secure storage
    cards.forEach(card => {
        proxyState.cards.set(card.cardNumber, card);
    });

    // Helper functions (pure) - Banking security focused
    const logAccess = (method, resource, details = {}) => {
        const logEntry = {
            timestamp: new Date().toISOString(),
            method,
            resource: method.includes('Card') ? maskCardNumber(resource) : resource, // Mask sensitive data
            details: {
                ...details,
                userAgent: details.userAgent || 'BankingApp/1.0',
                ipAddress: details.ipAddress || '192.168.1.100'
            }
        };

        proxyState = {
            ...proxyState,
            accessLog: [...proxyState.accessLog.slice(-499), logEntry] // Keep last 500 for security audit
        };
    };

    // Utility to mask card numbers for logging (security)
    const maskCardNumber = (cardNumber) => {
        if (!cardNumber || cardNumber.length < 4) return '****';
        return '**** **** **** ' + cardNumber.slice(-4);
    };

    const simulateSecureBankingDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const hasPermission = (userRole, action) => {
        const permissions = proxyState.securityRules.get(userRole) || ['read'];
        return permissions.includes(action);
    };

    const detectSuspiciousActivity = (cardNumber, action) => {
        // Simple fraud detection: Check for too many requests in short time
        const recentLogs = proxyState.accessLog.filter(log =>
            Date.now() - new Date(log.timestamp).getTime() < 60000 && // Last minute
            log.resource.includes(cardNumber.slice(-4))
        );

        if (recentLogs.length > 5) {
            const alert = {
                timestamp: new Date().toISOString(),
                cardNumber: maskCardNumber(cardNumber),
                action,
                reason: 'Excessive requests detected',
                severity: 'HIGH'
            };

            proxyState = {
                ...proxyState,
                fraudAlerts: [...proxyState.fraudAlerts.slice(-99), alert]
            };

            console.log(`[FRAUD ALERT] 🚨 Suspicious activity detected for card ${maskCardNumber(cardNumber)}`);
            return true;
        }
        return false;
    };

    // Cache management functions - Banking specific
    const getCacheKey = (cardNumber) => `card:${cardNumber.slice(-4)}`; // Only use last 4 digits for security

    const addToCache = (key, value) => {
        const newCache = new Map(proxyState.cache);

        // Enforce stricter cache size limit for banking security
        if (newCache.size >= proxyState.maxCacheSize) {
            const firstKey = newCache.keys().next().value;
            newCache.delete(firstKey);
        }

        // Cache with shorter TTL for banking data
        newCache.set(key, {
            value,
            timestamp: Date.now(),
            accessCount: 1,
            ttl: 30000 // 30 seconds TTL for security
        });

        proxyState = {
            ...proxyState,
            cache: newCache
        };

        console.log(`[BANK PROXY] 💾 Cached: ${key}`);
    };

    const getFromCache = (key) => {
        const cacheEntry = proxyState.cache.get(key);

        if (cacheEntry) {
            // Check if cache entry has expired (banking security)
            if (Date.now() - cacheEntry.timestamp > cacheEntry.ttl) {
                const newCache = new Map(proxyState.cache);
                newCache.delete(key);
                proxyState = { ...proxyState, cache: newCache };
                console.log(`[BANK PROXY] ⏰ Cache expired for ${key}`);
                return null;
            }

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

    // Helper function for statistics
    const getMostAccessedCards = () => {
        const cardRequests = {};
        proxyState.accessLog.forEach(log => {
            if (log.method === 'getCard') {
                const maskedCard = log.resource;
                cardRequests[maskedCard] = (cardRequests[maskedCard] || 0) + 1;
            }
        });

        return Object.entries(cardRequests)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([card, count]) => ({ card, requests: count }));
    };

    // Public interface - Banking operations
    return {
        // Get card details with caching and fraud detection
        getCard: async (cardNumber) => {
            console.log(`[BANK PROXY] Request for card: ${maskCardNumber(cardNumber)}`);

            // Fraud detection
            if (detectSuspiciousActivity(cardNumber, 'getCard')) {
                throw new Error('Account temporarily locked due to suspicious activity');
            }

            logAccess('getCard', cardNumber);

            // Check cache first
            const cacheKey = getCacheKey(cardNumber);
            const cached = getFromCache(cacheKey);

            if (cached) {
                console.log(`[BANK PROXY] ✅ Cache HIT for ${maskCardNumber(cardNumber)}`);
                return cached;
            }

            console.log(`[BANK PROXY] ❌ Cache MISS for ${maskCardNumber(cardNumber)}`);

            // Simulate secure banking API call delay
            await simulateSecureBankingDelay(150);

            // Check if card exists in secure database
            if (!proxyState.cards.has(cardNumber)) {
                console.log(`[BANK PROXY] ⚠️ Card not found: ${maskCardNumber(cardNumber)}`);
                logAccess('cardNotFound', cardNumber, { severity: 'MEDIUM' });
                return null;
            }

            // Get card from secure "database"
            const card = proxyState.cards.get(cardNumber);
            console.log(`[BANK PROXY] ✅ Fetched from secure database: ${maskCardNumber(cardNumber)}`);

            // Cache the result with security considerations
            addToCache(cacheKey, card);

            return card;
        },

        // Add new card with strict access control
        addCard: (card, userRole = 'user') => {
            logAccess('addCard', card.cardNumber, { userRole });

            // Check permissions - Only admins can add cards
            if (!hasPermission(userRole, 'write')) {
                console.log(`[BANK PROXY] 🚫 Access denied: ${userRole} cannot add cards`);
                throw new Error('Insufficient permissions to add cards');
            }

            proxyState = {
                ...proxyState,
                cards: new Map(proxyState.cards).set(card.cardNumber, card)
            };

            // Invalidate cache for this card
            const cacheKey = getCacheKey(card.cardNumber);
            const newCache = new Map(proxyState.cache);
            newCache.delete(cacheKey);
            proxyState = { ...proxyState, cache: newCache };

            console.log(`[BANK PROXY] ✅ Card added: ${maskCardNumber(card.cardNumber)}`);
            return true;
        },

        // Block/remove card with strict access control
        blockCard: (cardNumber, userRole = 'user') => {
            logAccess('blockCard', cardNumber, { userRole });

            // Check permissions - Only admins and security can block cards
            if (!hasPermission(userRole, 'block')) {
                console.log(`[BANK PROXY] 🚫 Access denied: ${userRole} cannot block cards`);
                throw new Error('Insufficient permissions to block cards');
            }

            const card = proxyState.cards.get(cardNumber);
            if (card) {
                // Instead of deleting, mark as blocked
                const blockedCard = { ...card, status: 'BLOCKED', blockedAt: new Date().toISOString() };
                proxyState = {
                    ...proxyState,
                    cards: new Map(proxyState.cards).set(cardNumber, blockedCard)
                };

                // Invalidate cache
                const cacheKey = getCacheKey(cardNumber);
                const newCache = new Map(proxyState.cache);
                newCache.delete(cacheKey);
                proxyState = { ...proxyState, cache: newCache };

                console.log(`[BANK PROXY] 🔒 Card blocked: ${maskCardNumber(cardNumber)}`);
                return true;
            } else {
                console.log(`[BANK PROXY] ⚠️ Card not found for blocking: ${maskCardNumber(cardNumber)}`);
                return false;
            }
        },

        // Set permissions for roles (Banking specific)
        setPermissions: (role, permissions) => {
            proxyState = {
                ...proxyState,
                securityRules: new Map(proxyState.securityRules).set(role, permissions)
            };
            console.log(`[BANK PROXY] 🔐 Permissions set for role '${role}': ${permissions.join(', ')}`);
        },

        // Initialize banking security permissions
        initializeBankingPermissions: () => {
            const bankingRules = new Map([
                ['customer', ['read']], // Customers can only view their own cards
                ['teller', ['read', 'view_balance']], // Tellers can view cards and balances
                ['admin', ['read', 'write', 'block']], // Admins can manage cards
                ['security', ['read', 'block', 'audit']] // Security can view and block
            ]);

            proxyState = { ...proxyState, securityRules: bankingRules };
            console.log('[BANK PROXY] 🔐 Banking security permissions initialized');
        },

        // Get all cards (masked for security)
        getAllCards: (userRole = 'user') => {
            logAccess('getAllCards', 'all', { userRole });

            if (!hasPermission(userRole, 'read')) {
                throw new Error('Insufficient permissions to view cards');
            }

            // Return masked version for security
            return Array.from(proxyState.cards.values()).map(card => ({
                ...card,
                cardNumber: maskCardNumber(card.cardNumber),
                cvv: '***' // Never expose CVV
            }));
        },

        // Validate card for transaction
        validateCard: async (cardNumber, cvv) => {
            console.log(`[BANK PROXY] Validating card: ${maskCardNumber(cardNumber)}`);
            logAccess('validateCard', cardNumber);

            // Fraud detection
            if (detectSuspiciousActivity(cardNumber, 'validateCard')) {
                throw new Error('Account temporarily locked due to suspicious activity');
            }

            // Get card directly from secure storage for validation
            const card = proxyState.cards.get(cardNumber);
            if (!card) {
                return { valid: false, reason: 'Card not found' };
            }

            if (card.status === 'BLOCKED') {
                return { valid: false, reason: 'Card is blocked' };
            }

            if (card.cvv !== cvv) {
                console.log(`[BANK PROXY] 🚫 Invalid CVV for ${maskCardNumber(cardNumber)}`);
                return { valid: false, reason: 'Invalid CVV' };
            }

            if (new Date(card.expiryDate) < new Date()) {
                return { valid: false, reason: 'Card expired' };
            }

            console.log(`[BANK PROXY] ✅ Card validated: ${maskCardNumber(cardNumber)}`);
            return { valid: true, reason: 'Card is valid' };
        },

        // Clear cache
        clearCache: () => {
            const cacheSize = proxyState.cache.size;
            proxyState = { ...proxyState, cache: new Map() };
            console.log(`[BANK PROXY] 🗑️ Security cache cleared (${cacheSize} items removed)`);
        },

        // Get cache statistics
        getCacheStats: () => {
            const totalRequests = proxyState.cacheStats.hits + proxyState.cacheStats.misses;
            return {
                cacheSize: proxyState.cache.size,
                maxCacheSize: proxyState.maxCacheSize,
                hits: proxyState.cacheStats.hits,
                misses: proxyState.cacheStats.misses,
                totalRequests,
                hitRate: totalRequests > 0 ? ((proxyState.cacheStats.hits / totalRequests) * 100).toFixed(2) + '%' : '0%'
            };
        },

        // Get fraud alerts
        getFraudAlerts: (userRole = 'user') => {
            if (!hasPermission(userRole, 'audit')) {
                throw new Error('Insufficient permissions to view fraud alerts');
            }
            return proxyState.fraudAlerts.slice(-10).reverse(); // Last 10 alerts
        },

        // Get access log (security audit)
        getAccessLog: (limit = 10, userRole = 'user') => {
            if (!hasPermission(userRole, 'audit')) {
                throw new Error('Insufficient permissions to view access logs');
            }
            return proxyState.accessLog.slice(-limit).reverse();
        },

        // Get access statistics
        getAccessStats: (userRole = 'user') => {
            if (!hasPermission(userRole, 'audit')) {
                throw new Error('Insufficient permissions to view access statistics');
            }

            const stats = {};
            proxyState.accessLog.forEach(log => {
                stats[log.method] = (stats[log.method] || 0) + 1;
            });

            return {
                totalRequests: proxyState.accessLog.length,
                methodBreakdown: stats,
                mostAccessedCards: getMostAccessedCards(),
                fraudAlerts: proxyState.fraudAlerts.length
            };
        },

        // Health check for banking system
        healthCheck: () => ({
            status: 'secure',
            timestamp: new Date().toISOString(),
            cards: proxyState.cards.size,
            activeCards: Array.from(proxyState.cards.values()).filter(card => card.status !== 'BLOCKED').length,
            cacheSize: proxyState.cache.size,
            accessLogs: proxyState.accessLog.length,
            fraudAlerts: proxyState.fraudAlerts.length
        })
    };
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
            const loadPromises = resourceIds.map(id => this.getResource(id));
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
    createBankCardProxy,
    createLazyLoadingProxy,
    createCachingProxy
};
