// FUNCTIONAL STRATEGY PATTERN
// ===========================================
// WHAT IT IS:
// The Strategy pattern defines a family of algorithms, encapsulates each one,
// and makes them interchangeable. It lets the algorithm vary independently
// from clients that use it, enabling runtime algorithm selection.
//
// WHAT IT'S DOING IN THIS APP:
// - Implements different payment processing strategies (credit card, PayPal, crypto)
// - Allows runtime selection of payment methods based on user choice
// - Encapsulates payment logic for each provider in separate functions
// - Provides consistent interface for all payment processing strategies
// - Handles validation and processing logic specific to each payment type
//
// FUNCTIONAL APPROACH BENEFITS:
// - Uses function maps and higher-order functions instead of strategy classes
// - Pure functions for each strategy - predictable and testable
// - Easy strategy swapping at runtime without complex inheritance
// - Functional composition for combining strategies
// - No 'this' context or class dependencies
// ===========================================

// ===========================================
// PAYMENT STRATEGY FUNCTIONS
// ===========================================

// Individual strategy functions (pure functions)
const creditCardStrategy = (amount, paymentData) => {
    const { cardNumber, cvv, expiryDate, cardholderName } = paymentData;

    // Validation
    if (!cardNumber || cardNumber.length < 13) {
        throw new Error('Invalid card number');
    }
    if (!cvv || cvv.length < 3) {
        throw new Error('Invalid CVV');
    }
    if (!expiryDate) {
        throw new Error('Expiry date is required');
    }

    // Process payment
    console.log(`[CREDIT CARD] Processing $${amount} payment`);
    console.log(`[CREDIT CARD] Card: ****-****-****-${cardNumber.slice(-4)}`);

    const fees = (amount * 2.9 / 100) + 0.30;

    return {
        success: true,
        transactionId: Math.random().toString(36).substr(2, 10).toUpperCase(),
        message: `Credit card payment of $${amount} processed successfully`,
        processingTime: '1-3 seconds',
        fees: Math.round(fees * 100) / 100,
        method: 'Credit Card'
    };
};

const paypalStrategy = (amount, paymentData) => {
    const { email, password } = paymentData;

    // Validation
    if (!email || !email.includes('@')) {
        throw new Error('Valid email is required');
    }
    if (!password || password.length < 6) {
        throw new Error('Password is required');
    }

    console.log(`[PAYPAL] Processing $${amount} payment for ${email}`);

    const fees = (amount * 3.49 / 100) + 0.49;

    return {
        success: true,
        transactionId: Math.random().toString(36).substr(2, 10).toUpperCase(),
        message: `PayPal payment of $${amount} processed successfully`,
        processingTime: '2-5 seconds',
        fees: Math.round(fees * 100) / 100,
        method: 'PayPal'
    };
};

const cryptoStrategy = (amount, paymentData) => {
    const { walletAddress, privateKey, currency = 'BTC' } = paymentData;

    // Validation
    if (!walletAddress || walletAddress.length < 10) {
        throw new Error('Valid wallet address is required');
    }
    if (!privateKey) {
        throw new Error('Private key is required');
    }

    console.log(`[CRYPTO] Processing $${amount} payment in ${currency}`);
    console.log(`[CRYPTO] Wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`);

    const fees = amount * 0.5 / 100;

    return {
        success: true,
        transactionId: Math.random().toString(36).substr(2, 10).toUpperCase(),
        message: `Cryptocurrency payment of $${amount} in ${currency} processed`,
        processingTime: '5-15 minutes (blockchain confirmation)',
        fees: Math.round(fees * 100) / 100,
        method: 'Cryptocurrency',
        blockchainHash: Math.random().toString(36).substr(2, 64)
    };
};

const bankTransferStrategy = (amount, paymentData) => {
    const { accountNumber, routingNumber, accountHolderName } = paymentData;

    // Validation
    if (!accountNumber || accountNumber.length < 8) {
        throw new Error('Valid account number is required');
    }
    if (!routingNumber || routingNumber.length !== 9) {
        throw new Error('Valid routing number is required');
    }
    if (!accountHolderName) {
        throw new Error('Account holder name is required');
    }

    console.log(`[BANK TRANSFER] Processing $${amount} transfer`);
    console.log(`[BANK TRANSFER] Account: ****${accountNumber.slice(-4)}`);

    return {
        success: true,
        transactionId: Math.random().toString(36).substr(2, 10).toUpperCase(),
        message: `Bank transfer of $${amount} initiated successfully`,
        processingTime: '1-3 business days',
        fees: 25.00,
        method: 'Bank Transfer'
    };
};

