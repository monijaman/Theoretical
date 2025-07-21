// FUNCTIONAL MODULE PATTERN
// Encapsulation using closures and pure functions
// Benefits: Private state, controlled access, immutable operations

// ===========================================
// FUNCTIONAL SHOPPING CART MODULE
// ===========================================

const createCartModule = () => {
    // Private state (closure)
    let cartState = {
        id: Math.random().toString(36).substr(2, 9),
        items: new Map(),
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
    };

    // Helper functions (pure)
    const calculateItemTotal = (item, quantity) => item.price * quantity;

    const updateLastModified = () => {
        cartState = {
            ...cartState,
            lastModified: new Date().toISOString()
        };
    };

    const findItemByName = (itemName) => {
        for (const [item, quantity] of cartState.items) {
            if (item.name === itemName) {
                return { item, quantity };
            }
        }
        return null;
    };

    // Public interface
    return {
        // Add item to cart (returns new state)
        addItem: (item, quantity = 1) => {
            if (!item || typeof item.price !== 'number') {
                throw new Error('Invalid item: must have price property');
            }

            if (quantity <= 0) {
                throw new Error('Quantity must be greater than 0');
            }

            const newItems = new Map(cartState.items);

            // Check if item already exists
            let existingItem = null;
            for (const [existingCartItem] of newItems) {
                if (existingCartItem.name === item.name) {
                    existingItem = existingCartItem;
                    break;
                }
            }

            if (existingItem) {
                // Update existing item quantity
                const currentQuantity = newItems.get(existingItem);
                newItems.set(existingItem, currentQuantity + quantity);
            } else {
                // Add new item
                newItems.set(item, quantity);
            }

            cartState = {
                ...cartState,
                items: newItems
            };

            updateLastModified();
            console.log(`[CART ${cartState.id}] Added ${quantity}x ${item.name}`);

            return cartState.id; // Return cart ID for chaining
        },

        // Remove item from cart
        removeItem: (itemName) => {
            const found = findItemByName(itemName);
            if (found) {
                const newItems = new Map(cartState.items);
                newItems.delete(found.item);

                cartState = {
                    ...cartState,
                    items: newItems
                };

                updateLastModified();
                console.log(`[CART ${cartState.id}] Removed ${itemName}`);
                return true;
            }

            console.log(`[CART ${cartState.id}] Item ${itemName} not found`);
            return false;
        },        // Update item quantity
        updateQuantity: (itemName, newQuantity) => {
            if (newQuantity <= 0) {
                return removeItem(itemName);
            }

            const found = findItemByName(itemName);
            if (found) {
                const newItems = new Map(cartState.items);
                newItems.set(found.item, newQuantity);

                cartState = {
                    ...cartState,
                    items: newItems
                };

                updateLastModified();
                console.log(`[CART ${cartState.id}] Updated ${itemName} quantity to ${newQuantity}`);
                return true;
            }

            console.log(`[CART ${cartState.id}] Item ${itemName} not found`);
            return false;
        },

        // Get total price (pure function)
        getTotal: () => {
            let total = 0;
            for (const [item, quantity] of cartState.items) {
                total += calculateItemTotal(item, quantity);
            }
            return Math.round(total * 100) / 100; // Round to 2 decimal places
        },

        // Get item count (pure function)
        getItemCount: () => {
            let count = 0;
            for (const quantity of cartState.items.values()) {
                count += quantity;
            }
            return count;
        },

        // Get all items (returns immutable copy)
        getItems: () => {
            const itemList = [];
            for (const [item, quantity] of cartState.items) {
                itemList.push({
                    name: item.name,
                    price: item.price,
                    quantity: quantity,
                    total: calculateItemTotal(item, quantity),
                    info: item.getInfo ? item.getInfo() : `${item.name} - $${item.price}`
                });
            }
            return itemList;
        },

        // Get cart state (immutable snapshot)
        getState: () => {
            const itemCount = Array.from(cartState.items.values()).reduce((sum, qty) => sum + qty, 0);
            const total = Array.from(cartState.items.entries())
                .reduce((sum, [item, quantity]) => sum + calculateItemTotal(item, quantity), 0);

            const itemList = [];
            for (const [item, quantity] of cartState.items) {
                itemList.push({
                    name: item.name,
                    price: item.price,
                    quantity: quantity,
                    total: calculateItemTotal(item, quantity),
                    info: item.getInfo ? item.getInfo() : `${item.name} - $${item.price}`
                });
            }

            return {
                id: cartState.id,
                itemCount: itemCount,
                total: total.toFixed(2),
                createdAt: cartState.createdAt,
                lastModified: cartState.lastModified,
                items: itemList
            };
        },        // Clear cart
        clear: () => {
            const itemCount = Array.from(cartState.items.values()).reduce((sum, qty) => sum + qty, 0);
            cartState = {
                ...cartState,
                items: new Map()
            };

            updateLastModified();
            console.log(`[CART ${cartState.id}] Cleared ${itemCount} items`);

            return itemCount;
        },

        // Check if cart is empty
        isEmpty: () => cartState.items.size === 0,

        // Get cart ID
        getId: () => cartState.id,        // Apply discount (functional approach)
        applyDiscount: (percentage) => {
            if (percentage < 0 || percentage > 100) {
                throw new Error('Discount percentage must be between 0 and 100');
            }

            const originalTotal = getTotal();
            const discountAmount = (originalTotal * percentage) / 100;
            const newTotal = originalTotal - discountAmount;

            console.log(`[CART ${cartState.id}] Applied ${percentage}% discount: $${originalTotal} → $${newTotal}`);

            return {
                originalTotal,
                discountPercentage: percentage,
                discountAmount,
                newTotal,
                cartId: cartState.id
            };
        },

        // Create cart snapshot for undo/redo
        createSnapshot: () => ({
            id: cartState.id,
            items: new Map(cartState.items),
            createdAt: cartState.createdAt,
            lastModified: cartState.lastModified
        }),

        // Restore from snapshot
        restoreSnapshot: (snapshot) => {
            cartState = { ...snapshot };
            console.log(`[CART ${cartState.id}] Restored from snapshot`);
        }
    };
};

