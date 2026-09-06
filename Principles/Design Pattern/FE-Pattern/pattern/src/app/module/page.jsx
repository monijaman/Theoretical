'use client';
import counterModule from './counterModule';


export default function ModulePatternPage() {
    const { count, increment, decrement } = counterModule.useCounter();

    return (
        <div style={{ padding: 20 }}>
            <h1>Module Pattern Example — Counter</h1>
            <p>Count: {count}</p>
            <button onClick={increment} style={{ marginRight: 8 }}>Increment</button>
            <button onClick={decrement}>Decrement</button>
        </div>
    );
}


/*
Why the Counter example is a Module Pattern:
 ** The code defines a self-invoking function ((() => { ... })()) that immediately executes and returns an object.
 ** Inside that function, private variables like internalCount exist — they cannot be accessed from outside the module directly.
 ** The module exposes only what’s returned: here, the useCounter function.
 ** All interaction with the internal state goes through that public API.
*/
