/**
 * The Singleton Pattern ensures a class only has one instance and provides a global point of access to it.
 *  It's useful when exactly one object is needed to coordinate actions across the system.
 * 
 * Use Case in Frontend:
 * - Managing global application state (like a centralized store, e.g., Redux store).
 * - Implementing a service for API calls or configuration settings.
 * - Handling browser storage (localStorage, sessionStorage) through a single access point.
 * - Managing a single WebSocket connection for real-time features.
 * - Creating a global event bus for component communication.
 */

class ApiService {
    constructor() {
        if (ApiService.instance) return ApiService.instance;
        ApiService.instance = this
    }

    fetchData() {
        console.log('Fetching data...')
    }
}

const api1 = new ApiService();
const api2 = new ApiService();

console.log(api1 == api2)