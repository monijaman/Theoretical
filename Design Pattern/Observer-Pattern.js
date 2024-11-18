/**
 * The Observer Pattern defines a one-to-many relationship between objects 
 * so that when one object changes state, 
 * all its dependents are notified and updated automatically.
 * 
 * Use Case in Frontend:
** Implementing event systems (like the EventEmitter).
** State management libraries (e.g., Redux, Zustand) to reactively update UI components.
** Real-time data updates (e.g., chat applications, notifications).
 */

class Observable {
    constructor() {
        // Initialize an empty array to store observers
        this.observers = [];
    }

    subscribe(fn) {
        // Add a new observer function to the list of observers
        this.observers.push(fn);
    }

    unsubscribe(fn) {
        // Remove a specific observer function from the list
        this.observers = this.observers.filter(observer => observer !== fn);
    }

    notify(data) {
        // Notify all observers with the provided data
        this.observers.forEach(observer => observer(data));
    }
}
//Usate

// Create an Observable instance
const observable = new Observable();

// Define observer functions
const observer1 = (data) => {
    console.log('Observer 1:', data);
};

const observer2 = (data) => {
    console.log('Observer 2:', data);
};

// Subscribe observers
observable.subscribe(observer1);
observable.subscribe(observer2);

// Notify observers with data
observable.notify('Hello, observers!');

// Unsubscribe an observer
observable.unsubscribe(observer1);

// Notify observers again
observable.notify('Another notification');