// FUNCTIONAL COMMAND PATTERN
// ===========================================
// WHAT IT IS:
// The Command pattern encapsulates a request as an object, allowing you to
// parameterize clients with different requests, queue operations, log requests,
// and support undoable operations.
//
// WHAT IT'S DOING IN THIS APP:
// - Encapsulates user actions (add to cart, remove from cart) as command functions
// - Provides undo/redo functionality for shopping cart operations
// - Maintains command history for tracking and reversing operations
// - Allows queuing and batching of multiple operations
// - Implements macro commands for executing multiple actions together
//
// FUNCTIONAL APPROACH BENEFITS:
// - Uses pure functions and closures instead of command classes
// - Immutable commands that don't modify external state directly
// - Functional composition for combining multiple commands
// - Pure undo/redo operations that are predictable and safe
// - Easy to test individual commands in isolation
// ===========================================

// ===========================================
// COMMAND FUNCTION DEFINITIONS
// ===========================================

// Add to Cart Command Function
const createAddToCartCommand = () => ({
    execute: (parameters) => {
        const { item, quantity, cart } = parameters;

        // Validation
        if (!item) throw new Error('Item is required');
        if (!cart) throw new Error('Cart is required');
        if (!quantity || quantity <= 0) throw new Error('Quantity must be positive');

        // Store previous state for undo (functional approach)
        const previousState = {
            hadItem: cart.getItems().some(cartItem => cartItem.name === item.name),
            previousQuantity: cart.getItems().find(cartItem => cartItem.name === item.name)?.quantity || 0
        };

        // Execute command
        cart.addItem(item, quantity);

        return {
            success: true,
            message: `Added ${quantity}x ${item.name} to cart`,
            newTotal: cart.getTotal(),
            itemCount: cart.getItemCount(),
            undoData: previousState
        };
    },

    undo: (parameters, undoData) => {
        const { item, quantity, cart } = parameters;

        if (undoData.hadItem) {
            // Restore previous quantity
            cart.updateQuantity(item.name, undoData.previousQuantity);
        } else {
            // Remove item completely
            cart.removeItem(item.name);
        }

        console.log(`[COMMAND] Undone: Add ${quantity}x ${item.name} to cart`);
    },

    name: 'addToCart'
});

// Remove from Cart Command Function
const createRemoveFromCartCommand = () => ({
    execute: (parameters) => {
        const { itemName, cart } = parameters;

        // Validation
        if (!itemName) throw new Error('Item name is required');
        if (!cart) throw new Error('Cart is required');

        // Store item for undo
        const existingItem = cart.getItems().find(item => item.name === itemName);
        const undoData = existingItem ? {
            name: existingItem.name,
            price: existingItem.price,
            quantity: existingItem.quantity
        } : null;

        // Execute command
        const removed = cart.removeItem(itemName);

        if (!removed) {
            throw new Error(`Item ${itemName} not found in cart`);
        }

        return {
            success: true,
            message: `Removed ${itemName} from cart`,
            newTotal: cart.getTotal(),
            itemCount: cart.getItemCount(),
            undoData
        };
    },

    undo: (parameters, undoData) => {
        const { cart } = parameters;

        if (undoData) {
            // Re-add the removed item
            const mockItem = {
                name: undoData.name,
                price: undoData.price,
                getPrice: () => undoData.price,
                getInfo: () => `${undoData.name} - $${undoData.price}`
            };

            cart.addItem(mockItem, undoData.quantity);
            console.log(`[COMMAND] Undone: Remove ${undoData.name} from cart`);
        }
    },

    name: 'removeFromCart'
});

// Update Quantity Command Function
const createUpdateQuantityCommand = () => ({
    execute: (parameters) => {
        const { itemName, newQuantity, cart } = parameters;

        // Validation
        if (!itemName) throw new Error('Item name is required');
        if (!cart) throw new Error('Cart is required');
        if (newQuantity < 0) throw new Error('Quantity cannot be negative');

        // Store previous quantity for undo
        const existingItem = cart.getItems().find(item => item.name === itemName);
        const undoData = {
            previousQuantity: existingItem ? existingItem.quantity : 0
        };

        // Execute command
        const updated = cart.updateQuantity(itemName, newQuantity);

        if (!updated) {
            throw new Error(`Item ${itemName} not found in cart`);
        }

        return {
            success: true,
            message: `Updated ${itemName} quantity to ${newQuantity}`,
            newTotal: cart.getTotal(),
            itemCount: cart.getItemCount(),
            undoData
        };
    },

    undo: (parameters, undoData) => {
        const { itemName, cart } = parameters;

        if (undoData.previousQuantity > 0) {
            cart.updateQuantity(itemName, undoData.previousQuantity);
        } else {
            cart.removeItem(itemName);
        }

        console.log(`[COMMAND] Undone: Update ${itemName} quantity`);
    },

    name: 'updateQuantity'
});

