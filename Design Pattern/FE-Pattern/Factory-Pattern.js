/**
 * The Factory Pattern provides an interface for creating objects, 
 * but allows subclasses to alter the type of objects that will be created.
 * 
 * Use Case in Frontend:
 * - Creating different components dynamically based on input.
 * - Generating various types of charts, buttons, or UI elements.
 * - Abstracting the creation of objects with shared interface.
 */

/**
 * This file demonstrates the Factory Pattern.
 * - The ButtonFactory class encapsulates the logic for creating Button objects.
 * - The consumer does not instantiate Button directly, but instead uses the factory's createButton method.
 * - This allows for flexible object creation and easy extension (e.g., different button types or subclasses).
 * - The pattern decouples the client code from the concrete classes being instantiated.
 */

//#region  Class-based Factory Pattern =====
class Button {
    constructor(type) {

        this.type = type;
    }

    render() {
        console.log(`Render a ${this.type} Button`);
    }
}

class ButtonFactory {
    createButton(type) {
        return new Button(type);
    }
}

const factory = new ButtonFactory();
const primaryButton = factory.createButton('primary');
primaryButton.render();

//#region Functional Factory Pattern =====
function createButton(type) {
    // This function returns an object that "remembers" the 'type' argument.
    //  this is a closure: the returned object's render method can access 'type' from the outer function scope.
    return {
        type,
        render() {
            console.log(`Render a ${type} Button`);
        }
    };
}

const secondaryButton = createButton('secondary');
const sertiaryButton = createButton('Tertiary');
secondaryButton.render();
secondaryButton.render();
sertiaryButton.render();

//#endregion

//#region Frontend UI Elements Factory Example
const createFormElement = (type, config) => {
    const defaultConfig = {
        label: '',
        name: '',
        placeholder: '',
        validation: () => true
    };

    const elementConfig = { ...defaultConfig, ...config };

    const elements = {
        text: () => ({
            render: () => ({
                type: 'text',
                ...elementConfig,
                validate: (value) => elementConfig.validation(value)
            })
        }),

        email: () => ({
            render: () => ({
                type: 'email',
                ...elementConfig,
                validate: (value) => {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    return emailRegex.test(value) && elementConfig.validation(value);
                }
            })
        }),

        password: () => ({
            render: () => ({
                type: 'password',
                ...elementConfig,
                validate: (value) => {
                    const minLength = 8;
                    return value.length >= minLength && elementConfig.validation(value);
                }
            })
        })
    };

    return elements[type] ? elements[type]() : null;
};

// Usage Example:
const emailInput = createFormElement('email', {
    label: 'Email Address',
    name: 'email',
    placeholder: 'Enter your email',
    validation: (value) => value.includes('@company.com')
});

const passwordInput = createFormElement('password', {
    label: 'Password',
    name: 'password',
    placeholder: 'Enter your password'
});

console.log(emailInput.render());
console.log(passwordInput.render());