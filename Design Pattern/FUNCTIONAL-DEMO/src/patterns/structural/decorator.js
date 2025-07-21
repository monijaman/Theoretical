// FUNCTIONAL DECORATOR PATTERN
// Using higher-order functions instead of class decorators
// Benefits: Function composition, immutability, no inheritance chains

// ===========================================
// PRODUCT DECORATOR FUNCTIONS
// ===========================================

const createProductDecorator = () => {
    // Helper function to create new product with additional features
    const enhanceProduct = (product, enhancement) => ({
        ...product,
        price: product.price + enhancement.price,
        features: [...(product.features || []), enhancement.feature],
        getInfo: function () {
            const baseInfo = product.getInfo ? product.getInfo() : `${product.name} - $${product.price}`;
            return `${baseInfo} + ${enhancement.feature}`;
        }
    });

    return {
        // Extended Warranty Decorator (Higher-Order Function)
        addExtendedWarranty: (product) => {
            const enhancement = {
                price: 99.99,
                feature: 'Extended Warranty (1 year)',
                warrantyPeriod: '1 year',
                coverage: 'Full coverage including accidental damage'
            };

            const enhanced = enhanceProduct(product, enhancement);

            // Add warranty-specific methods
            return {
                ...enhanced,
                getWarrantyInfo: () => ({
                    period: enhancement.warrantyPeriod,
                    price: enhancement.price,
                    coverage: enhancement.coverage
                })
            };
        },

        // Gift Wrap Decorator
        addGiftWrap: (product) => {
            const enhancement = {
                price: 9.99,
                feature: 'Gift Wrap (Premium)',
                wrapStyle: 'Premium'
            };

            const enhanced = enhanceProduct(product, enhancement);

            return {
                ...enhanced,
                giftMessage: '',
                getGiftWrapInfo: () => ({
                    style: enhancement.wrapStyle,
                    price: enhancement.price,
                    includes: ['Premium wrapping paper', 'Ribbon', 'Gift card']
                }),
                addGiftMessage: (message) => ({
                    ...enhanced,
                    giftMessage: message
                }),
                getGiftMessage: () => enhanced.giftMessage || 'No message added'
            };
        },

        // Express Shipping Decorator
        addExpressShipping: (product) => {
            const enhancement = {
                price: 24.99,
                feature: 'Express Shipping (24-48 hours)',
                deliveryTime: '24-48 hours'
            };

            const enhanced = enhanceProduct(product, enhancement);

            return {
                ...enhanced,
                getShippingInfo: () => ({
                    type: 'Express',
                    price: enhancement.price,
                    deliveryTime: enhancement.deliveryTime,
                    tracking: true,
                    insurance: true
                }),
                getTrackingNumber: () => `EXP${Math.random().toString(36).substr(2, 10).toUpperCase()}`
            };
        },

        // Insurance Decorator
        addInsurance: (product) => {
            const insuranceRate = 0.05; // 5% of product price
            const insurancePrice = product.price * insuranceRate;

            const enhancement = {
                price: insurancePrice,
                feature: `Insurance ($${insurancePrice.toFixed(2)})`,
                rate: insuranceRate
            };

            const enhanced = enhanceProduct(product, enhancement);

            return {
                ...enhanced,
                getInsuranceInfo: () => ({
                    coverage: product.price,
                    premium: insurancePrice,
                    rate: `${insuranceRate * 100}%`,
                    benefits: ['Theft protection', 'Damage coverage', '24/7 support']
                })
            };
        },

        // Installation Service Decorator
        addInstallation: (product) => {
            const enhancement = {
                price: 149.99,
                feature: 'Professional Installation',
                estimatedTime: '2-4 hours'
            };

            const enhanced = enhanceProduct(product, enhancement);

            return {
                ...enhanced,
                installationSchedule: null,
                getInstallationInfo: () => ({
                    price: enhancement.price,
                    estimatedTime: enhancement.estimatedTime,
                    includes: ['Setup', 'Configuration', 'Basic training', '30-day support'],
                    technician: 'Certified professional'
                }),
                scheduleInstallation: (date, timeSlot) => {
                    const schedule = {
                        date,
                        timeSlot,
                        confirmationNumber: `INST${Math.random().toString(36).substr(2, 8).toUpperCase()}`
                    };

                    return {
                        ...enhanced,
                        installationSchedule: schedule
                    };
                }
            };
        },

        // Discount Decorator (can reduce price)
        addDiscount: (product, discountPercentage) => {
            const discountAmount = product.price * (discountPercentage / 100);

            return {
                ...product,
                originalPrice: product.price,
                price: product.price - discountAmount,
                discountPercentage,
                discountAmount,
                getInfo: function () {
                    const baseInfo = product.getInfo ? product.getInfo() : `${product.name} - $${product.originalPrice}`;
                    return `${baseInfo} - ${discountPercentage}% OFF`;
                },
                getDiscountInfo: () => ({
                    originalPrice: product.price,
                    discountPercentage,
                    discountAmount,
                    finalPrice: product.price - discountAmount,
                    savings: discountAmount
                })
            };
        },

        // Bundle Decorator (adds related products)
        addBundle: (product, bundleItems = []) => {
            const bundleDiscount = 0.10; // 10% bundle discount
            let totalBundlePrice = bundleItems.reduce((sum, item) => sum + item.price, 0);
            const totalPrice = product.price + totalBundlePrice;
            const discountAmount = totalPrice * bundleDiscount;

            return {
                ...product,
                bundleItems: [...bundleItems],
                originalPrice: product.price,
                price: totalPrice - discountAmount,
                bundleDiscount,
                getInfo: function () {
                    const baseInfo = product.getInfo ? product.getInfo() : `${product.name} - $${product.price}`;
                    const itemNames = bundleItems.map(item => item.name).join(', ');
                    return `${baseInfo} + Bundle (${itemNames}) - ${bundleDiscount * 100}% bundle discount`;
                },
                getBundleInfo: () => ({
                    mainProduct: product.getInfo ? product.getInfo() : `${product.name} - $${product.price}`,
                    bundleItems: [...bundleItems],
                    originalPrice: totalPrice,
                    bundleDiscount: bundleDiscount * 100,
                    discountAmount,
                    finalPrice: totalPrice - discountAmount,
                    savings: discountAmount
                }),
                addBundleItem: (item) => exports.addBundle(product, [...bundleItems, item])
            };
        }
    };
};

