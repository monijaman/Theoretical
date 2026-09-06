/**
 * 1. Module Pattern
What is it?
The Module Pattern is used to encapsulate related functionalities into a 
single object, limiting the scope of variables and methods to avoid
 polluting the global namespace. It's a way of achieving privacy
  and organization, similar to namespaces.

Use Case in Frontend:
- Encapsulating utility functions (e.g., date formatting, validation helpers).
- Creating services or APIs in frontend apps (e.g., authentication, data fetching modules).
- Managing application state in vanilla JS apps.
- Organizing configuration and constants.
- Wrapping third-party libraries to provide a consistent interface.
Example:
 */

const UserModule = (() => {
    let userName = 'Guest';
    const getUser = () => userName;
    const setUser = (name) => { userName = name }

    return {
        getUser,
        setUser
    }
})() // The `()` at the end immediately invokes the function, creating a singleton module with private state.

// If the `()` is not used, UserModule will be a function, not the module object.
// Example:
// const UserModule = (() => { ... }); // <-- No () at the end
// UserModule.getUser() // Error: UserModule.getUser is not a function
// You would need to call UserModule() to get the module object each time, losing the singleton/private state benefit.

console.log(UserModule.getUser())
UserModule.setUser('Alice')
console.log(UserModule.getUser())

// Functional Example: API Service Module
const APIService = (() => {
    const BASE_URL = 'https://api.example.com';
    const API_KEY = 'your_api_key';

    // Private helper function
    const handleResponse = async (response) => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    };

    // Public methods
    const getData = async (endpoint) => {
        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                }
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    };

    const postData = async (endpoint, data) => {
        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('Error posting data:', error);
            throw error;
        }
    };

    return {
        getData,
        postData
    };
})();

// Usage example:
// APIService.getData('/users').then(data => console.log(data));
// APIService.postData('/users', { name: 'John' }).then(response => console.log(response));