// SINGLETON PATTERN IMPLEMENTATION
// Ensures a class has only one instance and provides global access to it
// Benefits: Controlled access to sole instance, reduced namespace pollution, permits refinement of operations

// ===========================================
// CONFIGURATION MANAGER SINGLETON
// ===========================================

class ConfigManager {
    constructor() {
        if (ConfigManager.instance) {
            return ConfigManager.instance;
        }

        // Initialize configuration data
        this.config = new Map();
        this.defaultConfig = {
            appName: 'Demo App',
            version: '1.0.0',
            debugMode: false,
            apiUrl: 'https://api.example.com',
            timeout: 5000,
            maxRetries: 3
        };

        // Set default configuration
        Object.entries(this.defaultConfig).forEach(([key, value]) => {
            this.config.set(key, value);
        });

        ConfigManager.instance = this;
        return this;
    }

    // Get singleton instance
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    // Set configuration value
    set(key, value) {
        this.config.set(key, value);
        if (this.get('debugMode')) {
            console.log(`[CONFIG] Set ${key} = ${value}`);
        }
    }

    // Get configuration value
    get(key) {
        return this.config.get(key);
    }

    // Get all configuration
    getAll() {
        return Object.fromEntries(this.config);
    }

    // Reset to defaults
    reset() {
        this.config.clear();
        Object.entries(this.defaultConfig).forEach(([key, value]) => {
            this.config.set(key, value);
        });
    }

    // Load configuration from object
    load(configObject) {
        Object.entries(configObject).forEach(([key, value]) => {
            this.set(key, value);
        });
    }

    // Check if configuration exists
    has(key) {
        return this.config.has(key);
    }

    // Delete configuration
    delete(key) {
        return this.config.delete(key);
    }
}

// ===========================================
// DATABASE CONNECTION SINGLETON
// ===========================================

class DatabaseConnection {
    constructor() {
        if (DatabaseConnection.instance) {
            return DatabaseConnection.instance;
        }

        this.isConnected = false;
        this.connectionId = Math.random().toString(36).substr(2, 9);
        this.queries = [];
        this.connectionTime = null;

        DatabaseConnection.instance = this;
        return this;
    }

    static getInstance() {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }

    // Simulate database connection
    async connect() {
        if (this.isConnected) {
            console.log(`[DB] Already connected (Connection ID: ${this.connectionId})`);
            return;
        }

        console.log(`[DB] Connecting to database...`);
        // Simulate connection delay
        await new Promise(resolve => setTimeout(resolve, 100));

        this.isConnected = true;
        this.connectionTime = new Date();
        console.log(`[DB] Connected successfully (Connection ID: ${this.connectionId})`);
    }

    // Simulate database query
    async query(sql, params = []) {
        if (!this.isConnected) {
            await this.connect();
        }

        const queryId = this.queries.length + 1;
        const query = { id: queryId, sql, params, timestamp: new Date() };
        this.queries.push(query);

        console.log(`[DB] Executing Query ${queryId}: ${sql}`);
        // Simulate query execution time
        await new Promise(resolve => setTimeout(resolve, 50));

        return { queryId, result: 'Query executed successfully' };
    }

    // Get connection info
    getConnectionInfo() {
        return {
            connectionId: this.connectionId,
            isConnected: this.isConnected,
            connectionTime: this.connectionTime,
            totalQueries: this.queries.length
        };
    }

    // Disconnect
    disconnect() {
        this.isConnected = false;
        this.connectionTime = null;
        console.log(`[DB] Disconnected (Connection ID: ${this.connectionId})`);
    }
}

// ===========================================
// APPLICATION LOGGER SINGLETON
// ===========================================

class Logger {
    constructor() {
        if (Logger.instance) {
            return Logger.instance;
        }

        this.logs = [];
        this.logLevel = 'INFO';
        this.maxLogs = 1000;

        Logger.instance = this;
        return this;
    }

    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    // Set log level
    setLogLevel(level) {
        this.logLevel = level.toUpperCase();
    }

    // Generic log method
    log(level, message, data = null) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            message,
            data
        };

        this.logs.push(logEntry);

        // Keep only the latest logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // Output to console
        const formattedMessage = `[${logEntry.timestamp}] ${logEntry.level}: ${message}`;
        console.log(formattedMessage, data || '');
    }

    // Convenience methods
    info(message, data) {
        this.log('INFO', message, data);
    }

    warn(message, data) {
        this.log('WARN', message, data);
    }

    error(message, data) {
        this.log('ERROR', message, data);
    }

    debug(message, data) {
        if (this.logLevel === 'DEBUG') {
            this.log('DEBUG', message, data);
        }
    }

    // Get logs
    getLogs(level = null) {
        if (level) {
            return this.logs.filter(log => log.level === level.toUpperCase());
        }
        return [...this.logs];
    }

    // Clear logs
    clearLogs() {
        this.logs = [];
    }

    // Get log statistics
    getStats() {
        const stats = {};
        this.logs.forEach(log => {
            stats[log.level] = (stats[log.level] || 0) + 1;
        });
        return stats;
    }
}

module.exports = {
    ConfigManager,
    DatabaseConnection,
    Logger
};