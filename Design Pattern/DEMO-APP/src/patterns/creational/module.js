// MODULE PATTERN IMPLEMENTATION
// Encapsulates related functions and variables in a single unit
// Benefits: Namespace pollution prevention, encapsulation, organized code structure

// ===========================================
// SHOPPING CART MODULE
// ===========================================

const CartModule = (function () {
    // Private variables and functions (closure scope)
    let cartInstances = new Map();
    let nextCartId = 1;

    // Private helper functions
    function generateCartId() {
        return `cart_${nextCartId++}`;
    }

    function calculateItemTotal(item, quantity) {
        return item.getPrice() * quantity;
    }

    function validateItem(item) {
        return item && typeof item.getPrice === 'function' && typeof item.getInfo === 'function';
    }

    // Cart constructor function
    function Cart() {
        // Private cart variables
        let items = new Map();
        let cartId = generateCartId();
        let createdAt = new Date();
        let lastModified = new Date();

        // Private methods
        function updateLastModified() {
            lastModified = new Date();
        }

        function findItemByName(itemName) {
            for (let [item, quantity] of items) {
                if (item.name === itemName) {
                    return { item, quantity };
                }
            }
            return null;
        }

        // Public interface (revealing module pattern)
        return {
            // Add item to cart
            addItem(item, quantity = 1) {
                if (!validateItem(item)) {
                    throw new Error('Invalid item: must have getPrice() and getInfo() methods');
                }

                if (quantity <= 0) {
                    throw new Error('Quantity must be greater than 0');
                }

                if (items.has(item)) {
                    // Item already exists, update quantity
                    items.set(item, items.get(item) + quantity);
                } else {
                    // New item
                    items.set(item, quantity);
                }

                updateLastModified();
                console.log(`[CART ${cartId}] Added ${quantity}x ${item.name}`);
                return this; // Enable method chaining
            },

            // Remove item from cart
            removeItem(itemName) {
                const found = findItemByName(itemName);
                if (found) {
                    items.delete(found.item);
                    updateLastModified();
                    console.log(`[CART ${cartId}] Removed ${itemName}`);
                    return true;
                }
                console.log(`[CART ${cartId}] Item ${itemName} not found`);
                return false;
            },

            // Update item quantity
            updateQuantity(itemName, newQuantity) {
                if (newQuantity <= 0) {
                    return this.removeItem(itemName);
                }

                const found = findItemByName(itemName);
                if (found) {
                    items.set(found.item, newQuantity);
                    updateLastModified();
                    console.log(`[CART ${cartId}] Updated ${itemName} quantity to ${newQuantity}`);
                    return true;
                }
                console.log(`[CART ${cartId}] Item ${itemName} not found`);
                return false;
            },

            // Get total price
            getTotal() {
                let total = 0;
                for (let [item, quantity] of items) {
                    total += calculateItemTotal(item, quantity);
                }
                return Math.round(total * 100) / 100; // Round to 2 decimal places
            },

            // Get item count
            getItemCount() {
                let count = 0;
                for (let quantity of items.values()) {
                    count += quantity;
                }
                return count;
            },

            // Get all items
            getItems() {
                const itemList = [];
                for (let [item, quantity] of items) {
                    itemList.push({
                        name: item.name,
                        price: item.getPrice(),
                        quantity: quantity,
                        total: calculateItemTotal(item, quantity),
                        info: item.getInfo()
                    });
                }
                return itemList;
            },

            // Clear cart
            clear() {
                const itemCount = this.getItemCount();
                items.clear();
                updateLastModified();
                console.log(`[CART ${cartId}] Cleared ${itemCount} items`);
                return this;
            },

            // Get cart info
            getInfo() {
                return {
                    cartId,
                    itemCount: this.getItemCount(),
                    total: this.getTotal(),
                    createdAt,
                    lastModified
                };
            },

            // Check if cart is empty
            isEmpty() {
                return items.size === 0;
            },

            // Get cart ID
            getId() {
                return cartId;
            },

            // Apply discount
            applyDiscount(percentage) {
                if (percentage < 0 || percentage > 100) {
                    throw new Error('Discount percentage must be between 0 and 100');
                }

                const originalTotal = this.getTotal();
                const discountAmount = (originalTotal * percentage) / 100;
                const newTotal = originalTotal - discountAmount;

                console.log(`[CART ${cartId}] Applied ${percentage}% discount: $${originalTotal} → $${newTotal}`);
                return {
                    originalTotal,
                    discountPercentage: percentage,
                    discountAmount,
                    newTotal
                };
            }
        };
    }

    // ===========================================
    // PUBLIC API
    // ===========================================

    return {
        // Create a new cart instance
        createCart() {
            const cart = new Cart();
            cartInstances.set(cart.getId(), cart);
            console.log(`[CART MODULE] Created new cart: ${cart.getId()}`);
            return cart;
        },

        // Get existing cart by ID
        getCart(cartId) {
            return cartInstances.get(cartId) || null;
        },

        // Get all active carts
        getAllCarts() {
            return Array.from(cartInstances.values());
        },

        // Delete cart
        deleteCart(cartId) {
            const deleted = cartInstances.delete(cartId);
            if (deleted) {
                console.log(`[CART MODULE] Deleted cart: ${cartId}`);
            }
            return deleted;
        },

        // Get module statistics
        getStats() {
            let totalItems = 0;
            let totalValue = 0;

            for (let cart of cartInstances.values()) {
                totalItems += cart.getItemCount();
                totalValue += cart.getTotal();
            }

            return {
                activeCarts: cartInstances.size,
                totalItems,
                totalValue: Math.round(totalValue * 100) / 100,
                nextCartId: nextCartId
            };
        },

        // Clear all carts
        clearAllCarts() {
            const count = cartInstances.size;
            cartInstances.clear();
            console.log(`[CART MODULE] Cleared ${count} carts`);
            return count;
        }
    };
})();

