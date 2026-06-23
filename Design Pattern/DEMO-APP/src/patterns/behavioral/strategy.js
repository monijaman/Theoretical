// STRATEGY PATTERN IMPLEMENTATION
// Encapsulates interchangeable algorithms and makes them easily swappable
// Benefits: Runtime algorithm selection, easy to extend, eliminates conditional statements

// ===========================================
// PAYMENT STRATEGY SYSTEM
// ===========================================

// Payment Context - uses different payment strategies
class PaymentContext {
    constructor() {
        this.strategy = null;
        this.strategies = new Map();
        this.paymentHistory = [];

        // Register default strategies
        this.registerStrategy('creditcard', new CreditCardStrategy());
        this.registerStrategy('paypal', new PayPalStrategy());
        this.registerStrategy('crypto', new CryptocurrencyStrategy());
        this.registerStrategy('banktransfer', new BankTransferStrategy());
        this.registerStrategy('digital_wallet', new DigitalWalletStrategy());
    }

    // Register a new payment strategy
    registerStrategy(name, strategy) {
        this.strategies.set(name, strategy);
        console.log(`[PAYMENT] 📝 Registered payment strategy: ${name}`);
    }

    // Set active payment strategy
    setStrategy(strategyName) {
        if (!this.strategies.has(strategyName)) {
            throw new Error(`Payment strategy '${strategyName}' not found`);
        }

        this.strategy = this.strategies.get(strategyName);
        console.log(`[PAYMENT] 💳 Set payment strategy to: ${strategyName}`);
    }

    // Process payment using current strategy
    processPayment(amount, paymentData) {
        if (!this.strategy) {
            throw new Error('No payment strategy selected');
        }

        console.log(`[PAYMENT] 💰 Processing payment of $${amount}`);

        try {
            const result = this.strategy.processPayment(amount, paymentData);

            // Record successful payment
            this.paymentHistory.push({
                timestamp: new Date().toISOString(),
                amount,
                strategy: this.strategy.constructor.name,
                status: 'success',
                transactionId: result.transactionId
            });

            console.log(`[PAYMENT] ✅ Payment successful: ${result.message}`);
            return result;

        } catch (error) {
            // Record failed payment
            this.paymentHistory.push({
                timestamp: new Date().toISOString(),
                amount,
                strategy: this.strategy.constructor.name,
                status: 'failed',
                error: error.message
            });

            console.log(`[PAYMENT] ❌ Payment failed: ${error.message}`);
            throw error;
        }
    }

    // Validate payment data for current strategy
    validatePaymentData(paymentData) {
        if (!this.strategy) {
            throw new Error('No payment strategy selected');
        }

        return this.strategy.validatePaymentData(paymentData);
    }

    // Get available payment methods
    getAvailableStrategies() {
        return Array.from(this.strategies.keys());
    }

    // Get payment history
    getPaymentHistory() {
        return [...this.paymentHistory];
    }

    // Get current strategy info
    getCurrentStrategyInfo() {
        if (!this.strategy) {
            return null;
        }

        return {
            name: this.strategy.constructor.name,
            fees: this.strategy.getProcessingFees(),
            processingTime: this.strategy.getProcessingTime(),
            supportedCurrencies: this.strategy.getSupportedCurrencies()
        };
    }
}

// ===========================================
// PAYMENT STRATEGY INTERFACE
// ===========================================

class PaymentStrategy {
    processPayment(amount, paymentData) {
        throw new Error('processPayment method must be implemented');
    }

    validatePaymentData(paymentData) {
        throw new Error('validatePaymentData method must be implemented');
    }

    getProcessingFees() {
        return { percentage: 0, fixed: 0 };
    }

    getProcessingTime() {
        return 'instant';
    }

    getSupportedCurrencies() {
        return ['USD'];
    }

    generateTransactionId() {
        return Math.random().toString(36).substr(2, 10).toUpperCase();
    }
}

// ===========================================
// CONCRETE PAYMENT STRATEGIES
// ===========================================

// Credit Card Payment Strategy
class CreditCardStrategy extends PaymentStrategy {
    processPayment(amount, paymentData) {
        this.validatePaymentData(paymentData);

        const { cardNumber, cvv, expiryDate, cardholderName } = paymentData;

        // Simulate payment processing
        console.log(`[CREDIT CARD] Processing $${amount} payment`);
        console.log(`[CREDIT CARD] Card: ****-****-****-${cardNumber.slice(-4)}`);

        // Simulate processing delay
        const processingTime = Math.random() * 2000 + 1000;

        return {
            success: true,
            transactionId: this.generateTransactionId(),
            message: `Credit card payment of $${amount} processed successfully`,
            processingTime: `${Math.round(processingTime)}ms`,
            fees: this.calculateFees(amount)
        };
    }

    validatePaymentData(paymentData) {
        const { cardNumber, cvv, expiryDate } = paymentData;

        if (!cardNumber || cardNumber.length < 13) {
            throw new Error('Invalid card number');
        }

        if (!cvv || cvv.length < 3) {
            throw new Error('Invalid CVV');
        }

        if (!expiryDate) {
            throw new Error('Expiry date is required');
        }

        return true;
    }

    getProcessingFees() {
        return { percentage: 2.9, fixed: 0.30 };
    }

    getProcessingTime() {
        return '1-3 seconds';
    }

    calculateFees(amount) {
        const fees = this.getProcessingFees();
        return (amount * fees.percentage / 100) + fees.fixed;
    }
}