const digitalWalletStrategy = (amount, paymentData) => {
    const { walletId, pin, provider = 'ApplePay' } = paymentData;

    // Validation
    if (!walletId) {
        throw new Error('Wallet ID is required');
    }
    if (!pin || pin.length < 4) {
        throw new Error('Valid PIN is required');
    }

    console.log(`[DIGITAL WALLET] Processing $${amount} payment via ${provider}`);

    const fees = amount * 1.5 / 100;

    return {
        success: true,
        transactionId: Math.random().toString(36).substr(2, 10).toUpperCase(),
        message: `${provider} payment of $${amount} processed successfully`,
        processingTime: 'instant',
        fees: Math.round(fees * 100) / 100,
        method: 'Digital Wallet'
    };
};

// ===========================================
// FUNCTIONAL PAYMENT PROCESSOR
// ===========================================

const createPaymentProcessor = () => {
    // Strategy map (closure)
    let processorState = {
        strategies: new Map([
            ['creditcard', creditCardStrategy],
            ['paypal', paypalStrategy],
            ['crypto', cryptoStrategy],
            ['banktransfer', bankTransferStrategy],
            ['digital_wallet', digitalWalletStrategy]
        ]),
        paymentHistory: [],
        currentStrategy: null
    };

    return {
        // Process payment using specified strategy
        processPayment: (strategyName, amount, paymentData) => {
            const strategy = processorState.strategies.get(strategyName);

            if (!strategy) {
                throw new Error(`Payment strategy '${strategyName}' not found`);
            }

            console.log(`[PAYMENT] 💰 Processing payment of $${amount} using ${strategyName}`);

            try {
                const result = strategy(amount, paymentData);

                // Record successful payment (immutable update)
                const paymentRecord = {
                    timestamp: new Date().toISOString(),
                    amount,
                    strategy: strategyName,
                    status: 'success',
                    transactionId: result.transactionId,
                    fees: result.fees
                };

                processorState = {
                    ...processorState,
                    paymentHistory: [...processorState.paymentHistory, paymentRecord],
                    currentStrategy: strategyName
                };

                console.log(`[PAYMENT] ✅ Payment successful: ${result.message}`);
                return result;

            } catch (error) {
                // Record failed payment
                const paymentRecord = {
                    timestamp: new Date().toISOString(),
                    amount,
                    strategy: strategyName,
                    status: 'failed',
                    error: error.message
                };

                processorState = {
                    ...processorState,
                    paymentHistory: [...processorState.paymentHistory, paymentRecord]
                };

                console.log(`[PAYMENT] ❌ Payment failed: ${error.message}`);
                throw error;
            }
        },

        // Register new payment strategy
        registerStrategy: (name, strategyFunction) => {
            if (typeof strategyFunction !== 'function') {
                throw new Error('Strategy must be a function');
            }

            processorState = {
                ...processorState,
                strategies: new Map(processorState.strategies).set(name, strategyFunction)
            };

            console.log(`[PAYMENT] 📝 Registered payment strategy: ${name}`);
        },

        // Get available strategies
        getAvailableStrategies: () => Array.from(processorState.strategies.keys()),

        // Get payment history (returns copy)
        getPaymentHistory: () => [...processorState.paymentHistory],

        // Get strategy info
        getStrategyInfo: (strategyName) => {
            const strategy = processorState.strategies.get(strategyName);
            if (!strategy) {
                return null;
            }

            // Mock strategy info - in real implementation, strategies could provide metadata
            const strategyInfo = {
                'creditcard': { fees: '2.9% + $0.30', processingTime: '1-3 seconds', currencies: ['USD'] },
                'paypal': { fees: '3.49% + $0.49', processingTime: '2-5 seconds', currencies: ['USD'] },
                'crypto': { fees: '0.5%', processingTime: '5-15 minutes', currencies: ['BTC', 'ETH', 'USD'] },
                'banktransfer': { fees: '$25.00', processingTime: '1-3 business days', currencies: ['USD'] },
                'digital_wallet': { fees: '1.5%', processingTime: 'instant', currencies: ['USD'] }
            };

            return {
                name: strategyName,
                ...strategyInfo[strategyName]
            };
        },

        // Validate payment data for strategy
        validatePaymentData: (strategyName, paymentData) => {
            const strategy = processorState.strategies.get(strategyName);
            if (!strategy) {
                throw new Error(`Strategy '${strategyName}' not found`);
            }

            try {
                // Attempt to process with $0 to validate data without actual processing
                strategy(0, paymentData);
                return true;
            } catch (error) {
                return { valid: false, error: error.message };
            }
        },

        // Get payment statistics
        getPaymentStats: () => {
            const stats = {
                totalPayments: processorState.paymentHistory.length,
                successfulPayments: 0,
                failedPayments: 0,
                totalAmount: 0,
                totalFees: 0,
                strategyBreakdown: {},
                averageAmount: 0
            };

            processorState.paymentHistory.forEach(payment => {
                if (payment.status === 'success') {
                    stats.successfulPayments++;
                    stats.totalAmount += payment.amount;
                    stats.totalFees += payment.fees || 0;
                } else {
                    stats.failedPayments++;
                }

                stats.strategyBreakdown[payment.strategy] =
                    (stats.strategyBreakdown[payment.strategy] || 0) + 1;
            });

            stats.averageAmount = stats.successfulPayments > 0 ?
                Math.round((stats.totalAmount / stats.successfulPayments) * 100) / 100 : 0;

            return stats;
        },

        // Create payment strategy with middleware
        createStrategyWithMiddleware: (baseStrategy, ...middlewares) => {
            return (amount, paymentData) => {
                // Apply middleware functions in sequence
                let processedData = paymentData;

                for (const middleware of middlewares) {
                    processedData = middleware(amount, processedData) || processedData;
                }

                return baseStrategy(amount, processedData);
            };
        }
    };
};

