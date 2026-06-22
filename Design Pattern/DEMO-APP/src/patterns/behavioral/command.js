// COMMAND PATTERN IMPLEMENTATION
// Encapsulates requests as objects, allowing for parameterization, queuing, and undo operations
// Benefits: Decouples sender from receiver, supports undo/redo, macro recording, queuing

// ===========================================
// COMMAND MANAGER (INVOKER)
// ===========================================

class CommandManager {
    constructor() {
        this.history = [];
        this.currentPosition = -1;
        this.maxHistorySize = 50;
        this.commands = new Map();

        // Register default commands
        this.registerCommand('addToCart', new AddToCartCommand());
        this.registerCommand('removeFromCart', new RemoveFromCartCommand());
        this.registerCommand('updateQuantity', new UpdateQuantityCommand());
        this.registerCommand('clearCart', new ClearCartCommand());
        this.registerCommand('applyDiscount', new ApplyDiscountCommand());
        this.registerCommand('placeOrder', new PlaceOrderCommand());
    }

    // Register a new command
    registerCommand(name, command) {
        this.commands.set(name, command);
        console.log(`[COMMAND] 📝 Registered command: ${name}`);
    }

    // Execute a command
    executeCommand(commandName, parameters = {}) {
        if (!this.commands.has(commandName)) {
            throw new Error(`Command '${commandName}' not found`);
        }

        const command = this.commands.get(commandName);

        try {
            console.log(`[COMMAND] ⚡ Executing: ${commandName}`);

            // Execute the command
            const result = command.execute(parameters);

            // Add to history (remove any commands after current position)
            this.history = this.history.slice(0, this.currentPosition + 1);
            this.history.push({
                command,
                parameters,
                timestamp: new Date().toISOString(),
                name: commandName
            });

            this.currentPosition++;

            // Limit history size
            if (this.history.length > this.maxHistorySize) {
                this.history = this.history.slice(-this.maxHistorySize);
                this.currentPosition = this.history.length - 1;
            }

            console.log(`[COMMAND] ✅ Command executed: ${commandName}`);
            return result;

        } catch (error) {
            console.log(`[COMMAND] ❌ Command failed: ${commandName} - ${error.message}`);
            throw error;
        }
    }

