/**
 * SOLID Principles: Single Responsibility Principle (SRP) Example
 * 
 * The Single Responsibility Principle states that a class/function should have only one reason to change.
 * In other words, a class/function should have only one job or responsibility.
 */

/**
 * BAD Example - Violating SRP
 * This function violates SRP because it has multiple responsibilities:
 * 1. Calculating salary (business logic)
 * 2. Generating report (presentation logic)
 * 3. Logging to console (logging/infrastructure concern)
 * 
 * Problems with this approach:
 * - Code is tightly coupled
 * - Changes to reporting logic require modifying salary calculation code
 * - Difficult to test each responsibility independently
 * - Reduced reusability
 */
function calculateSalary(employee) {
    // Salary calculation mixed with reporting
    let salary = employee.hoursWorked * employee.hourlyRate;
    let report = `Employee ${employee.name} earned ${salary}`;
    console.log(report); // Logging mixed with business logic
    return salary;
}

/**
 * GOOD Example - Following SRP
 * The code is refactored to separate different responsibilities into distinct functions.
 * Benefits:
 * - Each function has a single, clear purpose
 * - Easy to modify one aspect without affecting others
 * - Better testability and reusability
 * - Clear separation of concerns
 */


//#region  Functional-based approach for SRP
// Function responsible only for salary calculation (Business Logic)
function calculateSalary(employee) {
    return employee.hoursWorked * employee.hourlyRate;
}

// Function responsible only for report generation (Presentation Logic)
function generateReport(employee, salary) {
    return `Employee ${employee.name} earned ${salary}`;
}

// Function responsible only for logging (Infrastructure Concern)
function logReport(report) {
    console.log(report);
}

// Example usage showing clean separation of concerns:
const employee = {
    name: "John Doe",
    hoursWorked: 40,
    hourlyRate: 20
};

const salary = calculateSalary(employee);
const report = generateReport(employee, salary);
logReport(report);


//#endregion  Functional-based approach for SRP



//#region  Class-based approach for SRP
// --- Class-based approach following SRP ---
// Each class has a single responsibility.

// Class responsible only for salary calculation
class SalaryCalculator {
    calculate(employee) {
        return employee.hoursWorked * employee.hourlyRate;
    }
}

// Class responsible only for report generation
class ReportGenerator {
    generate(employee, salary) {
        return `Employee ${employee.name} earned ${salary}`;
    }
}

// Class responsible only for logging
class Logger {
    log(message) {
        console.log(message);
    }
}

// Example usage with class-based SRP
const employee2 = {
    name: "Jane Smith",
    hoursWorked: 35,
    hourlyRate: 25
};

const salaryCalculator = new SalaryCalculator();
const reportGenerator = new ReportGenerator();
const logger = new Logger();

const salary2 = salaryCalculator.calculate(employee2);
const report2 = reportGenerator.generate(employee2, salary2);
logger.log(report2);

//#endregion  Class-based approach for SRP