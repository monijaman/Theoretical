/**
 * SOLID Principles: Interface Segregation Principle (ISP) Example
 * 
 * The Interface Segregation Principle states that no client should be forced to depend on methods it does not use.
 * In JavaScript, this means designing classes or objects with focused responsibilities, avoiding large, monolithic interfaces.
 */

/**
 * BAD Example - Violating ISP
 * Here, the Worker class implements unnecessary methods that not all workers need.
 * For example, a Robot does not need to eat or sleep, but is forced to implement them.
 */

//#region  Bad Example - Violating ISP
class Worker {
    work() {
        console.log('Working...');
    }
    eat() {
        console.log('Eating...');
    }
    sleep() {
        console.log('Sleeping...');
    }
}

class HumanWorker extends Worker {
    // Uses all methods
}

class RobotWorker extends Worker {
    eat() {
        // Not needed for robots
        throw new Error('Robots do not eat!');
    }
    sleep() {
        // Not needed for robots
        throw new Error('Robots do not sleep!');
    }
}

// Usage
const human = new HumanWorker();
human.work();
human.eat();
human.sleep();

const robot = new RobotWorker();
robot.work();
// robot.eat(); // Throws error
// robot.sleep(); // Throws error
//#endregion

/**
 * GOOD Example - Following ISP
 * Here, interfaces (or in JS, separate classes/objects) are segregated so that classes only implement what they need.
 * This example uses the "composition over inheritance" design pattern.
 */

//#region  Good Example - Following ISP
class Workable {
    work() {
        console.log('Working...');
    }
}

class Eatable {
    eat() {
        console.log('Eating...');
    }
}

class Sleepable {
    sleep() {
        console.log('Sleeping...');
    }
}

// HumanWorker composes all behaviors
class HumanWorkerISP {
    constructor() {
        this.workable = new Workable();
        this.eatable = new Eatable();
        this.sleepable = new Sleepable();
    }
    work() { this.workable.work(); }
    eat() { this.eatable.eat(); }
    sleep() { this.sleepable.sleep(); }
}

// RobotWorker only composes what it needs
class RobotWorkerISP {
    constructor() {
        this.workable = new Workable();
    }
    work() { this.workable.work(); }
}

// Usage
const humanISP = new HumanWorkerISP();
humanISP.work();
humanISP.eat();
humanISP.sleep();

const robotISP = new RobotWorkerISP();
robotISP.work();
// robotISP.eat(); // Not available
// robotISP.sleep(); // Not available
//#endregion





//#region  Functional Approach - Following ISP



/**
 * BAD Functional Approach - Violating ISP
 * Here, the factory creates objects with unnecessary methods for all clients.
 * For example, a robot gets eat and sleep methods it doesn't need.
 */

//#region  Functional Approach - BAD Example (Violating ISP)
function createWorkerWithAll() {
    return {
        work: () => console.log('Working...'),
        eat: () => console.log('Eating...'),
        sleep: () => console.log('Sleeping...')
    };
}

// Human worker: uses all methods
const humanBadFunc = createWorkerWithAll();
humanBadFunc.work();
humanBadFunc.eat();
humanBadFunc.sleep();

// Robot worker: forced to have eat and sleep methods it doesn't need
const robotBadFunc = createWorkerWithAll();
robotBadFunc.work();
// robotBadFunc.eat(); // Not needed for robots
// robotBadFunc.sleep(); // Not needed for robots
//#endregion


 
//#region  Functional Approach - Following ISP
/**
 * Functional Approach - Following ISP
 * Use factory functions to compose objects with only the behaviors they need.
 * This example uses the "composition" design pattern.
 */

function createWorkable() {
    return {
        work: () => console.log('Working...')
    };
}

function createEatable() {
    return {
        eat: () => console.log('Eating...')
    };
}

function createSleepable() {
    return {
        sleep: () => console.log('Sleeping...')
    };
}

// Human worker: needs all behaviors
function createHumanWorkerISP() {
    return {
        ...createWorkable(),
        ...createEatable(),
        ...createSleepable()
    };
}

// Robot worker: only needs to work
function createRobotWorkerISP() {
    return {
        ...createWorkable()
    };
}

// Usage
const humanFunc = createHumanWorkerISP();
humanFunc.work();
humanFunc.eat();
humanFunc.sleep();

const robotFunc = createRobotWorkerISP();
robotFunc.work();
// robotFunc.eat(); // Not available
// robotFunc.sleep(); // Not available

/**
 * Benefits (Functional):
 * - Objects only have the methods they need.
 * - No unnecessary dependencies or methods.
 * - Follows the Interface Segregation Principle in a functional style.
 */
//#endregion  Functional Approach - BAD Example (Violating ISP)
