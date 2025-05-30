/**
 * The Proxy Pattern provides a surrogate or placeholder
 *  for another object to control access to it.
 *
 * A credit card is a proxy for a bank account, which is a proxy for a bundle of cash.
 *  Both implement the same interface: they can be used for making a payment. 
 * A consumer feels great because there’s no need to carry loads of cash around. 
 * A shop owner is also happy since the income from a transaction gets added electronically 
 * to the shop’s bank account without the risk of losing the deposit or getting robbed 
 * on the way to the bank.
 * 
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