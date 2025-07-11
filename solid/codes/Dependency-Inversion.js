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
 * Functional Approach - BAD Example (Violating DIP)
 * The function directly uses a concrete logger, making it hard to test or swap.
 */
function badReportFunc() {
    const logger = {
        log: (msg) => console.log('BadLogger:', msg)
    };
    return {
        generate: () => logger.log('Report generated (bad functional)')
    };
}
const badReport = badReportFunc();
badReport.generate();

/**
 * Functional Approach - GOOD Example (Following DIP)
 * The function receives its logger dependency as an argument (dependency injection).
 */
function goodReportFunc(logger) {
    return {
        generate: () => logger.log('Report generated (good functional)')
    };
}
const customLogger = {
    log: (msg) => console.log('CustomLogger:', msg)
};
const goodReport = goodReportFunc(customLogger);
goodReport.generate();

/**
 * Benefits:
 * - High-level modules do not depend on low-level modules, but on abstractions.
 * - Easy to swap, extend, or mock dependencies.
 * - Follows the Dependency Inversion Principle.
 */