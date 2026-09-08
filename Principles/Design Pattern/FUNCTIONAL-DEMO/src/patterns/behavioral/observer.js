// FUNCTIONAL OBSERVER PATTERN
// ===========================================
// WHAT IT IS:
// The Observer pattern defines a one-to-many dependency between objects so that
// when one object changes state, all its dependents are notified and updated
// automatically. It's useful for implementing distributed event handling systems.
//
// WHAT IT'S DOING IN THIS APP:
// - Manages event subscriptions and notifications (user login, product purchases)
// - Allows multiple observers to react to the same events (email, analytics, inventory)
// - Provides decoupled communication between different parts of the application
// - Handles event broadcasting to all subscribed functions
// - Maintains observer lists and manages subscription lifecycle
//
// FUNCTIONAL APPROACH BENEFITS:
// - Uses pure functions and closures instead of observer classes
// - No inheritance or complex class hierarchies
// - Functional composition for combining multiple observers
// - Immutable event handling with predictable side effects
// - Easy to test individual observer functions in isolation
// ===========================================

// ===========================================
// FUNCTIONAL EVENT MANAGER
// ===========================================

const createEventManager = () => {
    // Private state (closure)
    let eventState = {
        subscribers: new Map(), // eventType -> Set of observer functions
        eventHistory: [],
        maxHistorySize: 100
    };

    // Helper functions (pure)
    const addToHistory = (eventData) => {
        const newHistory = [...eventState.eventHistory.slice(-(eventState.maxHistorySize - 1)), eventData];
        eventState = { ...eventState, eventHistory: newHistory };
    };

    return {
        // Subscribe to an event (pure function approach)
        subscribe: (eventType, observerFunction) => {
            if (typeof observerFunction !== 'function') {
                throw new Error('Observer must be a function');
            }

            const newSubscribers = new Map(eventState.subscribers);

            if (!newSubscribers.has(eventType)) {
                newSubscribers.set(eventType, new Set());
            }

            const eventSubscribers = new Set(newSubscribers.get(eventType));
            eventSubscribers.add(observerFunction);
            newSubscribers.set(eventType, eventSubscribers);

            eventState = { ...eventState, subscribers: newSubscribers };

            console.log(`[OBSERVER] 📝 Subscribed to event: ${eventType}`);

            // Return unsubscribe function (closure)
            return () => exports.unsubscribe(eventType, observerFunction);
        },

        // Unsubscribe from an event
        unsubscribe: (eventType, observerFunction) => {
            if (!eventState.subscribers.has(eventType)) {
                return false;
            }

            const newSubscribers = new Map(eventState.subscribers);
            const eventSubscribers = new Set(newSubscribers.get(eventType));
            const removed = eventSubscribers.delete(observerFunction);

            if (removed) {
                if (eventSubscribers.size === 0) {
                    newSubscribers.delete(eventType);
                } else {
                    newSubscribers.set(eventType, eventSubscribers);
                }

                eventState = { ...eventState, subscribers: newSubscribers };
                console.log(`[OBSERVER] ❌ Unsubscribed from event: ${eventType}`);
            }

            return removed;
        },

        // Notify all subscribers (pure approach)
        notify: (eventType, data = {}) => {
            const timestamp = new Date().toISOString();
            const eventData = { ...data, timestamp, eventType };

            // Add to history
            addToHistory(eventData);

            console.log(`[OBSERVER] 📡 Broadcasting event: ${eventType}`);

            if (eventState.subscribers.has(eventType)) {
                const observers = eventState.subscribers.get(eventType);
                let notifiedCount = 0;

                // Call each observer function
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
        },

        // Subscribe once (auto-unsubscribe after first notification)
        once: (eventType, observerFunction) => {
            const onceWrapper = (data) => {
                observerFunction(data);
                exports.unsubscribe(eventType, onceWrapper);
            };

            return exports.subscribe(eventType, onceWrapper);
        },

        // Get subscriber count for an event
        getSubscriberCount: (eventType) => {
            return eventState.subscribers.has(eventType) ?
                eventState.subscribers.get(eventType).size : 0;
        },

        // Get all event types
        getEventTypes: () => Array.from(eventState.subscribers.keys()),

        // Clear all subscribers
        clearAll: () => {
            const totalSubscribers = Array.from(eventState.subscribers.values())
                .reduce((sum, set) => sum + set.size, 0);

            eventState = { ...eventState, subscribers: new Map() };
            console.log(`[OBSERVER] 🗑️ Cleared all subscribers (${totalSubscribers} total)`);
        },

        // Get event history (returns copy)
        getEventHistory: (eventType = null, limit = 10) => {
            let events = [...eventState.eventHistory];

            if (eventType) {
                events = events.filter(event => event.eventType === eventType);
            }

            return events.slice(-limit).reverse();
        },

        // Get statistics
        getStats: () => {
            const stats = {
                totalEventTypes: eventState.subscribers.size,
                totalSubscribers: 0,
                eventTypeBreakdown: {},
                recentEvents: eventState.eventHistory.slice(-5)
            };

            eventState.subscribers.forEach((observers, eventType) => {
                stats.totalSubscribers += observers.size;
                stats.eventTypeBreakdown[eventType] = observers.size;
            });

            return stats;
        },

        // Create filtered event manager (only specific events)
        createFiltered: (allowedEvents) => {
            const filteredManager = createEventManager();

            // Override notify to filter events
            const originalNotify = filteredManager.notify;
            filteredManager.notify = (eventType, data) => {
                if (allowedEvents.includes(eventType)) {
                    return originalNotify(eventType, data);
                } else {
                    console.log(`[OBSERVER] ⚠️ Event ${eventType} not allowed in filtered manager`);
                    return null;
                }
            };

            return filteredManager;
        }
    };
};

// ===========================================
// SPECIALIZED OBSERVER FUNCTIONS
// ===========================================

// Email notification observer factory
const createEmailNotificationObserver = (emailService) => {
    const service = emailService || {
        send: (to, subject, body) => {
            console.log(`📧 Email sent to ${to}: ${subject}`);
        }
    };

    return {
        // Handle user registration
        onUserRegistered: (data) => {
            const { userName, email } = data;
            service.send(
                email,
                'Welcome to our platform!',
                `Hello ${userName}, welcome to our e-commerce platform!`
            );
        },

        // Handle order confirmation
        onOrderPlaced: (data) => {
            const { customerEmail, orderId, total } = data;
            service.send(
                customerEmail,
                `Order Confirmation #${orderId}`,
                `Your order of $${total} has been confirmed.`
            );
        },

        // Handle password reset
        onPasswordReset: (data) => {
            const { email, resetToken } = data;
            service.send(
                email,
                'Password Reset Request',
                `Use this token to reset your password: ${resetToken}`
            );
        }
    };
};

// Analytics observer factory
const createAnalyticsObserver = () => {
    // Private analytics state
    let analyticsState = {
        events: [],
        userSessions: new Map()
    };

    return {
        // Track user login
        onUserLogin: (data) => {
            const { userName, timestamp } = data;
            console.log(`📊 Analytics: User ${userName} logged in at ${timestamp}`);

            analyticsState = {
                ...analyticsState,
                userSessions: new Map(analyticsState.userSessions).set(userName, {
                    loginTime: timestamp,
                    actions: []
                }),
                events: [...analyticsState.events, { type: 'login', user: userName, timestamp }]
            };
        },

        // Track product view
        onProductViewed: (data) => {
            const { productName, userName, timestamp } = data;
            console.log(`📊 Analytics: ${userName} viewed ${productName}`);

            if (analyticsState.userSessions.has(userName)) {
                const session = analyticsState.userSessions.get(userName);
                const updatedSession = {
                    ...session,
                    actions: [...session.actions, {
                        type: 'product_view',
                        product: productName,
                        timestamp
                    }]
                };

                analyticsState = {
                    ...analyticsState,
                    userSessions: new Map(analyticsState.userSessions).set(userName, updatedSession)
                };
            }

            analyticsState = {
                ...analyticsState,
                events: [...analyticsState.events, { type: 'product_view', product: productName, user: userName, timestamp }]
            };
        },

        // Track purchase
        onPurchase: (data) => {
            const { userName, productName, amount, timestamp } = data;
            console.log(`📊 Analytics: ${userName} purchased ${productName} for $${amount}`);

            analyticsState = {
                ...analyticsState,
                events: [...analyticsState.events, { type: 'purchase', user: userName, product: productName, amount, timestamp }]
            };
        },

        // Get analytics summary (pure function)
        getSummary: () => {
            const summary = {
                totalEvents: analyticsState.events.length,
                activeSessions: analyticsState.userSessions.size,
                eventBreakdown: {}
            };

            analyticsState.events.forEach(event => {
                summary.eventBreakdown[event.type] = (summary.eventBreakdown[event.type] || 0) + 1;
            });

            return summary;
        },

        // Get user session data
        getUserSession: (userName) => {
            return analyticsState.userSessions.get(userName) || null;
        },

        // Export analytics data
        exportData: () => ({
            events: [...analyticsState.events],
            sessions: Object.fromEntries(analyticsState.userSessions)
        })
    };
};

// Inventory observer factory
const createInventoryObserver = () => {
    // Private inventory state
    let inventoryState = {
        stockLevels: new Map(),
        lowStockThreshold: 10,
        stockHistory: []
    };

    return {
        // Handle product purchase (reduce inventory)
        onProductPurchased: (data) => {
            const { productName, quantity = 1 } = data;

            const currentStock = inventoryState.stockLevels.get(productName) || 100;
            const newStock = Math.max(0, currentStock - quantity);

            const newStockLevels = new Map(inventoryState.stockLevels);
            newStockLevels.set(productName, newStock);

            inventoryState = {
                ...inventoryState,
                stockLevels: newStockLevels,
                stockHistory: [...inventoryState.stockHistory.slice(-99), {
                    timestamp: new Date().toISOString(),
                    action: 'purchase',
                    product: productName,
                    quantity,
                    newStock
                }]
            };

            console.log(`📦 Inventory: ${productName} stock: ${currentStock} → ${newStock}`);

            if (newStock <= inventoryState.lowStockThreshold) {
                console.log(`⚠️ Inventory: LOW STOCK ALERT for ${productName} (${newStock} remaining)`);
            }
        },

        // Handle stock replenishment
        onStockReplenished: (data) => {
            const { productName, quantity } = data;

            const currentStock = inventoryState.stockLevels.get(productName) || 0;
            const newStock = currentStock + quantity;

            const newStockLevels = new Map(inventoryState.stockLevels);
            newStockLevels.set(productName, newStock);

            inventoryState = {
                ...inventoryState,
                stockLevels: newStockLevels,
                stockHistory: [...inventoryState.stockHistory.slice(-99), {
                    timestamp: new Date().toISOString(),
                    action: 'restock',
                    product: productName,
                    quantity,
                    newStock
                }]
            };

            console.log(`📦 Inventory: Restocked ${productName}: ${currentStock} → ${newStock}`);
        },

        // Get current stock levels (pure function)
        getStockLevels: () => Object.fromEntries(inventoryState.stockLevels),

        // Get low stock items (pure function)
        getLowStockItems: () => {
            const lowStock = [];
            inventoryState.stockLevels.forEach((stock, product) => {
                if (stock <= inventoryState.lowStockThreshold) {
                    lowStock.push({ product, stock });
                }
            });
            return lowStock;
        },

        // Set low stock threshold
        setLowStockThreshold: (threshold) => {
            inventoryState = {
                ...inventoryState,
                lowStockThreshold: threshold
            };
        },

        // Get stock history
        getStockHistory: (limit = 10) => {
            return inventoryState.stockHistory.slice(-limit).reverse();
        }
    };
};

// Logging observer factory
const createLoggingObserver = () => {
    // Private logging state
    let loggingState = {
        logs: [],
        maxLogs: 1000
    };

    return {
        // Generic event logger
        logEvent: (data) => {
            const logEntry = {
                timestamp: data.timestamp || new Date().toISOString(),
                event: data.eventType,
                details: { ...data }
            };

            delete logEntry.details.timestamp;
            delete logEntry.details.eventType;

            loggingState = {
                ...loggingState,
                logs: [...loggingState.logs.slice(-(loggingState.maxLogs - 1)), logEntry]
            };

            console.log(`📝 Logger: ${logEntry.event} - ${JSON.stringify(logEntry.details)}`);
        },

        // Get recent logs (pure function)
        getRecentLogs: (count = 10) => {
            return loggingState.logs.slice(-count).reverse();
        },

        // Search logs (pure function)
        searchLogs: (eventType, limit = 50) => {
            return loggingState.logs
                .filter(log => log.event === eventType)
                .slice(-limit)
                .reverse();
        },

        // Clear logs
        clearLogs: () => {
            const count = loggingState.logs.length;
            loggingState = { ...loggingState, logs: [] };
            console.log(`📝 Logger: Cleared ${count} logs`);
        },

        // Get log statistics
        getLogStats: () => {
            const stats = {};
            loggingState.logs.forEach(log => {
                stats[log.event] = (stats[log.event] || 0) + 1;
            });

            return {
                totalLogs: loggingState.logs.length,
                maxLogs: loggingState.maxLogs,
                eventBreakdown: stats
            };
        }
    };
};

module.exports = {
    createEventManager,
    createEmailNotificationObserver,
    createAnalyticsObserver,
    createInventoryObserver,
    createLoggingObserver
};