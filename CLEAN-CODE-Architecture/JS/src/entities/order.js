// Order entity: pure function for creating and validating an order
function createOrderEntity({ id, userId, items, total }) {
    if (!userId || !Array.isArray(items) || items.length === 0) {
        throw new Error('Order must have a userId and at least one item');
    }
    if (typeof total !== 'number' || total < 0) {
        throw new Error('Order total must be a non-negative number');
    }
    // Add more validation as needed
    return Object.freeze({ id, userId, items, total });
}

module.exports = { createOrderEntity };
