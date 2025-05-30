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