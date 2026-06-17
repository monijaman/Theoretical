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

// Functional Menu System Example
const createMenuItem = (name, action) => ({
    type: 'item',
    name,
    action,
    render: (indent = 0) => {
        const spacing = ' '.repeat(indent * 2);
        return `${spacing}📄 ${name}`;
    },
    execute: () => action()
});

const createMenuGroup = (name, children = []) => ({
    type: 'group',
    name,
    children,
    add: (item) => {
        children.push(item);
    },
    render: (indent = 0) => {
        const spacing = ' '.repeat(indent * 2);
        return [
            `${spacing}📁 ${name}`,
            ...children.map(child => child.render(indent + 1))
        ].join('\n');
    },
    execute: () => {
        console.log(`Opening menu group: ${name}`);
        children.forEach(child => {
            if (child.type === 'item') {
                child.execute();
            }
        });
    }
});

// Usage Example: Building a File Menu
const fileMenu = createMenuGroup('File Menu', [
    createMenuItem('New File', () => console.log('Creating new file...')),
    createMenuItem('Open', () => console.log('Opening file dialog...'))
]);

const editMenu = createMenuGroup('Edit Menu', [
    createMenuItem('Cut', () => console.log('Cutting selection...')),
    createMenuItem('Copy', () => console.log('Copying selection...'))
]);

const mainMenu = createMenuGroup('Main Menu');
mainMenu.add(fileMenu);
mainMenu.add(editMenu);
mainMenu.add(createMenuItem('Exit', () => console.log('Exiting application...')));

// Render the menu structure
console.log(mainMenu.render());

// Execute actions in the File Menu
fileMenu.execute();

/* Output will look like:
📁 Main Menu
  📁 File Menu
    📄 New File
    📄 Open
  📁 Edit Menu
    📄 Cut
    📄 Copy
  📄 Exit

Creating new file...
Opening file dialog...
*/
