/**
 * The Composite Pattern lets you compose objects into tree structures 
 * to represent part-whole hierarchies.
 * It allows clients to treat individual objects and 
 * compositions of objects uniformly.
 *
 * Real-world frontend example: 
 * representing a UI component tree (e.g., DOM, React component tree).
 */

// Component interface
class UIComponent {
    render() {
        throw new Error('render() must be implemented');
    }
}

// Leaf
class Button extends UIComponent {
    constructor(label) {
        super(); // Calls the constructor of UIComponent. Required when extending a class in JavaScript.
        this.label = label;
    }
    render() {
        console.log(`Render Button: ${this.label}`);
    }
}

// Composite
class Panel extends UIComponent {
    constructor(name) {
        super(); // Calls the constructor of UIComponent. Ensures proper inheritance setup.
        this.name = name;
        this.children = [];
    }
    add(child) {
        this.children.push(child);
    }
    render() {
        console.log(`Render Panel: ${this.name}`);
        this.children.forEach(child => child.render());
    }
}

// Real-world usage: building a UI tree
const mainPanel = new Panel('Main');
const sidebar = new Panel('Sidebar');
const content = new Panel('Content');

sidebar.add(new Button('Menu'));
sidebar.add(new Button('Settings'));

content.add(new Button('Save'));
content.add(new Button('Cancel'));

mainPanel.add(sidebar);
mainPanel.add(content);

// Render the whole UI tree
mainPanel.render();

/*
Output:
Render Panel: Main
Render Panel: Sidebar
Render Button: Menu
Render Button: Settings
Render Panel: Content
Render Button: Save
Render Button: Cancel
*/
