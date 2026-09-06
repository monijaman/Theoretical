// OBSERVER PATTERN IMPLEMENTATION
// Notifies subscribers about changes without coupling the subject to its observers
// Benefits: Loose coupling, dynamic relationships, broadcast communication

// ===========================================
// EVENT MANAGER (SUBJECT)
// ===========================================

class EventManager {
    constructor() {
        this.subscribers = new Map(); // eventType -> Set of observers
        this.eventHistory = [];
        this.maxHistorySize = 100;
    }

    // Subscribe to an event
    subscribe(eventType, observer) {
        if (typeof observer !== 'function') {
            throw new Error('Observer must be a function');
        }

        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, new Set());
        }

        this.subscribers.get(eventType).add(observer);
        console.log(`[OBSERVER] 📝 Subscribed to event: ${eventType}`);

        return () => this.unsubscribe(eventType, observer); // Return unsubscribe function
    }

    // Unsubscribe from an event
    unsubscribe(eventType, observer) {
        if (this.subscribers.has(eventType)) {
            const removed = this.subscribers.get(eventType).delete(observer);
            if (removed) {
                console.log(`[OBSERVER] ❌ Unsubscribed from event: ${eventType}`);
            }

            // Clean up empty event types
            if (this.subscribers.get(eventType).size === 0) {
                this.subscribers.delete(eventType);
            }

            return removed;
        }
        return false;
    }

    // Notify all subscribers of an event
    notify(eventType, data = {}) {
        const timestamp = new Date().toISOString();
        const eventData = { ...data, timestamp, eventType };

        // Add to history
        this.addToHistory(eventData);

        console.log(`[OBSERVER] 📡 Broadcasting event: ${eventType}`);

        if (this.subscribers.has(eventType)) {
            const observers = this.subscribers.get(eventType);
            let notifiedCount = 0;

            observers.forEach(observer => {
                try {
                    observer(eventData);
                    notifiedCount++;
                } catch (error) {
                    console.error(`[OBSERVER] ❌ Error in observer for ${eventType}:`, error.message);
                }
            });

            console.log(`[OBSERVER] ✅ Notified ${notifiedCount} observers for ${eventType}`);
        } else {
            console.log(`[OBSERVER] ⚠️ No subscribers for event: ${eventType}`);
        }

        return eventData;
    }

    // Subscribe once (auto-unsubscribe after first notification)
    once(eventType, observer) {
        const onceWrapper = (data) => {
            observer(data);
            this.unsubscribe(eventType, onceWrapper);
        };

        return this.subscribe(eventType, onceWrapper);
    }

    // Get subscriber count for an event
    getSubscriberCount(eventType) {
        return this.subscribers.has(eventType) ? this.subscribers.get(eventType).size : 0;
    }

    // Get all event types
    getEventTypes() {
        return Array.from(this.subscribers.keys());
    }

    // Clear all subscribers
    clearAll() {
        const totalSubscribers = Array.from(this.subscribers.values())
            .reduce((sum, set) => sum + set.size, 0);

        this.subscribers.clear();
        console.log(`[OBSERVER] 🗑️ Cleared all subscribers (${totalSubscribers} total)`);
    }

    // Add event to history
    addToHistory(eventData) {
        this.eventHistory.push(eventData);

        // Keep only recent events
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
        }
    }

    // Get event history
    getEventHistory(eventType = null, limit = 10) {
        let events = this.eventHistory;

        if (eventType) {
            events = events.filter(event => event.eventType === eventType);
        }

        return events.slice(-limit).reverse();
    }

    // Get statistics
    getStats() {
        const stats = {
            totalEventTypes: this.subscribers.size,
            totalSubscribers: 0,
            eventTypeBreakdown: {},
            recentEvents: this.eventHistory.slice(-5)
        };

        this.subscribers.forEach((observers, eventType) => {
            stats.totalSubscribers += observers.size;
            stats.eventTypeBreakdown[eventType] = observers.size;
        });

        return stats;
    }
}

// ===========================================
// SPECIALIZED OBSERVERS
// ===========================================

// Email Notification Observer
class EmailNotificationObserver {
    constructor(emailService) {
        this.emailService = emailService || {
            send: (to, subject, body) => {
                console.log(`📧 Email sent to ${to}: ${subject}`);
            }
        };
    }

    // Handle user registration
    onUserRegistered(data) {
        const { userName, email } = data;
        this.emailService.send(
            email,
            'Welcome to our platform!',
            `Hello ${userName}, welcome to our e-commerce platform!`
        );
    }

