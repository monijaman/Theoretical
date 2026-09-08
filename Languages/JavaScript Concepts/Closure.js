/* A closure is a function that retains access to its 
lexical scope, even when called outside of its 
original context. */

function createVisitorCounter() {
    let count = 0;
    return function () {
        count++;
        console.log(`Visitor count: ${count}`);
    }
}

const counter = createVisitorCounter();
counter();
counter();
counter();

/*
counter function is a closure because it retains access to the count 
variable even after the createVisitorCounter function has finished 
executing. This allows it to increment and display the visitor count.
*/