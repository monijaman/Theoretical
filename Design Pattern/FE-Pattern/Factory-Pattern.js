/**
 * The Factory Pattern provides an interface for creating objects, 
 * but allows subclasses to alter the type of objects that will be created.
 * 
 * Use Case in Frontend:
Creating different components dynamically based on input.
Generating various types of charts, buttons, or UI elements.
Abstracting the creation of objects with shared interface.
 */

class Button {
    constructor(type) {
        this.type = type;
    }

    render() {
        console.log(`Render a ${this.type} Butotn`)
    }
}

class ButtonFactory {
    createButton(type) {
        return new Button(type);
    }
}

const factory = new ButtonFactory();
const primaryButton = factory.createButton('primary')
primaryButton.render();