    // Undo last command
    undo() {
        if (this.currentPosition < 0) {
            console.log(`[COMMAND] ⚠️ Nothing to undo`);
            return false;
        }

        const historyItem = this.history[this.currentPosition];
        const { command, parameters, name } = historyItem;

        try {
            console.log(`[COMMAND] ↶ Undoing: ${name}`);

            if (typeof command.undo === 'function') {
                command.undo(parameters);
                this.currentPosition--;
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
    }

    // Redo next command
    redo() {
        if (this.currentPosition >= this.history.length - 1) {
            console.log(`[COMMAND] ⚠️ Nothing to redo`);
            return false;
        }

        this.currentPosition++;
        const historyItem = this.history[this.currentPosition];
        const { command, parameters, name } = historyItem;

        try {
            console.log(`[COMMAND] ↷ Redoing: ${name}`);
            command.execute(parameters);
            console.log(`[COMMAND] ✅ Redone: ${name}`);
            return true;

        } catch (error) {
            console.log(`[COMMAND] ❌ Redo failed for ${name}: ${error.message}`);
            this.currentPosition--;
            return false;
        }
    }

    // Get command history
    getHistory() {
        return this.history.map((item, index) => ({
            name: item.name,
            timestamp: item.timestamp,
            parameters: item.parameters,
            isCurrent: index === this.currentPosition
        }));
    }

    // Clear history
    clearHistory() {
        const historySize = this.history.length;
        this.history = [];
        this.currentPosition = -1;
        console.log(`[COMMAND] 🗑️ Cleared command history (${historySize} commands)`);
    }

    // Check if undo is available
    canUndo() {
        return this.currentPosition >= 0;
    }

    // Check if redo is available
    canRedo() {
        return this.currentPosition < this.history.length - 1;
    }

    // Execute multiple commands as a macro
    executeMacro(commands) {
        console.log(`[COMMAND] 📦 Executing macro with ${commands.length} commands`);
        const results = [];

        for (const { name, parameters } of commands) {
            try {
                const result = this.executeCommand(name, parameters);
                results.push({ success: true, result });
            } catch (error) {
                results.push({ success: false, error: error.message });
                console.log(`[COMMAND] ❌ Macro failed at command: ${name}`);
                break;
            }
        }

        return results;
    }
}

// ===========================================
// COMMAND INTERFACE
// ===========================================

class Command {
    execute(parameters) {
        throw new Error('execute method must be implemented');
    }

    undo(parameters) {
        console.log('Undo not implemented for this command');
    }

    validate(parameters) {
        return true;
    }
}

// ===========================================
// CONCRETE COMMANDS
// ===========================================

// Add to Cart Command
class AddToCartCommand extends Command {
    execute(parameters) {
        this.validate(parameters);
        const { item, quantity, cart } = parameters;

        // Store original state for undo
        this.previousState = {
            hadItem: cart.getItems().some(cartItem => cartItem.name === item.name),
            previousQuantity: cart.getItems().find(cartItem => cartItem.name === item.name)?.quantity || 0
        };

        cart.addItem(item, quantity);

        return {
            message: `Added ${quantity}x ${item.name} to cart`,
            newTotal: cart.getTotal(),
            itemCount: cart.getItemCount()
        };
    }

    undo(parameters) {
        const { item, quantity, cart } = parameters;

        if (this.previousState.hadItem) {
            // Restore previous quantity
            cart.updateQuantity(item.name, this.previousState.previousQuantity);
        } else {
            // Remove item completely
            cart.removeItem(item.name);
        }

        console.log(`[COMMAND] Undone: Add ${quantity}x ${item.name} to cart`);
    }

    validate(parameters) {
        const { item, quantity, cart } = parameters;

        if (!item) throw new Error('Item is required');
        if (!cart) throw new Error('Cart is required');
        if (!quantity || quantity <= 0) throw new Error('Quantity must be positive');

        return true;
    }
}

// Remove from Cart Command
class RemoveFromCartCommand extends Command {
    execute(parameters) {
        this.validate(parameters);
        const { itemName, cart } = parameters;

        // Store item for undo
        const existingItem = cart.getItems().find(item => item.name === itemName);
        if (existingItem) {
            this.removedItem = {
                name: existingItem.name,
                price: existingItem.price,
                quantity: existingItem.quantity
            };
        }

        const removed = cart.removeItem(itemName);

        if (!removed) {
            throw new Error(`Item ${itemName} not found in cart`);
        }

        return {
            message: `Removed ${itemName} from cart`,
            newTotal: cart.getTotal(),
            itemCount: cart.getItemCount()
        };
    }

    undo(parameters) {
        const { cart } = parameters;

        if (this.removedItem) {
            // Re-add the removed item
            const mockItem = {
                name: this.removedItem.name,
                getPrice: () => this.removedItem.price,
                getInfo: () => `${this.removedItem.name} - $${this.removedItem.price}`
            };

            cart.addItem(mockItem, this.removedItem.quantity);
            console.log(`[COMMAND] Undone: Remove ${this.removedItem.name} from cart`);
        }
    }

    validate(parameters) {
        const { itemName, cart } = parameters;

        if (!itemName) throw new Error('Item name is required');
        if (!cart) throw new Error('Cart is required');

        return true;
    }
}

// Update Quantity Command
class UpdateQuantityCommand extends Command {
    execute(parameters) {
        this.validate(parameters);
        const { itemName, newQuantity, cart } = parameters;

        // Store previous quantity for undo
        const existingItem = cart.getItems().find(item => item.name === itemName);
        this.previousQuantity = existingItem ? existingItem.quantity : 0;

        const updated = cart.updateQuantity(itemName, newQuantity);

        if (!updated) {
            throw new Error(`Item ${itemName} not found in cart`);
        }

        return {
            message: `Updated ${itemName} quantity to ${newQuantity}`,
            newTotal: cart.getTotal(),
            itemCount: cart.getItemCount()
        };
    }

    undo(parameters) {
        const { itemName, cart } = parameters;

        if (this.previousQuantity > 0) {
            cart.updateQuantity(itemName, this.previousQuantity);
        } else {
            cart.removeItem(itemName);
        }

        console.log(`[COMMAND] Undone: Update ${itemName} quantity`);
    }

    validate(parameters) {
        const { itemName, newQuantity, cart } = parameters;

        if (!itemName) throw new Error('Item name is required');
        if (!cart) throw new Error('Cart is required');
        if (newQuantity < 0) throw new Error('Quantity cannot be negative');

        return true;
    }
}

// Clear Cart Command
class ClearCartCommand extends Command {
    execute(parameters) {
        this.validate(parameters);
        const { cart } = parameters;

        // Store all items for undo
        this.clearedItems = cart.getItems().map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity
        }));

