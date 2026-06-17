/**
 * SOLID Principles: Open/Closed Principle (OCP) Example
 * 
 * The Open/Closed Principle states that software entities (classes, functions, modules)
 *  should be open for extension, but closed for modification.
 * In other words, you should be able to add new functionality without changing existing code.
 */

/**
 * BAD Example - Violating OCP
 * This function violates OCP because every time a new employee type is added,
 * you must modify the calculateSalary function, risking bugs and breaking existing logic.
 */
function calculateSalary(employee) {
    if (employee.type === "fulltime") {
        return employee.hoursWorked * employee.hourlyRate;
    } else if (employee.type === "contractor") {
        return employee.hoursWorked * employee.hourlyRate * 0.9; // Contractors get 10% less
    } else if (employee.type === "intern") {
        return employee.hoursWorked * employee.hourlyRate * 0.5; // Interns get 50% pay
    }
    // If a new type is added, this function must be modified
    return 0;
}

/**
 * GOOD Example - Following OCP
 * The code is refactored so that new employee types can be added by extending the system,
 * not by modifying existing logic. This is achieved using polymorphism (strategy pattern).
 */


//#region  Functional-based approach for OCP

// Functional approach for OCP: use a strategy object
// This is an example of the Strategy Pattern in functional style.
// Each strategy (function) encapsulates a different salary calculation algorithm.
// The main calculateSalary function delegates to the appropriate strategy based on employee type.
// This allows you to add new strategies without modifying the core logic (OCP).

const salaryStrategies = {
    fulltime: (employee) => employee.hoursWorked * employee.hourlyRate,
    contractor: (employee) => employee.hoursWorked * employee.hourlyRate * 0.9,
    intern: (employee) => employee.hoursWorked * employee.hourlyRate * 0.5,
    // Add new types here without modifying existing logic
};

// General salary calculation function using the strategy object
function calculateSalary(employee) {
    const strategy = salaryStrategies[employee.type] || salaryStrategies.fulltime;
    return strategy(employee);
}

// Usage
const employees = [
    { name: "Alice", type: "fulltime", hoursWorked: 40, hourlyRate: 30 },
    { name: "Bob", type: "contractor", hoursWorked: 35, hourlyRate: 25 },
    { name: "Charlie", type: "intern", hoursWorked: 20, hourlyRate: 15 }
];

employees.forEach(emp => {
    const salary = calculateSalary(emp);
    console.log(`Employee ${emp.name} earned ${salary}`);
});

//#endregion  Functional-based approach for OCP

//#region  Class-based approach for OCP

// This class-based approach also uses the Strategy Pattern and Polymorphism.
// Each subclass represents a different strategy for salary calculation.
// The calculators map acts as a strategy selector.
// This design allows you to extend the system by adding new subclasses (strategies) without modifying existing code (OCP).

// Base class for salary calculation
class SalaryCalculator {
    calculate(employee) {
        // Default implementation (can be overridden)
        return employee.hoursWorked * employee.hourlyRate;
    }
}

// Extension for contractor
class ContractorSalaryCalculator extends SalaryCalculator {
    calculate(employee) {
        return employee.hoursWorked * employee.hourlyRate * 0.9;
    }
}

// Extension for intern
class InternSalaryCalculator extends SalaryCalculator {
    calculate(employee) {
        return employee.hoursWorked * employee.hourlyRate * 0.5;
    }
}

// Usage: select the right calculator without modifying existing code
const employeess = [
    { name: "Alice", type: "fulltime", hoursWorked: 40, hourlyRate: 30 },
    { name: "Bob", type: "contractor", hoursWorked: 35, hourlyRate: 25 },
    { name: "Charlie", type: "intern", hoursWorked: 20, hourlyRate: 15 }
];

const calculators = {
    fulltime: new SalaryCalculator(),
    contractor: new ContractorSalaryCalculator(),
    intern: new InternSalaryCalculator()
};

employees.forEach(emp => {
    const calculator = calculators[emp.type] || new SalaryCalculator();
    const salary = calculator.calculate(emp);
    console.log(`Employee ${emp.name} earned ${salary}`);
});

/**
 * Benefits:
 * - To add a new employee type, just add a new class and update the calculators map.
 * - No need to modify the core salary calculation logic.
 * - Existing code remains unchanged and safe from bugs.
 * - Follows the Open/Closed Principle.
 */