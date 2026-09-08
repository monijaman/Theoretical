/**
 * The Strategy Pattern is a behavioral design pattern that 
 * defines a family of algorithms, encapsulates each one, 
 * and makes them interchangeable. This pattern lets the 
 * algorithm vary independently from clients that use it.
 * 
 * Use Case in Frontend:
** Implementing different sorting or filtering algorithms for data.
** Handling different payment methods or authentication strategies.
** Switching between different ways of rendering components.
** To avoid complex conditional logic (like many if-else or switch statements).
** To follow the Open/Closed Principle (open for extension, closed for modification).
 */

/**
 * Strategy Pattern Examples in Frontend Development
 */

/**
 * Strategy Pattern using Functional Programming Approach
 */

// 1. Form Validation Strategies
const createEmailValidator = () => (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const createPasswordValidator = () => (password) => {
    return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
};

const createPhoneValidator = () => (phone) => {
    return /^\d{10}$/.test(phone);
};

const createFormValidator = () => {
    const validators = new Map();

    return {
        setStrategy: (field, validatorFn) => {
            validators.set(field, validatorFn);
        },
        validateField: (field, value) => {
            const validator = validators.get(field);
            return validator ? validator(value) : true;
        }
    };
};

// Usage: Form Validation
const formValidator = createFormValidator();
formValidator.setStrategy('email', createEmailValidator());
formValidator.setStrategy('password', createPasswordValidator());
formValidator.setStrategy('phone', createPhoneValidator());

// 2. Payment Processing Strategies
const createCreditCardPayment = () => (amount) =>
    `Processing $${amount} via Credit Card...`;

const createPayPalPayment = () => (amount) =>
    `Processing $${amount} via PayPal...`;

const createCryptoPayment = () => (amount) =>
    `Processing $${amount} via Cryptocurrency...`;

const createPaymentProcessor = (defaultStrategy) => {
    let currentStrategy = defaultStrategy;

    return {
        setStrategy: (newStrategy) => {
            currentStrategy = newStrategy;
        },
        processPayment: (amount) => currentStrategy(amount)
    };
};

// 3. Responsive Rendering Strategies
const createMobileRenderer = () => (data) => `
    <div class="mobile-view">
        <h2>${data.title}</h2>
        <p>${data.description}</p>
    </div>
`;

const createTabletRenderer = () => (data) => `
    <div class="tablet-view">
        <div class="header">${data.title}</div>
        <div class="content">${data.description}</div>
    </div>
`;

const createDesktopRenderer = () => (data) => `
    <div class="desktop-view">
        <div class="sidebar">${data.title}</div>
        <div class="main-content">${data.description}</div>
    </div>
`;

const createResponsiveRenderer = () => {
    const detectDevice = () => {
        const width = window.innerWidth;
        if (width < 768) return createMobileRenderer();
        if (width < 1024) return createTabletRenderer();
        return createDesktopRenderer();
    };

    let currentStrategy = detectDevice();

    return {
        render: (data) => currentStrategy(data),
        updateStrategy: () => {
            currentStrategy = detectDevice();
        }
    };
};

// Usage Examples:
// 1. Form Validation
console.log(formValidator.validateField('email', 'test@example.com')); // true
console.log(formValidator.validateField('password', 'Weak')); // false

// 2. Payment Processing
const paymentProcessor = createPaymentProcessor(createCreditCardPayment());
console.log(paymentProcessor.processPayment(100));
paymentProcessor.setStrategy(createPayPalPayment());
console.log(paymentProcessor.processPayment(50));

// 3. Responsive Rendering
const responsiveRenderer = createResponsiveRenderer();
const content = {
    title: 'Welcome',
    description: 'This is a responsive component'
};

console.log(responsiveRenderer.render(content));
window.addEventListener('resize', () => {
    responsiveRenderer.updateStrategy();
    console.log(responsiveRenderer.render(content));
});