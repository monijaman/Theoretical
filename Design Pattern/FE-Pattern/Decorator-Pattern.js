/**
 * The Decorator Pattern allows behavior to be added to individual objects / components, 
 * without affecting the behavior of other objects from the same class.


Adding additional functionalities to UI components (e.g., adding logging, styling, validation).
Enhancing React components using Higher-Order Components (HOCs) or custom hooks.
Middleware functions in frameworks like Express.
 */

// Decorator function that adds logging functionality
const withLogging = (Component) => {
    return (props) => {
        console.log(`Rendering component with props:`, props);
        return Component(props); // Call the original function instead of returning JSX
    };
};

// Example component function
const Button = (props) => {
    console.log(`Button clicked: ${props.label}`);
    return `Button rendered with label: ${props.label}`;
};

// Wrap the Button component with the decorator
const ButtonWithLogging = withLogging(Button);

// Usage
console.log(ButtonWithLogging({ label: 'Click Me' }));



// In a React app:
// <ButtonWithLogging label="Click Me" />