// ===========================================
// INVENTORY MODULE
// ===========================================

const InventoryModule = (function () {
    // Private variables
    let inventory = new Map();
    let lowStockThreshold = 10;
    let reorderPoints = new Map();

    // Private functions
    function checkLowStock(productName, currentStock) {
        if (currentStock <= lowStockThreshold) {
            console.log(`[INVENTORY] ⚠️ Low stock alert: ${productName} (${currentStock} remaining)`);
            return true;
        }
        return false;
    }

    function generateProductId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // Public interface
    return {
        // Add product to inventory
        addProduct(product, quantity) {
            const productId = product.id || generateProductId();

            if (inventory.has(productId)) {
                // Update existing product quantity
                inventory.get(productId).quantity += quantity;
            } else {
                // Add new product
                inventory.set(productId, {
                    product,
                    quantity,
                    lastUpdated: new Date(),
                    totalSold: 0
                });
            }

            console.log(`[INVENTORY] Added ${quantity}x ${product.name} (ID: ${productId})`);
            return productId;
        },

        // Remove product from inventory
        removeProduct(productId, quantity) {
            if (!inventory.has(productId)) {
                console.log(`[INVENTORY] Product ${productId} not found`);
                return false;
            }

            const item = inventory.get(productId);
            if (item.quantity < quantity) {
                console.log(`[INVENTORY] Insufficient stock for ${item.product.name}`);
                return false;
            }

            item.quantity -= quantity;
            item.lastUpdated = new Date();
            item.totalSold += quantity;

            checkLowStock(item.product.name, item.quantity);

            console.log(`[INVENTORY] Removed ${quantity}x ${item.product.name}`);
            return true;
        },

        // Get product stock
        getStock(productId) {
            const item = inventory.get(productId);
            return item ? item.quantity : 0;
        },

        // Check if product is available
        isAvailable(productId, quantity = 1) {
            return this.getStock(productId) >= quantity;
        },

        // Get all products
        getAllProducts() {
            const products = [];
            for (let [productId, item] of inventory) {
                products.push({
                    productId,
                    name: item.product.name,
                    price: item.product.getPrice(),
                    quantity: item.quantity,
                    totalSold: item.totalSold,
                    lastUpdated: item.lastUpdated
                });
            }
            return products;
        },

        // Set low stock threshold
        setLowStockThreshold(threshold) {
            lowStockThreshold = threshold;
            console.log(`[INVENTORY] Low stock threshold set to ${threshold}`);
        },

        // Get inventory summary
        getSummary() {
            let totalProducts = 0;
            let totalValue = 0;
            let lowStockItems = 0;

            for (let item of inventory.values()) {
                totalProducts += item.quantity;
                totalValue += item.product.getPrice() * item.quantity;
                if (item.quantity <= lowStockThreshold) {
                    lowStockItems++;
                }
            }

            return {
                uniqueProducts: inventory.size,
                totalProducts,
                totalValue: Math.round(totalValue * 100) / 100,
                lowStockItems,
                lowStockThreshold
            };
        }
    };
})();

module.exports = {
    CartModule,
    InventoryModule
};