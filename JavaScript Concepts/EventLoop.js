/**
 * The event loop handles the execution of code, events, 
 * and messages in JavaScript, ensuring non-blocking execution.
 */

console.log('Order 1');
setTimeout(() => {
    console.log('Order 2');
}, 1000);
console.log('Order 3');


/*
 * Here, Order 1 and Order 3 are logged immediately, 
 * but Order 2 is delayed by 1 second because it is 
 * placed in the event queue to execute after the 
 * current stack is empty (due to the setTimeout).
 */