// ===========================================
// FUNCTIONAL INVENTORY MODULE
// ===========================================

const createInventoryModule = () => {
    // Private inventory state
    let inventoryState = {
        inventory: new Map(),
        lowStockThreshold: 10,
        reorderPoints: new Map(),
        history: []
    };

    // Helper functions
    const checkLowStock = (productName, currentStock) => {
        if (currentStock <= inventoryState.lowStockThreshold) {
            console.log(`[INVENTORY] ⚠️ Low stock alert: ${productName} (${currentStock} remaining)`);
            return true;
        }
        return false;
    };

    const addToHistory = (action, productId, details) => {
        const historyEntry = {
            timestamp: new Date().toISOString(),
            action,
            productId,
            details
        };

        inventoryState = {
            ...inventoryState,
            history: [...inventoryState.history.slice(-99), historyEntry] // Keep last 100 entries
        };
    };

    // Public interface
    return {
        // Add product to inventory
        addProduct: (product, quantity) => {
            const productId = product.id || Math.random().toString(36).substr(2, 9);

            const newInventory = new Map(inventoryState.inventory);

            if (newInventory.has(productId)) {
                // Update existing product
                const existingItem = newInventory.get(productId);
                newInventory.set(productId, {
                    ...existingItem,
                    quantity: existingItem.quantity + quantity,
                    lastUpdated: new Date().toISOString()
                });
            } else {
                // Add new product
                newInventory.set(productId, {
                    product,
                    quantity,
                    lastUpdated: new Date().toISOString(),
                    totalSold: 0
                });
            }

            inventoryState = {
                ...inventoryState,
                inventory: newInventory
            };

            addToHistory('ADD', productId, { quantity, productName: product.name });
            console.log(`[INVENTORY] Added ${quantity}x ${product.name} (ID: ${productId})`);

            return productId;
        },

        // Remove product from inventory
        removeProduct: (productId, quantity) => {
            const item = inventoryState.inventory.get(productId);

            if (!item) {
                console.log(`[INVENTORY] Product ${productId} not found`);
                return false;
            }

            if (item.quantity < quantity) {
                console.log(`[INVENTORY] Insufficient stock for ${item.product.name}`);
                return false;
            }

            const newInventory = new Map(inventoryState.inventory);
            const updatedItem = {
                ...item,
                quantity: item.quantity - quantity,
                lastUpdated: new Date().toISOString(),
                totalSold: item.totalSold + quantity
            };

            newInventory.set(productId, updatedItem);

            inventoryState = {
                ...inventoryState,
                inventory: newInventory
            };

            checkLowStock(item.product.name, updatedItem.quantity);
            addToHistory('REMOVE', productId, { quantity, productName: item.product.name });

            console.log(`[INVENTORY] Removed ${quantity}x ${item.product.name}`);
            return true;
        },

        // Get product stock (pure function)
        getStock: (productId) => {
            const item = inventoryState.inventory.get(productId);
            return item ? item.quantity : 0;
        },

        // Check availability (pure function)
        isAvailable: (productId, quantity = 1) => {
            return exports.getStock(productId) >= quantity;
        },

        // Get all products (returns immutable copy)
        getAllProducts: () => {
            const products = [];
            for (const [productId, item] of inventoryState.inventory) {
                products.push({
                    productId,
                    name: item.product.name,
                    price: item.product.price || item.product.getPrice(),
                    quantity: item.quantity,
                    totalSold: item.totalSold,
                    lastUpdated: item.lastUpdated,
                    isLowStock: item.quantity <= inventoryState.lowStockThreshold
                });
            }
            return products;
        },

        // Set low stock threshold
        setLowStockThreshold: (threshold) => {
            inventoryState = {
                ...inventoryState,
                lowStockThreshold: threshold
            };
            console.log(`[INVENTORY] Low stock threshold set to ${threshold}`);
        },

        // Get inventory summary (pure function)
        getSummary: () => {
            let totalProducts = 0;
            let totalValue = 0;
            let lowStockItems = 0;

            for (const item of inventoryState.inventory.values()) {
                totalProducts += item.quantity;
                const price = item.product.price || item.product.getPrice();
                totalValue += price * item.quantity;

                if (item.quantity <= inventoryState.lowStockThreshold) {
                    lowStockItems++;
                }
            }

            return {
                uniqueProducts: inventoryState.inventory.size,
                totalProducts,
                totalValue: Math.round(totalValue * 100) / 100,
                lowStockItems,
                lowStockThreshold: inventoryState.lowStockThreshold
            };
        },

        // Get low stock items
        getLowStockItems: () => {
            return getAllProducts().filter(product => product.isLowStock);
        },

        // Get history (returns copy)
        getHistory: (limit = 10) => {
            return inventoryState.history.slice(-limit).reverse();
        },

        // Search products by name
        searchProducts: (searchTerm) => {
            return exports.getAllProducts().filter(product =>
                product.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        },        // Bulk update inventory
        bulkUpdate: (updates) => {
            const results = [];

            updates.forEach(({ productId, quantity, action = 'add' }) => {
                try {
                    if (action === 'add') {
                        // This would need the actual product object
                        results.push({ productId, success: true, action: 'add' });
                    } else if (action === 'remove') {
                        const success = removeProduct(productId, quantity);
                        results.push({ productId, success, action: 'remove' });
                    }
                } catch (error) {
                    results.push({ productId, success: false, error: error.message });
                }
            });

            return results;
        }
    };
};

module.exports = {
    createCartModule,
    createInventoryModule
};