    // Handle order confirmation
    onOrderPlaced(data) {
        const { customerEmail, orderId, total } = data;
        this.emailService.send(
            customerEmail,
            `Order Confirmation #${orderId}`,
            `Your order of $${total} has been confirmed.`
        );
    }

    // Handle password reset
    onPasswordReset(data) {
        const { email, resetToken } = data;
        this.emailService.send(
            email,
            'Password Reset Request',
            `Use this token to reset your password: ${resetToken}`
        );
    }
}

// Analytics Observer
class AnalyticsObserver {
    constructor() {
        this.events = [];
        this.userSessions = new Map();
    }

    // Track user login
    onUserLogin(data) {
        const { userName, timestamp } = data;
        console.log(`📊 Analytics: User ${userName} logged in at ${timestamp}`);

        this.userSessions.set(userName, {
            loginTime: timestamp,
            actions: []
        });

        this.events.push({ type: 'login', user: userName, timestamp });
    }

    // Track product view
    onProductViewed(data) {
        const { productName, userName, timestamp } = data;
        console.log(`📊 Analytics: ${userName} viewed ${productName}`);

        if (this.userSessions.has(userName)) {
            this.userSessions.get(userName).actions.push({
                type: 'product_view',
                product: productName,
                timestamp
            });
        }

        this.events.push({ type: 'product_view', product: productName, user: userName, timestamp });
    }

    // Track purchase
    onPurchase(data) {
        const { userName, productName, amount, timestamp } = data;
        console.log(`📊 Analytics: ${userName} purchased ${productName} for $${amount}`);

        this.events.push({ type: 'purchase', user: userName, product: productName, amount, timestamp });
    }

    // Get analytics summary
    getSummary() {
        const summary = {
            totalEvents: this.events.length,
            activeSessions: this.userSessions.size,
            eventBreakdown: {}
        };

        this.events.forEach(event => {
            summary.eventBreakdown[event.type] = (summary.eventBreakdown[event.type] || 0) + 1;
        });

        return summary;
    }
}

// Inventory Observer
class InventoryObserver {
    constructor() {
        this.stockLevels = new Map();
        this.lowStockThreshold = 10;
    }

    // Handle product purchase (reduce inventory)
    onProductPurchased(data) {
        const { productName, quantity = 1 } = data;

        const currentStock = this.stockLevels.get(productName) || 100;
        const newStock = Math.max(0, currentStock - quantity);

        this.stockLevels.set(productName, newStock);

        console.log(`📦 Inventory: ${productName} stock: ${currentStock} → ${newStock}`);

        if (newStock <= this.lowStockThreshold) {
            console.log(`⚠️ Inventory: LOW STOCK ALERT for ${productName} (${newStock} remaining)`);
        }
    }

    // Handle stock replenishment
    onStockReplenished(data) {
        const { productName, quantity } = data;

        const currentStock = this.stockLevels.get(productName) || 0;
        const newStock = currentStock + quantity;

        this.stockLevels.set(productName, newStock);

        console.log(`📦 Inventory: Restocked ${productName}: ${currentStock} → ${newStock}`);
    }

    // Get current stock levels
    getStockLevels() {
        return Object.fromEntries(this.stockLevels);
    }

    // Get low stock items
    getLowStockItems() {
        const lowStock = [];
        this.stockLevels.forEach((stock, product) => {
            if (stock <= this.lowStockThreshold) {
                lowStock.push({ product, stock });
            }
        });
        return lowStock;
    }
}

// Logging Observer
class LoggingObserver {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000;
    }

    // Generic event logger
    logEvent(data) {
        const logEntry = {
            timestamp: data.timestamp || new Date().toISOString(),
            event: data.eventType,
            details: { ...data }
        };

        delete logEntry.details.timestamp;
        delete logEntry.details.eventType;

        this.logs.push(logEntry);

        // Keep only recent logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        console.log(`📝 Logger: ${logEntry.event} - ${JSON.stringify(logEntry.details)}`);
    }

    // Get recent logs
    getRecentLogs(count = 10) {
        return this.logs.slice(-count).reverse();
    }

    // Search logs
    searchLogs(eventType, limit = 50) {
        return this.logs
            .filter(log => log.event === eventType)
            .slice(-limit)
            .reverse();
    }
}

module.exports = {
    EventManager,
    EmailNotificationObserver,
    AnalyticsObserver,
    InventoryObserver,
    LoggingObserver
};