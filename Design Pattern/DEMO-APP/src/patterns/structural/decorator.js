// DECORATOR PATTERN IMPLEMENTATION
// Adds responsibilities to objects dynamically without altering their structure
// Benefits: More flexible than inheritance, allows behavior modification at runtime

// ===========================================
// PRODUCT DECORATOR SYSTEM
// ===========================================

// Base decorator class
class ProductDecorator {
    constructor(product) {
        this.product = product;
    }

    getPrice() {
        return this.product.getPrice();
    }

    getInfo() {
        return this.product.getInfo();
    }

    // Static factory methods for easy decoration
    static addExtendedWarranty(product) {
        return new ExtendedWarrantyDecorator(product);
    }

    static addGiftWrap(product) {
        return new GiftWrapDecorator(product);
    }

    static addExpressShipping(product) {
        return new ExpressShippingDecorator(product);
    }

    static addInsurance(product) {
        return new InsuranceDecorator(product);
    }

    static addInstallation(product) {
        return new InstallationDecorator(product);
    }
}

// ===========================================
// CONCRETE DECORATORS
// ===========================================

// Extended Warranty Decorator
class ExtendedWarrantyDecorator extends ProductDecorator {
    constructor(product) {
        super(product);
        this.warrantyPrice = 99.99;
        this.warrantyPeriod = '1 year';
    }

    getPrice() {
        return this.product.getPrice() + this.warrantyPrice;
    }

    getInfo() {
        return `${this.product.getInfo()} + Extended Warranty (${this.warrantyPeriod})`;
    }

    getWarrantyInfo() {
        return {
            period: this.warrantyPeriod,
            price: this.warrantyPrice,
            coverage: 'Full coverage including accidental damage'
        };
    }
}

// Gift Wrap Decorator
class GiftWrapDecorator extends ProductDecorator {
    constructor(product) {
        super(product);
        this.giftWrapPrice = 9.99;
        this.wrapStyle = 'Premium';
    }

    getPrice() {
        return this.product.getPrice() + this.giftWrapPrice;
    }

    getInfo() {
        return `${this.product.getInfo()} + Gift Wrap (${this.wrapStyle})`;
    }

    getGiftWrapInfo() {
        return {
            style: this.wrapStyle,
            price: this.giftWrapPrice,
            includes: ['Premium wrapping paper', 'Ribbon', 'Gift card']
        };
    }

    addGiftMessage(message) {
        this.giftMessage = message;
        return this;
    }

    getGiftMessage() {
        return this.giftMessage || 'No message added';
    }
}

// Express Shipping Decorator
class ExpressShippingDecorator extends ProductDecorator {
    constructor(product) {
        super(product);
        this.shippingPrice = 24.99;
        this.deliveryTime = '24-48 hours';
    }

    getPrice() {
        return this.product.getPrice() + this.shippingPrice;
    }

    getInfo() {
        return `${this.product.getInfo()} + Express Shipping (${this.deliveryTime})`;
    }

    getShippingInfo() {
        return {
            type: 'Express',
            price: this.shippingPrice,
            deliveryTime: this.deliveryTime,
            tracking: true,
            insurance: true
        };
    }

    getTrackingNumber() {
        return `EXP${Math.random().toString(36).substr(2, 10).toUpperCase()}`;
    }
}

// Insurance Decorator
class InsuranceDecorator extends ProductDecorator {
    constructor(product) {
        super(product);
        this.insuranceRate = 0.05; // 5% of product price
    }

    getPrice() {
        const productPrice = this.product.getPrice();
        const insurancePrice = productPrice * this.insuranceRate;
        return productPrice + insurancePrice;
    }

    getInfo() {
        const insurancePrice = this.product.getPrice() * this.insuranceRate;
        return `${this.product.getInfo()} + Insurance ($${insurancePrice.toFixed(2)})`;
    }

    getInsuranceInfo() {
        const productPrice = this.product.getPrice();
        const insurancePrice = productPrice * this.insuranceRate;

        return {
            coverage: productPrice,
            premium: insurancePrice,
            rate: `${this.insuranceRate * 100}%`,
            benefits: ['Theft protection', 'Damage coverage', '24/7 support']
        };
    }
}

// Installation Service Decorator
class InstallationDecorator extends ProductDecorator {
    constructor(product) {
        super(product);
        this.installationPrice = 149.99;
        this.estimatedTime = '2-4 hours';
    }

    getPrice() {
        return this.product.getPrice() + this.installationPrice;
    }

    getInfo() {
        return `${this.product.getInfo()} + Professional Installation`;
    }

    getInstallationInfo() {
        return {
            price: this.installationPrice,
            estimatedTime: this.estimatedTime,
            includes: ['Setup', 'Configuration', 'Basic training', '30-day support'],
            technician: 'Certified professional'
        };
    }

    scheduleInstallation(date, timeSlot) {
        this.installationSchedule = {
            date: date,
            timeSlot: timeSlot,
            confirmationNumber: `INST${Math.random().toString(36).substr(2, 8).toUpperCase()}`
        };
        return this.installationSchedule;
    }
}

// ===========================================
// ADVANCED DECORATORS
// ===========================================

// Discount Decorator (can be negative price modifier)
class DiscountDecorator extends ProductDecorator {
    constructor(product, discountPercentage) {
        super(product);
        this.discountPercentage = discountPercentage;
    }

    getPrice() {
        const originalPrice = this.product.getPrice();
        const discountAmount = originalPrice * (this.discountPercentage / 100);
        return originalPrice - discountAmount;
    }

    getInfo() {
        return `${this.product.getInfo()} - ${this.discountPercentage}% OFF`;
    }

    getDiscountInfo() {
        const originalPrice = this.product.getPrice();
        const discountAmount = originalPrice * (this.discountPercentage / 100);

        return {
            originalPrice,
            discountPercentage: this.discountPercentage,
            discountAmount,
            finalPrice: this.getPrice(),
            savings: discountAmount
        };
    }
}

// Bundle Decorator (adds related products)
class BundleDecorator extends ProductDecorator {
    constructor(product, bundleItems = []) {
        super(product);
        this.bundleItems = bundleItems;
        this.bundleDiscount = 0.10; // 10% bundle discount
    }

    getPrice() {
        let totalPrice = this.product.getPrice();

        // Add bundle item prices
        this.bundleItems.forEach(item => {
            totalPrice += item.price;
        });

        // Apply bundle discount
        return totalPrice * (1 - this.bundleDiscount);
    }

    getInfo() {
        const itemNames = this.bundleItems.map(item => item.name).join(', ');
        return `${this.product.getInfo()} + Bundle (${itemNames}) - ${this.bundleDiscount * 100}% bundle discount`;
    }

    getBundleInfo() {
        const originalPrice = this.product.getPrice() +
            this.bundleItems.reduce((sum, item) => sum + item.price, 0);
        const discountAmount = originalPrice * this.bundleDiscount;

        return {
            mainProduct: this.product.getInfo(),
            bundleItems: this.bundleItems,
            originalPrice,
            bundleDiscount: this.bundleDiscount * 100,
            discountAmount,
            finalPrice: this.getPrice(),
            savings: discountAmount
        };
    }

    addBundleItem(item) {
        this.bundleItems.push(item);
        return this;
    }
}

// Export decorators
module.exports = {
    ProductDecorator,
    ExtendedWarrantyDecorator,
    GiftWrapDecorator,
    ExpressShippingDecorator,
    InsuranceDecorator,
    InstallationDecorator,
    DiscountDecorator,
    BundleDecorator
};