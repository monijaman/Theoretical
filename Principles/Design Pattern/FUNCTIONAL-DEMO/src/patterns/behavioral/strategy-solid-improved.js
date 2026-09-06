// SOLID-COMPLIANT STRATEGY PATTERN IMPROVEMENT
// This demonstrates how to refactor the strategy pattern to better follow SOLID principles

// ===========================================
// L - LISKOV SUBSTITUTION: CONSISTENT INTERFACE
// ===========================================

// Standard result interface - all strategies must return this structure
const createPaymentResult = (transactionId, message, fees, method, processingTime, metadata = {}) => ({
    success: true,
    transactionId,
    message,
    fees: Math.round(fees * 100) / 100,
    method,
    processingTime,
    metadata // Extra fields go here (like blockchainHash)
});

// Updated crypto strategy following LSP
const improvedCryptoStrategy = (amount, paymentData) => {
    const { walletAddress, privateKey, currency = 'BTC' } = paymentData;

    if (!walletAddress || walletAddress.length < 10) {
        throw new Error('Valid wallet address is required');
    }
    if (!privateKey) {
        throw new Error('Private key is required');
    }

    console.log(`[CRYPTO] Processing $${amount} payment in ${currency}`);
    const fees = amount * 0.5 / 100;

    return createPaymentResult(
        Math.random().toString(36).substr(2, 10).toUpperCase(),
        `Cryptocurrency payment of $${amount} in ${currency} processed`,
        fees,
        'Cryptocurrency',
        '5-15 minutes (blockchain confirmation)',
        { 
            blockchainHash: Math.random().toString(36).substr(2, 64),
            currency 
        }
    );
};

// ===========================================
// I - INTERFACE SEGREGATION: SEPARATE CONCERNS
// ===========================================

// S - Single Responsibility: Core payment processing only
const createCoreProcessor = (strategies = new Map()) => ({
    processPayment: (strategyName, amount, paymentData) => {
        const strategy = strategies.get(strategyName);
        if (!strategy) {
            throw new Error(`Payment strategy '${strategyName}' not found`);
        }
        
        console.log(`[PAYMENT] 💰 Processing payment of $${amount} using ${strategyName}`);
        return strategy(amount, paymentData);
    }
});

// S - Single Responsibility: Strategy management only
const createStrategyManager = (strategies = new Map()) => ({
    registerStrategy: (name, strategyFunction) => {
        if (typeof strategyFunction !== 'function') {
            throw new Error('Strategy must be a function');
        }
        strategies.set(name, strategyFunction);
        console.log(`[PAYMENT] 📝 Registered payment strategy: ${name}`);
    },
    
    getAvailableStrategies: () => Array.from(strategies.keys()),
    
    validatePaymentData: (strategyName, paymentData) => {
        const strategy = strategies.get(strategyName);
        if (!strategy) {
            throw new Error(`Strategy '${strategyName}' not found`);
        }
        
        try {
            strategy(0, paymentData);
            return { valid: true };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
});

// S - Single Responsibility: History tracking only
const createPaymentHistory = () => {
    let paymentHistory = [];
    
    return {
        recordPayment: (paymentRecord) => {
            paymentHistory = [...paymentHistory, {
                ...paymentRecord,
                timestamp: new Date().toISOString()
            }];
        },
        
        getPaymentHistory: () => [...paymentHistory],
        
        getPaymentStats: () => {
            const stats = {
                totalPayments: paymentHistory.length,
                successfulPayments: 0,
                failedPayments: 0,
                totalAmount: 0,
                totalFees: 0,
                strategyBreakdown: {},
                averageAmount: 0
            };

            paymentHistory.forEach(payment => {
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
        }
    };
};

// D - Dependency Inversion: Strategy info as injected metadata
const createStrategyInfoProvider = (strategyMetadata = new Map()) => ({
    getStrategyInfo: (strategyName) => {
        return strategyMetadata.get(strategyName) || null;
    },
    
    setStrategyInfo: (strategyName, info) => {
        strategyMetadata.set(strategyName, { name: strategyName, ...info });
    }
});

// ===========================================
// COMPOSED SOLID-COMPLIANT PROCESSOR
// ===========================================

const createSOLIDPaymentProcessor = () => {
    const strategies = new Map();
    const coreProcessor = createCoreProcessor(strategies);
    const strategyManager = createStrategyManager(strategies);
    const paymentHistory = createPaymentHistory();
    const infoProvider = createStrategyInfoProvider();
    
    // Enhanced processor with history tracking
    const enhancedProcessor = {
        processPayment: (strategyName, amount, paymentData) => {
            try {
                const result = coreProcessor.processPayment(strategyName, amount, paymentData);
                
                paymentHistory.recordPayment({
                    amount,
                    strategy: strategyName,
                    status: 'success',
                    transactionId: result.transactionId,
                    fees: result.fees
                });
                
                console.log(`[PAYMENT] ✅ Payment successful: ${result.message}`);
                return result;
                
            } catch (error) {
                paymentHistory.recordPayment({
                    amount,
                    strategy: strategyName,
                    status: 'failed',
                    error: error.message
                });
                
                console.log(`[PAYMENT] ❌ Payment failed: ${error.message}`);
                throw error;
            }
        }
    };
    
    return {
        // Core interface - what most clients need
        core: enhancedProcessor,
        
        // Admin interface - for managing strategies
        admin: strategyManager,
        
        // Analytics interface - for reporting
        analytics: {
            getPaymentHistory: paymentHistory.getPaymentHistory,
            getPaymentStats: paymentHistory.getPaymentStats
        },
        
        // Info interface - for strategy information
        info: infoProvider
    };
};

// ===========================================
// USAGE EXAMPLES
// ===========================================

const processor = createSOLIDPaymentProcessor();

// Register strategies with metadata
processor.admin.registerStrategy('creditcard', creditCardStrategy);
processor.info.setStrategyInfo('creditcard', {
    fees: '2.9% + $0.30',
    processingTime: '1-3 seconds',
    currencies: ['USD']
});

// Basic client - only needs core functionality
const basicClient = processor.core;
// basicClient.processPayment('creditcard', 100, {...});

// Admin client - needs strategy management
const adminClient = { ...processor.core, ...processor.admin };

// Analytics client - needs reporting
const analyticsClient = { ...processor.core, ...processor.analytics };

module.exports = {
    createSOLIDPaymentProcessor,
    createPaymentResult,
    improvedCryptoStrategy,
    createCoreProcessor,
    createStrategyManager,
    createPaymentHistory,
    createStrategyInfoProvider
};
