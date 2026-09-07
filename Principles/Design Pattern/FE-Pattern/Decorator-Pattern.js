/**
 * The Decorator Pattern allows behavior to be added to individual objects / components, 
 * without affecting the behavior of other objects from the same class.
 *
 * Use Cases in Frontend:
 * - Adding additional functionalities to UI components (e.g., adding logging, styling, validation).
 * - Enhancing React components using Higher-Order Components (HOCs) or custom hooks.
 * - Middleware functions in frameworks like Express.
 */

/**
 * This file demonstrates the Decorator Pattern.
 * - The `withLogging` function is a decorator: it takes a component (function) and returns a new function
 *   that adds logging behavior before calling the original component.
 * - This allows you to enhance or modify the behavior of the Button component without changing its code.
 * - The original Button remains unchanged; only the wrapped version (`ButtonWithLogging`) has the extra logging.
 * - This pattern is commonly used in React via Higher-Order Components (HOCs) to add cross-cutting concerns.
 */

// Decorator function that adds logging functionality
const withLogging = (Component) => {
    return (props) => {
        console.log(`Rendering component with props:`, props);
        const result = Component(props); // Call the original function
        // Log "Log failed" if the result indicates a failed login
        if (result === false || (typeof result === 'string' && result.toLowerCase().includes('failed'))) {
            console.log('Log failed');
        }
        return result;
    };
};

// Example component function (failed case)
const Button = (props) => {
    console.log(`Button clicked: ${props.label}`);
    return `Login failed for label: ${props.label}`; // Simulate a failed result
};

// Example component function (success case)
const ButtonSuccess = (props) => {
    console.log(`Button clicked: ${props.label}`);
    return `Login success for label: ${props.label}`; // Simulate a success result
};

// Wrap the Button components with the decorator
const ButtonWithLogging = withLogging(Button);
const ButtonSuccessWithLogging = withLogging(ButtonSuccess);

// Usage
console.log(ButtonWithLogging({ label: 'Click Me' })); // Should log "Log failed"
console.log(ButtonSuccessWithLogging({ label: 'Submit' })); // Should NOT log "Log failed"

// In a React app:
// <ButtonWithLogging label="Click Me" />




//#region  Frontend Form Validation Example using Decorators
const createInputComponent = (value = '') => ({
    value,
    render: () => `<input value="${value}" />`,
});

//#region  Decorator functions for form validation
const withRequired = (input) => ({
    ...input,
    validate: () => {
        return input.value.length > 0;
    },
    render: () => {
        const baseInput = input.render();
        return `${baseInput}<span class="required">*</span>`;
    }
});

const withMinLength = (minLength) => (input) => ({
    ...input,
    validate: () => {
        const baseValidation = input.validate ? input.validate() : true;
        return baseValidation && input.value.length >= minLength;
    },
    render: () => {
        const baseInput = input.render();
        return `${baseInput}<span class="hint">Min length: ${minLength}</span>`;
    }
});

const withEmail = (input) => ({
    ...input,
    validate: () => {
        const baseValidation = input.validate ? input.validate() : true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return baseValidation && emailRegex.test(input.value);
    },
    render: () => {
        const baseInput = input.render();
        return `${baseInput}<span class="hint">Enter valid email</span>`;
    }
});

//#endregion

// Usage Example
const emailInput = createInputComponent('test@example');
const decoratedEmailInput = withRequired(withEmail(emailInput));

const passwordInput = createInputComponent('123');
const decoratedPasswordInput = withRequired(withMinLength(8)(passwordInput));

console.log(decoratedEmailInput.render());
console.log('Email valid:', decoratedEmailInput.validate());

console.log(decoratedPasswordInput.render());
console.log('Password valid:', decoratedPasswordInput.validate());