// ===========================================
// FUNCTIONAL DECORATOR COMPOSITION
// ===========================================

// Compose multiple decorators (function composition)
const compose = (...decorators) => (product) => {
    return decorators.reduce((enhanced, decorator) => decorator(enhanced), product);
};

// Pipe decorators (left to right composition)
const pipe = (...decorators) => (product) => {
    return decorators.reduce((enhanced, decorator) => decorator(enhanced), product);
};

// Create a decorator pipeline
const createDecoratorPipeline = (decoratorSpecs) => (product) => {
    return decoratorSpecs.reduce((enhanced, spec) => {
        const { decorator, params = [] } = spec;
        return decorator(enhanced, ...params);
    }, product);
};

// ===========================================
// ADVANCED FUNCTIONAL DECORATORS
// ===========================================

// Conditional Decorator (only applies if condition is met)
const conditionalDecorator = (condition, decorator) => (product) => {
    return condition(product) ? decorator(product) : product;
};

// Logging Decorator (logs method calls)
const addLogging = (product) => {
    const loggedMethods = {};

    // Wrap methods with logging
    Object.keys(product).forEach(key => {
        if (typeof product[key] === 'function') {
            loggedMethods[key] = function (...args) {
                console.log(`[LOG] Calling ${key} on ${product.name || 'product'}`);
                const result = product[key].apply(this, args);
                console.log(`[LOG] ${key} completed`);
                return result;
            };
        } else {
            loggedMethods[key] = product[key];
        }
    });

    return {
        ...product,
        ...loggedMethods,
        isLogged: true
    };
};

// Caching Decorator (caches method results)
const addCaching = (product) => {
    const cache = new Map();
    const cachedMethods = {};

    Object.keys(product).forEach(key => {
        if (typeof product[key] === 'function') {
            cachedMethods[key] = function (...args) {
                const cacheKey = `${key}_${JSON.stringify(args)}`;

                if (cache.has(cacheKey)) {
                    console.log(`[CACHE] Cache hit for ${key}`);
                    return cache.get(cacheKey);
                }

                console.log(`[CACHE] Cache miss for ${key}`);
                const result = product[key].apply(this, args);
                cache.set(cacheKey, result);
                return result;
            };
        } else {
            cachedMethods[key] = product[key];
        }
    });

    return {
        ...product,
        ...cachedMethods,
        isCached: true,
        clearCache: () => cache.clear(),
        getCacheStats: () => ({
            size: cache.size,
            keys: Array.from(cache.keys())
        })
    };
};

// Validation Decorator (validates method inputs)
const addValidation = (validationRules) => (product) => {
    const validatedMethods = {};

    Object.keys(product).forEach(key => {
        if (typeof product[key] === 'function' && validationRules[key]) {
            validatedMethods[key] = function (...args) {
                const validator = validationRules[key];
                if (!validator(...args)) {
                    throw new Error(`Validation failed for ${key}`);
                }
                return product[key].apply(this, args);
            };
        } else {
            validatedMethods[key] = product[key];
        }
    });

    return {
        ...product,
        ...validatedMethods,
        isValidated: true
    };
};

module.exports = {
    createProductDecorator,
    compose,
    pipe,
    createDecoratorPipeline,
    conditionalDecorator,
    addLogging,
    addCaching,
    addValidation
};