// Clear Cart Command Function
const createClearCartCommand = () => ({
    execute: (parameters) => {
        const { cart } = parameters;

        // Validation
        if (!cart) throw new Error('Cart is required');

        // Store all items for undo
        const undoData = {
            clearedItems: cart.getItems().map(item => ({
                name: item.name,
                price: item.price,
                quantity: item.quantity
            }))
        };

        // Execute command
        cart.clear();

        return {
            success: true,
            message: `Cart cleared (${undoData.clearedItems.length} items removed)`,
            newTotal: 0,
            itemCount: 0,
            undoData
        };
    },

    undo: (parameters, undoData) => {
        const { cart } = parameters;

        // Restore all cleared items
        undoData.clearedItems.forEach(item => {
            const mockItem = {
                name: item.name,
                price: item.price,
                getPrice: () => item.price,
                getInfo: () => `${item.name} - $${item.price}`
            };

            cart.addItem(mockItem, item.quantity);
        });

        console.log(`[COMMAND] Undone: Clear cart (restored ${undoData.clearedItems.length} items)`);
    },

    name: 'clearCart'
});

// Apply Discount Command Function
const createApplyDiscountCommand = () => ({
    execute: (parameters) => {
        const { discountPercentage, cart } = parameters;

        // Validation
        if (!cart) throw new Error('Cart is required');
        if (discountPercentage < 0 || discountPercentage > 100) {
            throw new Error('Discount percentage must be between 0 and 100');
        }

        const originalTotal = cart.getTotal();
        const discountAmount = (originalTotal * discountPercentage) / 100;

        // Store discount info for undo
        const undoData = {
            percentage: discountPercentage,
            amount: discountAmount,
            originalTotal
        };

        return {
            success: true,
            message: `Applied ${discountPercentage}% discount`,
            originalTotal,
            discountAmount,
            newTotal: originalTotal - discountAmount,
            undoData
        };
    },

    undo: (parameters, undoData) => {
        console.log(`[COMMAND] Undone: Apply ${undoData.percentage}% discount`);
        // In a real implementation, you'd remove the discount from the cart
    },

    name: 'applyDiscount'
});

// ===========================================
// FUNCTIONAL COMMAND MANAGER
// ===========================================