// ===========================================
// PAYMENT MIDDLEWARE FUNCTIONS
// ===========================================

// Logging middleware
const loggingMiddleware = (amount, paymentData) => {
    console.log(`[MIDDLEWARE] Logging payment attempt: $${amount}`);
    return paymentData;
};

// Fraud detection middleware
const fraudDetectionMiddleware = (amount, paymentData) => {
    // Simple fraud detection rules
    if (amount > 10000) {
        console.log(`[MIDDLEWARE] Large transaction alert: $${amount}`);
    }

    // Check for suspicious patterns
    if (paymentData.cardNumber && paymentData.cardNumber.includes('0000')) {
        throw new Error('Suspicious card number detected');
    }

    return paymentData;
};

// Currency conversion middleware
const currencyConversionMiddleware = (targetCurrency = 'USD') => {
    return (amount, paymentData) => {
        // Mock currency conversion
        const exchangeRates = { USD: 1, EUR: 0.85, GBP: 0.75 };
        const rate = exchangeRates[targetCurrency] || 1;

        console.log(`[MIDDLEWARE] Converting to ${targetCurrency}, rate: ${rate}`);

        return {
            ...paymentData,
            originalAmount: amount,
            convertedAmount: amount * rate,
            currency: targetCurrency
        };
    };
};

// ===========================================
// FUNCTIONAL STRATEGY COMPOSITION
// ===========================================

// Compose multiple strategies for fallback
const createFallbackProcessor = (strategies) => {
    return async (amount, paymentData) => {
        const errors = [];

        for (const strategy of strategies) {
            try {
                return await strategy(amount, paymentData);
            } catch (error) {
                errors.push(error.message);
                console.log(`[FALLBACK] Strategy failed: ${error.message}`);
            }
        }

        throw new Error(`All payment strategies failed: ${errors.join(', ')}`);
    };
};

// Create conditional strategy selector
const createConditionalProcessor = (conditions) => {
    return (amount, paymentData) => {
        for (const { condition, strategy } of conditions) {
            if (condition(amount, paymentData)) {
                return strategy(amount, paymentData);
            }
        }

        throw new Error('No suitable payment strategy found');
    };
};

module.exports = {
    createPaymentProcessor,
    creditCardStrategy,
    paypalStrategy,
    cryptoStrategy,
    bankTransferStrategy,
    digitalWalletStrategy,
    loggingMiddleware,
    fraudDetectionMiddleware,
    currencyConversionMiddleware,
    createFallbackProcessor,
    createConditionalProcessor
};