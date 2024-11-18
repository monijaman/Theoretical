/**
 * 1. Module Pattern
What is it?
The Module Pattern is used to encapsulate related functionalities into a single object, limiting the scope of variables and methods to avoid polluting the global namespace. It's a way of achieving privacy and organization, similar to namespaces.

Use Case in Frontend:
Encapsulating utility functions.
Creating services or APIs in frontend apps.
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
})()

console.log(UserModule.getUser())
UserModule.setUser('Alice')
console.log(UserModule.getUser())