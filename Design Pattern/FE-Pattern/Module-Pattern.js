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