        cart.clear();

        return {
            message: `Cart cleared (${this.clearedItems.length} items removed)`,
            newTotal: 0,
            itemCount: 0
        };
    }

    undo(parameters) {
        const { cart } = parameters;

        // Restore all cleared items
        this.clearedItems.forEach(item => {
            const mockItem = {
                name: item.name,
                getPrice: () => item.price,
                getInfo: () => `${item.name} - $${item.price}`
            };

            cart.addItem(mockItem, item.quantity);
        });

        console.log(`[COMMAND] Undone: Clear cart (restored ${this.clearedItems.length} items)`);
    }

    validate(parameters) {
        const { cart } = parameters;
        if (!cart) throw new Error('Cart is required');
        return true;
    }
}

// Apply Discount Command
class ApplyDiscountCommand extends Command {
    execute(parameters) {
        this.validate(parameters);
        const { discountPercentage, cart } = parameters;

        const originalTotal = cart.getTotal();
        const discountAmount = (originalTotal * discountPercentage) / 100;

        // Store discount info for undo
        this.appliedDiscount = {
            percentage: discountPercentage,
            amount: discountAmount,
            originalTotal
        };

        // Note: This is a simplified implementation
        // In a real system, you'd modify the cart to store discount information

        return {
            message: `Applied ${discountPercentage}% discount`,
            originalTotal,
            discountAmount,
            newTotal: originalTotal - discountAmount
        };
    }

    undo(parameters) {
        console.log(`[COMMAND] Undone: Apply ${this.appliedDiscount.percentage}% discount`);
        // In a real implementation, you'd remove the discount from the cart
    }

    validate(parameters) {
        const { discountPercentage, cart } = parameters;

        if (!cart) throw new Error('Cart is required');
        if (discountPercentage < 0 || discountPercentage > 100) {
            throw new Error('Discount percentage must be between 0 and 100');
        }

        return true;
    }
}

// Place Order Command
class PlaceOrderCommand extends Command {
    execute(parameters) {
        this.validate(parameters);
        const { cart, customerInfo } = parameters;

        if (cart.isEmpty()) {
            throw new Error('Cannot place order with empty cart');
        }

        // Create order
        this.order = {
            orderId: Math.random().toString(36).substr(2, 9).toUpperCase(),
            items: cart.getItems(),
            total: cart.getTotal(),
            customer: customerInfo,
            timestamp: new Date().toISOString(),
            status: 'placed'
        };

        // Clear cart after placing order
        cart.clear();

        return {
            message: `Order placed successfully`,
            orderId: this.order.orderId,
            total: this.order.total
        };
    }

    undo(parameters) {
        const { cart } = parameters;

        // Restore items to cart
        this.order.items.forEach(item => {
            const mockItem = {
                name: item.name,
                getPrice: () => item.price,
                getInfo: () => `${item.name} - $${item.price}`
            };

            cart.addItem(mockItem, item.quantity);
        });

        console.log(`[COMMAND] Undone: Place order ${this.order.orderId}`);
    }

    validate(parameters) {
        const { cart, customerInfo } = parameters;

        if (!cart) throw new Error('Cart is required');
        if (!customerInfo) throw new Error('Customer information is required');

        return true;
    }
}

module.exports = {
    CommandManager,
    Command,
    AddToCartCommand,
    RemoveFromCartCommand,
    UpdateQuantityCommand,
    ClearCartCommand,
    ApplyDiscountCommand,
    PlaceOrderCommand
};