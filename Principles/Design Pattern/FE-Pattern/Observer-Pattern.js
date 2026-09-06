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

/**
 * This file demonstrates the Observer Pattern.
 * - The Observable class maintains a list of observer functions (subscribers).
 * - Observers can subscribe (register) or unsubscribe (deregister) to receive updates.
 * - When the Observable's state changes (or notify is called), all subscribed observers are called with the new data.
 * - This pattern decouples the subject (Observable) from its observers, allowing for flexible and reactive event handling.
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
observable.unsubscribe(observer1);  // remove it to stop receiving updates

// Notify observers again
observable.notify('Another notification');

/**
 * Functional Observer Pattern Examples for Frontend Development
 */

// 1. Event System (EventEmitter)
const createEventEmitter = () => {
    const events = new Map();

    return {
        on: (event, callback) => {
            if (!events.has(event)) {
                events.set(event, new Set());
            }
            events.get(event).add(callback);

            // Return unsubscribe function
            return () => events.get(event).delete(callback);
        },
        emit: (event, data) => {
            if (events.has(event)) {
                events.get(event).forEach(callback => callback(data));
            }
        }
    };
};

// 2. Simple State Management (like mini-Redux)
const createStore = (initialState = {}) => {
    let state = initialState;
    const subscribers = new Set();

    return {
        getState: () => state,
        setState: (newState) => {
            state = { ...state, ...newState };
            subscribers.forEach(subscriber => subscriber(state));
        },
        subscribe: (callback) => {
            subscribers.add(callback);
            return () => subscribers.delete(callback);
        }
    };
};

// 3. Real-time Chat System
const createChatRoom = () => {
    const subscribers = new Set();
    const messages = [];

    return {
        subscribe: (callback) => {
            subscribers.add(callback);
            callback(messages); // Send current messages immediately
            return () => subscribers.delete(callback);
        },
        sendMessage: (user, text) => {
            const message = {
                id: Date.now(),
                user,
                text,
                timestamp: new Date().toISOString()
            };
            messages.push(message);
            subscribers.forEach(subscriber => subscriber(messages));
        }
    };
};

// Usage Examples:

// 1. Event System Example
const userEvents = createEventEmitter();

// Subscribe to events
const unsubscribeUserLogin = userEvents.on('login', (user) =>
    console.log('User logged in:', user)
);

const unsubscribeUserLogout = userEvents.on('logout', () =>
    console.log('User logged out')
);

// Emit events
userEvents.emit('login', { id: 1, name: 'John' });
userEvents.emit('logout');

// Unsubscribe from an event
unsubscribeUserLogin();

// 2. State Management Example
const todoStore = createStore({
    todos: [],
    filter: 'all'
});

// Subscribe to state changes
const unsubscribeTodos = todoStore.subscribe((state) =>
    console.log('Todos updated:', state.todos)
);

// Update state
todoStore.setState({
    todos: [
        { id: 1, text: 'Learn Observer Pattern', completed: false }
    ]
});

// 3. Chat Room Example
const chatRoom = createChatRoom();

// Subscribe multiple users
const unsubscribeUser1 = chatRoom.subscribe((messages) =>
    console.log('User 1 received:', messages)
);

const unsubscribeUser2 = chatRoom.subscribe((messages) =>
    console.log('User 2 received:', messages)
);

// Send messages
chatRoom.sendMessage('Alice', 'Hello everyone!');
chatRoom.sendMessage('Bob', 'Hi Alice!');

// Unsubscribe a user
unsubscribeUser2();

// Example of combining patterns for a real application
const createNotificationSystem = () => {
    const eventEmitter = createEventEmitter();
    const store = createStore({ notifications: [] });

    return {
        // Subscribe to specific notification types
        onNotification: (type, callback) =>
            eventEmitter.on(type, callback),

        // Subscribe to all notifications
        subscribeToAll: (callback) =>
            store.subscribe(callback),

        // Add a new notification
        notify: (type, message) => {
            const notification = {
                id: Date.now(),
                type,
                message,
                timestamp: new Date().toISOString()
            };

            // Update store
            store.setState({
                notifications: [...store.getState().notifications, notification]
            });

            // Emit event
            eventEmitter.emit(type, notification);
        },

        // Get current notifications
        getNotifications: () =>
            store.getState().notifications
    };
};

// Usage of notification system
const notifications = createNotificationSystem();

// Subscribe to specific notification types
const unsubscribeError = notifications.onNotification('error',
    (notification) => console.log('Error:', notification.message)
);

// Subscribe to all notifications
const unsubscribeAll = notifications.subscribeToAll(
    (state) => console.log('All notifications:', state.notifications)
);

// Send notifications
notifications.notify('error', 'Something went wrong!');
notifications.notify('info', 'Application updated');