const createCommandManager = () => {
    // Private state (closure)
    let commandState = {
        history: [],
        currentPosition: -1,
        maxHistorySize: 50,
        commands: new Map()
    };

    // Initialize with default commands
    const defaultCommands = new Map([
        ['addToCart', createAddToCartCommand()],
        ['removeFromCart', createRemoveFromCartCommand()],
        ['updateQuantity', createUpdateQuantityCommand()],
        ['clearCart', createClearCartCommand()],
        ['applyDiscount', createApplyDiscountCommand()]
    ]);

    commandState = { ...commandState, commands: defaultCommands };

    return {
        // Register a new command
        registerCommand: (name, commandFunction) => {
            if (typeof commandFunction.execute !== 'function') {
                throw new Error('Command must have an execute function');
            }

            commandState = {
                ...commandState,
                commands: new Map(commandState.commands).set(name, commandFunction)
            };

            console.log(`[COMMAND] 📝 Registered command: ${name}`);
        },

        // Execute a command (immutable approach)
        execute: (commandName, parameters = {}) => {
            const command = commandState.commands.get(commandName);

            if (!command) {
                throw new Error(`Command '${commandName}' not found`);
            }

            try {
                console.log(`[COMMAND] ⚡ Executing: ${commandName}`);

                // Execute the command
                const result = command.execute(parameters);

                // Create new history entry
                const historyEntry = {
                    command,
                    parameters,
                    undoData: result.undoData,
                    timestamp: new Date().toISOString(),
                    name: commandName
                };

                // Update history (immutable)
                const newHistory = [
                    ...commandState.history.slice(0, commandState.currentPosition + 1),
                    historyEntry
                ];

                // Limit history size
                const trimmedHistory = newHistory.length > commandState.maxHistorySize ?
                    newHistory.slice(-commandState.maxHistorySize) : newHistory;

                commandState = {
                    ...commandState,
                    history: trimmedHistory,
                    currentPosition: trimmedHistory.length - 1
                };

                console.log(`[COMMAND] ✅ Command executed: ${commandName}`);
                return result;

            } catch (error) {
                console.log(`[COMMAND] ❌ Command failed: ${commandName} - ${error.message}`);
                throw error;
            }
        },

        // Undo last command
        undo: () => {
            if (commandState.currentPosition < 0) {
                console.log(`[COMMAND] ⚠️ Nothing to undo`);
                return false;
            }

            const historyItem = commandState.history[commandState.currentPosition];
            const { command, parameters, undoData, name } = historyItem;

            try {
                console.log(`[COMMAND] ↶ Undoing: ${name}`);

                if (typeof command.undo === 'function') {
                    command.undo(parameters, undoData);

                    commandState = {
                        ...commandState,
                        currentPosition: commandState.currentPosition - 1
                    };

                    console.log(`[COMMAND] ✅ Undone: ${name}`);
                    return true;
                } else {
                    console.log(`[COMMAND] ⚠️ Command ${name} does not support undo`);
                    return false;
                }

            } catch (error) {
                console.log(`[COMMAND] ❌ Undo failed for ${name}: ${error.message}`);
                return false;
            }
        },

        // Redo next command
        redo: () => {
            if (commandState.currentPosition >= commandState.history.length - 1) {
                console.log(`[COMMAND] ⚠️ Nothing to redo`);
                return false;
            }

            const nextPosition = commandState.currentPosition + 1;
            const historyItem = commandState.history[nextPosition];
            const { command, parameters, name } = historyItem;

            try {
                console.log(`[COMMAND] ↷ Redoing: ${name}`);

                const result = command.execute(parameters);

                commandState = {
                    ...commandState,
                    currentPosition: nextPosition
                };

                console.log(`[COMMAND] ✅ Redone: ${name}`);
                return true;

            } catch (error) {
                console.log(`[COMMAND] ❌ Redo failed for ${name}: ${error.message}`);
                return false;
            }
        },

        // Get command history (immutable copy)
        getHistory: () => {
            return commandState.history.map((item, index) => ({
                name: item.name,
                timestamp: item.timestamp,
                parameters: { ...item.parameters },
                isCurrent: index === commandState.currentPosition
            }));
        },

        // Clear history
        clearHistory: () => {
            const historySize = commandState.history.length;

            commandState = {
                ...commandState,
                history: [],
                currentPosition: -1
            };

            console.log(`[COMMAND] 🗑️ Cleared command history (${historySize} commands)`);
        },

        // Check if undo is available
        canUndo: () => commandState.currentPosition >= 0,

        // Check if redo is available
        canRedo: () => commandState.currentPosition < commandState.history.length - 1,

        // Execute multiple commands as a macro (functional composition)
        executeMacro: (commands) => {
            console.log(`[COMMAND] 📦 Executing macro with ${commands.length} commands`);
            const results = [];

            // Create a transaction-like approach
            const originalPosition = commandState.currentPosition;

            try {
                for (const { name, parameters } of commands) {
                    const result = exports.execute(name, parameters);
                    results.push({ success: true, result });
                }

                console.log(`[COMMAND] ✅ Macro completed successfully`);
                return results;

            } catch (error) {
                console.log(`[COMMAND] ❌ Macro failed, rolling back...`);

                // Rollback to original position
                while (commandState.currentPosition > originalPosition) {
                    exports.undo();
                }

                results.push({ success: false, error: error.message });
                throw error;
            }
        },

        // Create a command snapshot for complex undo scenarios
        createSnapshot: () => ({
            history: [...commandState.history],
            currentPosition: commandState.currentPosition,
            timestamp: new Date().toISOString()
        }),

        // Restore from snapshot
        restoreSnapshot: (snapshot) => {
            commandState = {
                ...commandState,
                history: [...snapshot.history],
                currentPosition: snapshot.currentPosition
            };

            console.log(`[COMMAND] 📸 Restored from snapshot (${snapshot.timestamp})`);
        },

        // Get available commands
        getAvailableCommands: () => Array.from(commandState.commands.keys()),

        // Get command statistics
        getStats: () => {
            const commandCounts = {};
            commandState.history.forEach(item => {
                commandCounts[item.name] = (commandCounts[item.name] || 0) + 1;
            });

            return {
                totalCommands: commandState.history.length,
                currentPosition: commandState.currentPosition,
                canUndo: exports.canUndo(),
                canRedo: exports.canRedo(),
                commandBreakdown: commandCounts,
                registeredCommands: commandState.commands.size
            };
        }
    };
};

module.exports = {
    createCommandManager,
    createAddToCartCommand,
    createRemoveFromCartCommand,
    createUpdateQuantityCommand,
    createClearCartCommand,
    createApplyDiscountCommand
};