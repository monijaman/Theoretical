/**
 * SOLID Principles: Dependency Inversion Principle (DIP) Example
 * 
 * The Dependency Inversion Principle states that high-level modules should not depend on low-level modules. Both should depend on abstractions.
 * In JavaScript, this is often achieved by injecting dependencies (e.g., via constructor or function arguments) rather than hard-coding them.
 */

/**
 * BAD Example - Violating DIP
 * Here, the high-level class Report directly creates and depends on a low-level class FileLogger.
 * This makes it hard to change the logging mechanism or test the Report class in isolation.
 */

//#region  Bad Example - Violating DIP
class FileLogger {
    log(message) {
        console.log('FileLogger:', message);
    }
}

class Report {
    constructor() {
        this.logger = new FileLogger(); // Direct dependency
    }
    generate() {
        this.logger.log('Report generated');
    }
}

const report = new Report();
report.generate();
//#endregion

/**
 * GOOD Example - Following DIP
 * Here, the ReportDIP class depends on an abstraction (any object with a log method), not a concrete logger.
 * The logger is injected, so you can easily swap implementations or mock for testing.
 */

//#region  Good Example - Following DIP
class ConsoleLogger {
    log(message) {
        console.log('ConsoleLogger:', message);
    }
}

class ReportDIP {
    constructor(logger) {
        this.logger = logger; // Dependency injection
    }
    generate() {
        this.logger.log('Report generated');
    }
}

const consoleLogger = new ConsoleLogger();
const reportDIP = new ReportDIP(consoleLogger);
reportDIP.generate();
//#endregion

/**
 * Functional Approach - Following DIP
 * Use dependency injection by passing dependencies as arguments to functions.
 */

function createReport(logger) {
    return {
        generate: () => logger.log('Report generated (functional)')
    };
}

const functionalLogger = {
    log: (msg) => console.log('FunctionalLogger:', msg)
};

const reportFunc = createReport(functionalLogger);
reportFunc.generate();

/**
 * Benefits:
 * - High-level modules do not depend on low-level modules, but on abstractions.
 * - Easy to swap, extend, or mock dependencies.
 * - Follows the Dependency Inversion Principle.
 */