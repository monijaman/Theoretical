// FUNCTIONAL SINGLETON PATTERN
// Using closures and module pattern instead of classes
// Benefits: No global state, controlled access, immutable configuration

// ===========================================
// FUNCTIONAL CONFIGURATION MANAGER
// ===========================================

const createConfigManager = () => {
    // Private state (closure)
    let config = new Map();

    // Default configuration
    const defaultConfig = {
        appName: 'Functional Demo App',
        version: '1.0.0',
        debugMode: false,
        apiUrl: 'https://api.example.com',
        timeout: 5000,
        maxRetries: 3
    };

    // Initialize with defaults
    Object.entries(defaultConfig).forEach(([key, value]) => {
        config.set(key, value);
    });

    // Return public interface (singleton-like behavior)
    return {
        // Get configuration value (pure function)
        get: (key) => config.get(key),

        // Set configuration value
        set: (key, value) => {
            config.set(key, value);
            if (config.get('debugMode')) {
                console.log(`[CONFIG] Set ${key} = ${value}`);
            }
        },

        // Get all configuration (returns copy)
        getAll: () => Object.fromEntries(config),

        // Update multiple values at once
        update: (configObject) => {
            Object.entries(configObject).forEach(([key, value]) => {
                config.set(key, value);
            });
        },

        // Reset to defaults
        reset: () => {
            config.clear();
            Object.entries(defaultConfig).forEach(([key, value]) => {
                config.set(key, value);
            });
        },

        // Check if key exists
        has: (key) => config.has(key),

        // Delete configuration
        delete: (key) => config.delete(key),

        // Create a snapshot (immutable copy)
        snapshot: () => ({ ...Object.fromEntries(config) })
    };
};

// ===========================================
// FUNCTIONAL DATABASE CONNECTION
// ===========================================

const createDatabaseConnection = () => {
    // Private connection state
    let connectionState = {
        isConnected: false,
        connectionId: Math.random().toString(36).substr(2, 9),
        queries: [],
        connectionTime: null
    };

    // Connection interface
    return {
        // Connect to database
        connect: async () => {
            if (connectionState.isConnected) {
                console.log(`[DB] Already connected (ID: ${connectionState.connectionId})`);
                return connectionState.connectionId;
            }

            console.log('[DB] Connecting to database...');
            // Simulate connection delay
            await new Promise(resolve => setTimeout(resolve, 100));

            connectionState = {
                ...connectionState,
                isConnected: true,
                connectionTime: new Date().toISOString()
            };

            console.log(`[DB] Connected successfully (ID: ${connectionState.connectionId})`);
            return connectionState.connectionId;
        },

        // Execute query (pure function approach)
        query: async (sql, params = []) => {
            if (!connectionState.isConnected) {
                await exports.connect();
            }

            const queryId = connectionState.queries.length + 1;
            const query = {
                id: queryId,
                sql,
                params,
                timestamp: new Date().toISOString()
            };

            // Create new state with added query (immutable)
            connectionState = {
                ...connectionState,
                queries: [...connectionState.queries, query]
            };

            console.log(`[DB] Executing Query ${queryId}: ${sql}`);
            await new Promise(resolve => setTimeout(resolve, 50));

            return { queryId, result: 'Query executed successfully' };
        },

        // Get connection info (returns copy)
        getInfo: () => ({
            connectionId: connectionState.connectionId,
            isConnected: connectionState.isConnected,
            connectionTime: connectionState.connectionTime,
            totalQueries: connectionState.queries.length
        }),

        // Disconnect
        disconnect: () => {
            connectionState = {
                ...connectionState,
                isConnected: false,
                connectionTime: null
            };
            console.log(`[DB] Disconnected (ID: ${connectionState.connectionId})`);
        },

        // Get query history (returns copy)
        getQueryHistory: () => [...connectionState.queries]
    };
};

// ===========================================
// FUNCTIONAL LOGGER
// ===========================================

