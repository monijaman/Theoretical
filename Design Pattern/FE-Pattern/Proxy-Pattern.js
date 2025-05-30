/**
 * The Proxy Pattern provides a surrogate or placeholder
 *  for another object to control access to it.
 *
 * Use Case in Frontend:
 * - Intercepting requests/responses (e.g., logging, caching, or modifying network requests).
 * - Implementing lazy loading of images or components.
 * - Protecting access to sensitive parts of an application (like APIs).
 * - Virtual scrolling or infinite scroll lists (loading data as needed).
 * - Data validation and sanitization before updating state or sending to server.
 * - Creating mock APIs for frontend development/testing.
 */

// Proxy function that adds logging functionality
const apiProxy = {
    get(target, prop) {
        console.log(`Fetcing ${prop} from API`)

        return prop in target ? target[prop] : "Not Found"
    }
}

const apiData = new Proxy({ user: 'John Doe' }, apiProxy)

console.log(apiData.user)
console.log(apiData.age)