// PayPal Payment Strategy
class PayPalStrategy extends PaymentStrategy {
    processPayment(amount, paymentData) {
        this.validatePaymentData(paymentData);

        const { email, password } = paymentData;

        console.log(`[PAYPAL] Processing $${amount} payment for ${email}`);

        return {
            success: true,
            transactionId: this.generateTransactionId(),
            message: `PayPal payment of $${amount} processed successfully`,
            processingTime: '2-5 seconds',
            fees: this.calculateFees(amount)
        };
    }

    validatePaymentData(paymentData) {
        const { email, password } = paymentData;

        if (!email || !email.includes('@')) {
            throw new Error('Valid email is required');
        }

        if (!password || password.length < 6) {
            throw new Error('Password is required');
        }

        return true;
    }

    getProcessingFees() {
        return { percentage: 3.49, fixed: 0.49 };
    }

    getProcessingTime() {
        return '2-5 seconds';
    }

    calculateFees(amount) {
        const fees = this.getProcessingFees();
        return (amount * fees.percentage / 100) + fees.fixed;
    }
}

// Cryptocurrency Payment Strategy
class CryptocurrencyStrategy extends PaymentStrategy {
    processPayment(amount, paymentData) {
        this.validatePaymentData(paymentData);

        const { walletAddress, privateKey, currency = 'BTC' } = paymentData;

        console.log(`[CRYPTO] Processing $${amount} payment in ${currency}`);
        console.log(`[CRYPTO] Wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`);

        // Simulate blockchain confirmation time
        const confirmationTime = Math.random() * 10000 + 5000;

        return {
            success: true,
            transactionId: this.generateTransactionId(),
            message: `Cryptocurrency payment of $${amount} in ${currency} processed`,
            processingTime: `${Math.round(confirmationTime / 1000)} seconds (blockchain confirmation)`,
            fees: this.calculateFees(amount),
            blockchainHash: this.generateBlockchainHash()
        };
    }

    validatePaymentData(paymentData) {
        const { walletAddress, privateKey } = paymentData;

        if (!walletAddress || walletAddress.length < 10) {
            throw new Error('Valid wallet address is required');
        }

        if (!privateKey) {
            throw new Error('Private key is required');
        }

        return true;
    }

    getProcessingFees() {
        return { percentage: 0.5, fixed: 0 };
    }

    getProcessingTime() {
        return '5-15 minutes (blockchain confirmation)';
    }

    getSupportedCurrencies() {
        return ['BTC', 'ETH', 'LTC', 'USD'];
    }

    calculateFees(amount) {
        const fees = this.getProcessingFees();
        return (amount * fees.percentage / 100) + fees.fixed;
    }

    generateBlockchainHash() {
        return Math.random().toString(36).substr(2, 64);
    }
}

// Bank Transfer Strategy
class BankTransferStrategy extends PaymentStrategy {
    processPayment(amount, paymentData) {
        this.validatePaymentData(paymentData);

        const { accountNumber, routingNumber, accountHolderName } = paymentData;

        console.log(`[BANK TRANSFER] Processing $${amount} transfer`);
        console.log(`[BANK TRANSFER] Account: ****${accountNumber.slice(-4)}`);

        return {
            success: true,
            transactionId: this.generateTransactionId(),
            message: `Bank transfer of $${amount} initiated successfully`,
            processingTime: '1-3 business days',
            fees: this.calculateFees(amount)
        };
    }

    validatePaymentData(paymentData) {
        const { accountNumber, routingNumber, accountHolderName } = paymentData;

        if (!accountNumber || accountNumber.length < 8) {
            throw new Error('Valid account number is required');
        }

        if (!routingNumber || routingNumber.length !== 9) {
            throw new Error('Valid routing number is required');
        }

        if (!accountHolderName) {
            throw new Error('Account holder name is required');
        }

        return true;
    }

    getProcessingFees() {
        return { percentage: 0, fixed: 25.00 };
    }

    getProcessingTime() {
        return '1-3 business days';
    }

    calculateFees(amount) {
        const fees = this.getProcessingFees();
        return fees.fixed; // Flat fee for bank transfers
    }
}

// Digital Wallet Strategy
class DigitalWalletStrategy extends PaymentStrategy {
    processPayment(amount, paymentData) {
        this.validatePaymentData(paymentData);

        const { walletId, pin, provider = 'ApplePay' } = paymentData;

        console.log(`[DIGITAL WALLET] Processing $${amount} payment via ${provider}`);

        return {
            success: true,
            transactionId: this.generateTransactionId(),
            message: `${provider} payment of $${amount} processed successfully`,
            processingTime: 'instant',
            fees: this.calculateFees(amount)
        };
    }

    validatePaymentData(paymentData) {
        const { walletId, pin } = paymentData;

        if (!walletId) {
            throw new Error('Wallet ID is required');
        }

        if (!pin || pin.length < 4) {
            throw new Error('Valid PIN is required');
        }

        return true;
    }

    getProcessingFees() {
        return { percentage: 1.5, fixed: 0 };
    }

    getProcessingTime() {
        return 'instant';
    }

    calculateFees(amount) {
        const fees = this.getProcessingFees();
        return (amount * fees.percentage / 100);
    }
}

module.exports = {
    PaymentContext,
    PaymentStrategy,
    CreditCardStrategy,
    PayPalStrategy,
    CryptocurrencyStrategy,
    BankTransferStrategy,
    DigitalWalletStrategy
};