const createLogger = () => {
    // Private logger state
    let loggerState = {
        logs: [],
        logLevel: 'INFO',
        maxLogs: 1000
    };

    // Log levels hierarchy
    const logLevels = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    };

    // Helper function to check if level should be logged
    const shouldLog = (level) => {
        return logLevels[level] >= logLevels[loggerState.logLevel];
    };

    // Core logging function (pure)
    const createLogEntry = (level, message, data = null) => ({
        timestamp: new Date().toISOString(),
        level: level.toUpperCase(),
        message,
        data
    });

    // Logger interface
    return {
        // Set log level
        setLogLevel: (level) => {
            loggerState = {
                ...loggerState,
                logLevel: level.toUpperCase()
            };
        },

        // Generic log method
        log: (level, message, data = null) => {
            if (!shouldLog(level.toUpperCase())) {
                return;
            }

            const logEntry = createLogEntry(level, message, data);

            // Create new state with added log (immutable)
            loggerState = {
                ...loggerState,
                logs: [...loggerState.logs.slice(-(loggerState.maxLogs - 1)), logEntry]
            };

            // Output to console
            const formattedMessage = `[${logEntry.timestamp}] ${logEntry.level}: ${message}`;
            console.log(formattedMessage, data || '');
        },

        // Convenience methods
        debug: (message, data) => exports.log('DEBUG', message, data),
        info: (message, data) => exports.log('INFO', message, data),
        warn: (message, data) => exports.log('WARN', message, data),
        error: (message, data) => exports.log('ERROR', message, data),

        // Get logs (returns copy)
        getLogs: (level = null) => {
            const logs = [...loggerState.logs];
            if (level) {
                return logs.filter(log => log.level === level.toUpperCase());
            }
            return logs;
        },

        // Clear logs
        clearLogs: () => {
            loggerState = {
                ...loggerState,
                logs: []
            };
        },

        // Get statistics (pure function)
        getStats: () => {
            const stats = {};
            loggerState.logs.forEach(log => {
                stats[log.level] = (stats[log.level] || 0) + 1;
            });
            return {
                totalLogs: loggerState.logs.length,
                currentLevel: loggerState.logLevel,
                breakdown: stats
            };
        },

        // Create child logger with prefix
        createChild: (prefix) => {
            const childLogger = createLogger();
            // Override log method to add prefix
            const originalLog = childLogger.log;
            childLogger.log = (level, message, data) => {
                originalLog(level, `[${prefix}] ${message}`, data);
            };
            return childLogger;
        }
    };
};

// ===========================================
// FUNCTIONAL CACHE MANAGER
// ===========================================

const createCacheManager = () => {
    // Private cache state
    let cacheState = {
        cache: new Map(),
        stats: {
            hits: 0,
            misses: 0,
            sets: 0
        },
        maxSize: 1000,
        ttl: 5 * 60 * 1000 // 5 minutes default TTL
    };

    // Helper function to check if item is expired
    const isExpired = (item) => {
        return Date.now() > item.expiresAt;
    };

    // Cache interface
    return {
        // Set cache item
        set: (key, value, ttl = cacheState.ttl) => {
            const item = {
                value,
                createdAt: Date.now(),
                expiresAt: Date.now() + ttl
            };

            // Create new cache state
            const newCache = new Map(cacheState.cache);
            newCache.set(key, item);

            // Enforce max size (LRU-style)
            if (newCache.size > cacheState.maxSize) {
                const firstKey = newCache.keys().next().value;
                newCache.delete(firstKey);
            }

            cacheState = {
                ...cacheState,
                cache: newCache,
                stats: {
                    ...cacheState.stats,
                    sets: cacheState.stats.sets + 1
                }
            };

            console.log(`[CACHE] Set ${key}`);
        },

        // Get cache item
        get: (key) => {
            const item = cacheState.cache.get(key);

            if (!item) {
                cacheState = {
                    ...cacheState,
                    stats: {
                        ...cacheState.stats,
                        misses: cacheState.stats.misses + 1
                    }
                };
                console.log(`[CACHE] Miss: ${key}`);
                return null;
            }

            if (isExpired(item)) {
                // Remove expired item
                const newCache = new Map(cacheState.cache);
                newCache.delete(key);
                cacheState = {
                    ...cacheState,
                    cache: newCache,
                    stats: {
                        ...cacheState.stats,
                        misses: cacheState.stats.misses + 1
                    }
                };
                console.log(`[CACHE] Expired: ${key}`);
                return null;
            }

            cacheState = {
                ...cacheState,
                stats: {
                    ...cacheState.stats,
                    hits: cacheState.stats.hits + 1
                }
            };

            console.log(`[CACHE] Hit: ${key}`);
            return item.value;
        },

        // Delete cache item
        delete: (key) => {
            const newCache = new Map(cacheState.cache);
            const deleted = newCache.delete(key);

            if (deleted) {
                cacheState = {
                    ...cacheState,
                    cache: newCache
                };
                console.log(`[CACHE] Deleted: ${key}`);
            }

            return deleted;
        },

        // Clear all cache
        clear: () => {
            const size = cacheState.cache.size;
            cacheState = {
                ...cacheState,
                cache: new Map()
            };
            console.log(`[CACHE] Cleared ${size} items`);
        },

        // Get cache statistics
        getStats: () => ({
            ...cacheState.stats,
            size: cacheState.cache.size,
            hitRate: cacheState.stats.hits / (cacheState.stats.hits + cacheState.stats.misses) || 0
        }),

        // Clean expired items
        cleanup: () => {
            const newCache = new Map();
            let cleaned = 0;

            for (const [key, item] of cacheState.cache) {
                if (!isExpired(item)) {
                    newCache.set(key, item);
                } else {
                    cleaned++;
                }
            }

            cacheState = {
                ...cacheState,
                cache: newCache
            };

            console.log(`[CACHE] Cleaned ${cleaned} expired items`);
            return cleaned;
        }
    };
};

module.exports = {
    createConfigManager,
    createDatabaseConnection,
    createLogger,
    createCacheManager
};