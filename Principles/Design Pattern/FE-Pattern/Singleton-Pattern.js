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
// true, both variables point to the same instance


// Theme Manager Singleton Example
const ThemeManager = (() => {
    let instance;
    const STORAGE_KEY = 'app_theme';

    function createInstance() {
        const defaultTheme = {
            primary: '#007bff',
            secondary: '#6c757d',
            background: '#ffffff',
            text: '#333333',
            mode: 'light'
        };

        let currentTheme = {
            ...defaultTheme,
            ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
        };

        return {
            getTheme() {
                return { ...currentTheme };
            },

            setTheme(newTheme) {
                currentTheme = { ...currentTheme, ...newTheme };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(currentTheme));
                this.applyTheme();
            },

            toggleDarkMode() {
                const isDark = currentTheme.mode === 'dark';
                currentTheme = {
                    ...currentTheme,
                    mode: isDark ? 'light' : 'dark',
                    background: isDark ? '#ffffff' : '#333333',
                    text: isDark ? '#333333' : '#ffffff'
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(currentTheme));
                this.applyTheme();
            },

            applyTheme() {
                document.documentElement.style.setProperty('--primary-color', currentTheme.primary);
                document.documentElement.style.setProperty('--secondary-color', currentTheme.secondary);
                document.documentElement.style.setProperty('--background-color', currentTheme.background);
                document.documentElement.style.setProperty('--text-color', currentTheme.text);
                document.body.setAttribute('data-theme', currentTheme.mode);
            }
        };
    }

    return {
        getInstance() {
            if (!instance) {
                instance = createInstance();
            }
            return instance;
        }
    };
})();

// Usage Example
const themeManager1 = ThemeManager.getInstance();
const themeManager2 = ThemeManager.getInstance();

console.log(themeManager1 === themeManager2); // true

// Using the theme manager
themeManager1.setTheme({ primary: '#ff0000' }); // Changes primary color
themeManager1.toggleDarkMode(); // Toggles dark mode

// Even though we use themeManager2, it's the same instance
console.log(themeManager2.getTheme()); // Shows the updated theme