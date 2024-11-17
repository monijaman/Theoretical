// Utility function to retrieve data from localStorage with a specified key
export const getFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  // Try to get the data stored in localStorage using the provided key
  const savedData = localStorage.getItem(key);

  return savedData ? JSON.parse(savedData) : defaultValue;
};

// Utility function to save data to localStorage with a specified key
export const saveToLocalStorage = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

/**
 * TypeScript Generics (<T>):
The <T> syntax allows this function to be generic, meaning it can work with 
any data type (e.g., string, number, object, array, etc.).
When you use the function, you can specify what type of data you're
 expecting, or TypeScript can infer it.
 */
