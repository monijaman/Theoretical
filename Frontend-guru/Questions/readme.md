# 30 Frontend Interview Questions with Answers

---

## 𝗝𝗮𝘃𝗮𝗦𝗰𝗿𝗶𝗽𝘁 𝗖𝗼𝗿𝗲 (𝗙𝗼𝘂𝗻𝗱𝗮𝘁𝗶𝗼𝗻)

### 1. Explain this, call, apply, bind

**`this`**: Refers to the context in which a function is executed.

**`call`**: Invokes a function with a given `this` value and arguments provided individually.

**`apply`**: Similar to call, but arguments are provided as an array.

**`bind`**: Returns a new function with a permanently bound `this` value.

```javascript
const person = {
  name: 'John',
  greet(greeting, punctuation) {
    console.log(`${greeting}, I'm ${this.name}${punctuation}`);
  }
};

const anotherPerson = { name: 'Jane' };

// call - arguments passed individually
person.greet.call(anotherPerson, 'Hello', '!'); // "Hello, I'm Jane!"

// apply - arguments passed as array
person.greet.apply(anotherPerson, ['Hi', '.']); // "Hi, I'm Jane."

// bind - returns new function with bound context
const boundGreet = person.greet.bind(anotherPerson, 'Hey');
boundGreet('!!'); // "Hey, I'm Jane!!"

// Real-world example: Event handlers
class Button {
  constructor(label) {
    this.label = label;
    this.clicked = 0;
  }
  
  handleClick() {
    this.clicked++;
    console.log(`${this.label} clicked ${this.clicked} times`);
  }
  
  render() {
    // Without bind, 'this' would be undefined or window
    element.addEventListener('click', this.handleClick.bind(this));
  }
}
```

---

### 2. Difference between var, let, const

```javascript
// VAR - Function scoped, hoisted, can be redeclared
function varExample() {
  console.log(x); // undefined (hoisted)
  var x = 5;
  if (true) {
    var x = 10; // Same variable!
  }
  console.log(x); // 10
}

// LET - Block scoped, not hoisted (temporal dead zone), cannot be redeclared
function letExample() {
  // console.log(y); // ReferenceError: Cannot access before initialization
  let y = 5;
  if (true) {
    let y = 10; // Different variable (block scoped)
    console.log(y); // 10
  }
  console.log(y); // 5
}

// CONST - Block scoped, must be initialized, cannot be reassigned
function constExample() {
  const z = 5;
  // z = 10; // TypeError: Assignment to constant variable
  
  const obj = { name: 'John' };
  obj.name = 'Jane'; // OK - object properties can change
  // obj = {}; // Error - cannot reassign
}

// Real-world usage
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // 3, 3, 3 (var is function scoped)
}

for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log(j), 100); // 0, 1, 2 (let is block scoped)
}
```

---

### 3. Event loop (microtasks vs macrotasks)

**Event Loop**: JavaScript's concurrency model that handles asynchronous operations.

**Macrotasks**: setTimeout, setInterval, I/O, UI rendering
**Microtasks**: Promises, queueMicrotask, MutationObserver

```javascript
console.log('1: Synchronous');

setTimeout(() => console.log('2: Macrotask (setTimeout)'), 0);

Promise.resolve().then(() => console.log('3: Microtask (Promise)'));

queueMicrotask(() => console.log('4: Microtask (queueMicrotask)'));

console.log('5: Synchronous');

// Output:
// 1: Synchronous
// 5: Synchronous
// 3: Microtask (Promise)
// 4: Microtask (queueMicrotask)
// 2: Macrotask (setTimeout)

// Complex example
async function example() {
  console.log('A: Start');
  
  setTimeout(() => console.log('B: Timeout 1'), 0);
  
  await Promise.resolve();
  console.log('C: After await');
  
  setTimeout(() => console.log('D: Timeout 2'), 0);
  
  Promise.resolve().then(() => console.log('E: Promise 1'));
  
  console.log('F: End');
}

example();
console.log('G: Global');

// Output:
// A: Start
// G: Global
// C: After await
// F: End
// E: Promise 1
// B: Timeout 1
// D: Timeout 2
```

---

### 4. Debounce vs throttle (implement both)

**Debounce**: Delays execution until after a period of inactivity.
**Throttle**: Ensures execution at most once per specified time period.

```javascript
// DEBOUNCE - Execute after user stops typing
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Usage: Search input
const searchAPI = (query) => {
  console.log('Searching for:', query);
  // API call here
};

const debouncedSearch = debounce(searchAPI, 300);
// User types: 'h', 'e', 'l', 'l', 'o'
// Only calls API once after 300ms of no typing

input.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});

// THROTTLE - Execute at regular intervals
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Usage: Scroll event
const handleScroll = () => {
  console.log('Scroll position:', window.scrollY);
};

const throttledScroll = throttle(handleScroll, 200);
// Calls at most once every 200ms, even if user scrolls constantly

window.addEventListener('scroll', throttledScroll);

// Advanced: Throttle with trailing call
function throttleAdvanced(func, limit) {
  let inThrottle, lastArgs, lastThis;
  
  return function(...args) {
    lastArgs = args;
    lastThis = this;
    
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          func.apply(lastThis, lastArgs);
          lastArgs = lastThis = null;
        }
      }, limit);
    }
  };
}
```

---

### 5. Closures with real-world use cases

**Closure**: A function that has access to variables in its outer scope, even after the outer function has returned.

```javascript
// Basic closure
function outer() {
  let count = 0;
  return function inner() {
    count++;
    console.log(count);
  };
}

const counter = outer();
counter(); // 1
counter(); // 2
counter(); // 3

// Use Case 1: Private variables (Encapsulation)
function createBankAccount(initialBalance) {
  let balance = initialBalance; // Private variable
  
  return {
    deposit(amount) {
      balance += amount;
      return balance;
    },
    withdraw(amount) {
      if (amount <= balance) {
        balance -= amount;
        return balance;
      }
      throw new Error('Insufficient funds');
    },
    getBalance() {
      return balance;
    }
  };
}

const account = createBankAccount(1000);
account.deposit(500);   // 1500
account.withdraw(200);  // 1300
// account.balance = 0; // Cannot access private variable

// Use Case 2: Function factories
function createGreeter(greeting) {
  return function(name) {
    return `${greeting}, ${name}!`;
  };
}

const sayHello = createGreeter('Hello');
const sayHola = createGreeter('Hola');

console.log(sayHello('John')); // "Hello, John!"
console.log(sayHola('Maria')); // "Hola, Maria!"

// Use Case 3: Event handlers with context
function setupButtons() {
  const buttons = document.querySelectorAll('.btn');
  
  buttons.forEach((btn, index) => {
    btn.addEventListener('click', function() {
      // 'index' is captured in closure
      console.log(`Button ${index} clicked`);
    });
  });
}

// Use Case 4: Memoization
function memoize(fn) {
  const cache = {};
  
  return function(...args) {
    const key = JSON.stringify(args);
    if (key in cache) {
      console.log('From cache');
      return cache[key];
    }
    console.log('Computing...');
    const result = fn(...args);
    cache[key] = result;
    return result;
  };
}

const fibonacci = memoize((n) => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
});

console.log(fibonacci(10)); // Computing... 55
console.log(fibonacci(10)); // From cache 55
```

---

### 6. Shallow vs deep copy

```javascript
// SHALLOW COPY - Only copies first level
const original = {
  name: 'John',
  address: {
    city: 'NYC',
    zip: '10001'
  },
  hobbies: ['reading', 'coding']
};

// Method 1: Spread operator
const shallow1 = { ...original };
shallow1.name = 'Jane'; // OK - primitive copied
shallow1.address.city = 'LA'; // Problem! Modifies original
console.log(original.address.city); // 'LA' (changed!)

// Method 2: Object.assign
const shallow2 = Object.assign({}, original);

// Method 3: Array spread
const arr = [1, [2, 3], 4];
const shallowArr = [...arr];
shallowArr[1][0] = 999;
console.log(arr[1][0]); // 999 (changed!)

// DEEP COPY - Copies all nested levels

// Method 1: JSON (limitations with functions, dates, undefined)
const deep1 = JSON.parse(JSON.stringify(original));
deep1.address.city = 'Boston'; // OK
console.log(original.address.city); // 'NYC' (unchanged)

// Limitations of JSON method
const complex = {
  date: new Date(),
  func: () => console.log('hi'),
  undef: undefined,
  regex: /test/
};

const jsonCopy = JSON.parse(JSON.stringify(complex));
console.log(jsonCopy);
// { date: "2024-..." } - Date becomes string, func/undef lost

// Method 2: Custom deep clone
function deepClone(obj, hash = new WeakMap()) {
  // Handle primitives and null
  if (obj === null || typeof obj !== 'object') return obj;
  
  // Handle circular references
  if (hash.has(obj)) return hash.get(obj);
  
  // Handle Date
  if (obj instanceof Date) return new Date(obj);
  
  // Handle RegExp
  if (obj instanceof RegExp) return new RegExp(obj);
  
  // Handle Array
  if (Array.isArray(obj)) {
    const arrCopy = [];
    hash.set(obj, arrCopy);
    obj.forEach((item, index) => {
      arrCopy[index] = deepClone(item, hash);
    });
    return arrCopy;
  }
  
  // Handle Object
  const objCopy = {};
  hash.set(obj, objCopy);
  Object.keys(obj).forEach(key => {
    objCopy[key] = deepClone(obj[key], hash);
  });
  
  return objCopy;
}

// Method 3: structuredClone (modern browsers)
const deep2 = structuredClone(original);
deep2.address.city = 'Miami';
console.log(original.address.city); // 'NYC' (unchanged)

// Real-world example: Redux reducer
function reducer(state, action) {
  // Always return new state (immutability)
  switch(action.type) {
    case 'UPDATE_USER':
      return {
        ...state,
        user: {
          ...state.user,
          ...action.payload
        }
      };
    default:
      return state;
  }
}
```

---

### 7. Promise.all vs allSettled vs race

```javascript
// PROMISE.ALL - All must succeed, fails fast
const promise1 = Promise.resolve(1);
const promise2 = Promise.resolve(2);
const promise3 = Promise.reject('Error!');
const promise4 = new Promise(resolve => setTimeout(() => resolve(4), 1000));

Promise.all([promise1, promise2, promise4])
  .then(results => console.log(results)) // [1, 2, 4]
  .catch(err => console.log('Error:', err));

Promise.all([promise1, promise2, promise3])
  .catch(err => console.log('Failed:', err)); // "Failed: Error!"
  // Rejects immediately when first promise fails

// Use case: Fetch multiple resources
async function loadUserDashboard(userId) {
  try {
    const [user, posts, comments] = await Promise.all([
      fetch(`/api/users/${userId}`).then(r => r.json()),
      fetch(`/api/posts/${userId}`).then(r => r.json()),
      fetch(`/api/comments/${userId}`).then(r => r.json())
    ]);
    
    return { user, posts, comments };
  } catch (error) {
    // If ANY request fails, all fail
    console.error('Failed to load dashboard:', error);
  }
}

// PROMISE.ALLSETTLED - Wait for all, never rejects
Promise.allSettled([promise1, promise2, promise3, promise4])
  .then(results => {
    console.log(results);
    /* [
      { status: 'fulfilled', value: 1 },
      { status: 'fulfilled', value: 2 },
      { status: 'rejected', reason: 'Error!' },
      { status: 'fulfilled', value: 4 }
    ] */
  });

// Use case: Best-effort loading
async function loadAnalytics() {
  const results = await Promise.allSettled([
    fetchGoogleAnalytics(),
    fetchMixpanel(),
    fetchSegment()
  ]);
  
  const successful = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
  
  const failed = results
    .filter(r => r.status === 'rejected')
    .map(r => r.reason);
  
  console.log('Loaded:', successful.length);
  console.log('Failed:', failed.length);
  
  return successful; // Use whatever loaded successfully
}

// PROMISE.RACE - First to settle wins
const fast = new Promise(resolve => setTimeout(() => resolve('Fast'), 100));
const slow = new Promise(resolve => setTimeout(() => resolve('Slow'), 1000));

Promise.race([fast, slow])
  .then(result => console.log(result)); // "Fast"

// Use case: Timeout pattern
function fetchWithTimeout(url, timeout = 5000) {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
  ]);
}

fetchWithTimeout('/api/slow-endpoint', 3000)
  .then(response => response.json())
  .catch(err => console.log('Request timed out or failed'));

// PROMISE.ANY - First to fulfill wins (rejects only if all reject)
Promise.any([
  Promise.reject('Error 1'),
  new Promise(resolve => setTimeout(() => resolve('Success'), 100)),
  Promise.reject('Error 2')
])
  .then(result => console.log(result)); // "Success"

// Use case: Fetch from multiple CDNs
async function loadImageFromCDN(imagePath) {
  const cdns = [
    `https://cdn1.example.com/${imagePath}`,
    `https://cdn2.example.com/${imagePath}`,
    `https://cdn3.example.com/${imagePath}`
  ];
  
  try {
    const response = await Promise.any(cdns.map(url => fetch(url)));
    return response.blob();
  } catch (error) {
    console.error('All CDNs failed:', error);
  }
}
```

---

### 8. How async/await works internally

```javascript
// async/await is syntactic sugar over Promises

// This async function:
async function fetchUser(id) {
  const response = await fetch(`/api/users/${id}`);
  const user = await response.json();
  return user;
}

// Is equivalent to:
function fetchUserPromise(id) {
  return fetch(`/api/users/${id}`)
    .then(response => response.json())
    .then(user => user);
}

// How it works:
// 1. async function always returns a Promise
async function example1() {
  return 'hello'; // Wrapped in Promise.resolve
}
example1().then(val => console.log(val)); // "hello"

// 2. await pauses execution until Promise resolves
async function example2() {
  console.log('1: Before await');
  const result = await Promise.resolve('2: Awaited value');
  console.log(result);
  console.log('3: After await');
}
// Output: 1, 2, 3

// 3. Error handling
async function example3() {
  try {
    const data = await fetch('/api/data');
    return data.json();
  } catch (error) {
    console.error('Failed:', error);
    throw error; // Re-throw or handle
  }
}

// Under the hood (generator-like behavior):
function* generatorVersion() {
  const response = yield fetch('/api/users/1');
  const user = yield response.json();
  return user;
}

// Real-world patterns:

// Sequential execution (slow)
async function sequential() {
  const user = await fetchUser(1);     // Wait 1s
  const posts = await fetchPosts(1);   // Wait 1s
  const comments = await fetchComments(1); // Wait 1s
  // Total: 3s
  return { user, posts, comments };
}

// Parallel execution (fast)
async function parallel() {
  const [user, posts, comments] = await Promise.all([
    fetchUser(1),
    fetchPosts(1),
    fetchComments(1)
  ]);
  // All execute simultaneously, total: 1s
  return { user, posts, comments };
}

// Conditional execution
async function conditionalFetch() {
  const user = await fetchUser(1);
  
  if (user.isPremium) {
    const premiumData = await fetchPremiumContent(user.id);
    return { ...user, premiumData };
  }
  
  return user;
}

// Loop with await
async function processUsers(userIds) {
  const results = [];
  
  for (const id of userIds) {
    // Process sequentially
    const user = await fetchUser(id);
    results.push(user);
  }
  
  return results;
}

// Better: Process in parallel
async function processUsersParallel(userIds) {
  return Promise.all(userIds.map(id => fetchUser(id)));
}

// Top-level await (ES2022)
// In modules:
// const data = await fetch('/api/config').then(r => r.json());
// export default data;
```

---

### 9. Memory leaks in JavaScript

```javascript
// COMMON CAUSES OF MEMORY LEAKS:

// 1. Global variables
function createLeak() {
  // Forgot 'var/let/const' - becomes global
  leakedData = new Array(1000000).fill('data');
}

// Fix: Use strict mode
'use strict';
function createLeakFixed() {
  // ReferenceError: leakedData is not defined
  const leakedData = new Array(1000000).fill('data');
}

// 2. Event listeners not removed
class Component {
  constructor() {
    this.data = new Array(1000000);
    this.handleClick = () => {
      console.log(this.data.length);
    };
    
    // Leak: listener never removed
    document.addEventListener('click', this.handleClick);
  }
  
  destroy() {
    // Fix: Remove listener
    document.removeEventListener('click', this.handleClick);
  }
}

// 3. Timers not cleared
function leakyTimer() {
  const data = new Array(1000000);
  
  // Leak: timer never cleared, holds reference to 'data'
  setInterval(() => {
    console.log(data.length);
  }, 1000);
}

// Fix:
function fixedTimer() {
  const data = new Array(1000000);
  
  const timerId = setInterval(() => {
    console.log(data.length);
  }, 1000);
  
  // Clear when done
  return () => clearInterval(timerId);
}

// 4. Closures holding references
function createClosure() {
  const largeData = new Array(1000000).fill('data');
  
  return {
    small: () => console.log('small'),
    // This closure captures 'largeData' even if not using it
    large: () => console.log(largeData.length)
  };
}

// Fix: Only capture what you need
function fixedClosure() {
  const largeData = new Array(1000000).fill('data');
  const dataLength = largeData.length; // Copy only what's needed
  
  return {
    small: () => console.log('small'),
    large: () => console.log(dataLength) // Only holds number
  };
}

// 5. Detached DOM nodes
let detachedDiv;

function createDetachedNode() {
  const div = document.createElement('div');
  div.innerHTML = new Array(1000).fill('content').join('');
  document.body.appendChild(div);
  
  detachedDiv = div; // Still referenced!
  
  // Remove from DOM but variable still holds reference
  document.body.removeChild(div);
}

// Fix:
function fixedDetachedNode() {
  const div = document.createElement('div');
  div.innerHTML = new Array(1000).fill('content').join('');
  document.body.appendChild(div);
  
  // Don't keep reference after removal
  document.body.removeChild(div);
  // div = null; // Let it be garbage collected
}

// 6. Forgotten cache
const cache = new Map();

function addToCache(key, value) {
  cache.set(key, value);
  // Leak: cache grows forever
}

// Fix: Use WeakMap or implement eviction
const weakCache = new WeakMap();
let obj = { data: 'value' };
weakCache.set(obj, 'cached data');
obj = null; // Cache entry automatically removed

// Or implement LRU cache
class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }
  
  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}

// 7. React-specific leaks
function LeakyComponent() {
  const [data, setData] = React.useState(null);
  
  React.useEffect(() => {
    // Leak: async operation after unmount
    fetch('/api/data')
      .then(res => res.json())
      .then(data => setData(data)); // Error if unmounted
  }, []);
  
  return <div>{data}</div>;
}

// Fix:
function FixedComponent() {
  const [data, setData] = React.useState(null);
  
  React.useEffect(() => {
    let cancelled = false;
    
    fetch('/api/data')
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          setData(data);
        }
      });
    
    return () => {
      cancelled = true; // Cleanup
    };
  }, []);
  
  return <div>{data}</div>;
}

// DETECTION TOOLS:
// 1. Chrome DevTools Memory Profiler
// 2. Performance.measureUserAgentSpecificMemory()
// 3. heap snapshots and comparison
```

---

## 𝗥𝗲𝗮𝗰𝘁 / 𝗥𝗲𝗮𝗰𝘁 𝗡𝗮𝘁𝗶𝘃𝗲

### 10. Reconciliation and Virtual DOM

**Reconciliation**: The algorithm React uses to diff the virtual DOM and update the real DOM efficiently.

```javascript
// VIRTUAL DOM CONCEPT
// React creates a lightweight copy of the DOM in JavaScript

// Instead of:
document.getElementById('title').innerHTML = 'New Title';
document.getElementById('count').innerHTML = count;

// React does:
function App() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <h1 id="title">New Title</h1>
      <p id="count">{count}</p>
    </div>
  );
}

// HOW RECONCILIATION WORKS:

// 1. Different element types - Replace entire node
// Before:
<div><Counter /></div>

// After:
<span><Counter /></span>
// Result: Counter unmounts, new Counter mounts

// 2. Same element type - Update attributes
// Before:
<div className="before" title="old" />

// After:
<div className="after" title="new" />
// Result: Only className and title updated

// 3. Component elements
function Parent() {
  const [show, setShow] = useState(true);
  
  return (
    <div>
      {show && <ExpensiveComponent />}
    </div>
  );
}
// When show changes, component unmounts/mounts

// 4. Keys in lists (critical!)
// Bad: No keys
<ul>
  {items.map(item => <li>{item.name}</li>)}
</ul>
// React re-renders all items

// Good: With keys  
<ul>
  {items.map(item => <li key={item.id}>{item.name}</li>)}
</ul>
// React only updates changed items

// FIBER ARCHITECTURE (React 16+)
// React breaks rendering into chunks

// Time slicing example
function HeavyComponent() {
  const [items, setItems] = useState([]);
  
  useTransition(() => {
    // This update is interruptible
    setItems(new Array(10000).fill(null).map((_, i) => i));
  });
  
  return (
    <ul>
      {items.map(i => <li key={i}>{i}</li>)}
    </ul>
  );
}

// OPTIMIZATION EXAMPLE
const MemoizedComponent = React.memo(({ data }) => {
  console.log('Rendering MemoizedComponent');
  return <div>{data.value}</div>;
});

function Parent() {
  const [count, setCount] = useState(0);
  const data = useMemo(() => ({ value: count }), [count]);
  
  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
      <MemoizedComponent data={data} />
      {/* Only re-renders when data changes */}
    </>
  );
}

// RECONCILIATION ALGORITHM
/*
1. Two elements of different types -> replace old with new
2. Same type DOM elements -> update attributes
3. Same type component elements -> update props
4. Recursively process children using keys
*/

// Example: Understanding render phases
function Counter() {
  const [count, setCount] = useState(0);
  
  console.log('Render phase'); // Runs during reconciliation
  
  useEffect(() => {
    console.log('Commit phase'); // Runs after DOM updated
  }, [count]);
  
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}
```

---

### 11. Controlled vs uncontrolled components

```javascript
// CONTROLLED COMPONENT
// React state controls the input value
function ControlledForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ email, password });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email} // Controlled by state
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

// Benefits:
// - Single source of truth
// - Easy validation
// - Conditional rendering
// - Format on change

function ControlledWithValidation() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  
  const handleChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    
    // Instant validation
    if (!value.includes('@')) {
      setError('Invalid email');
    } else {
      setError('');
    }
  };
  
  return (
    <>
      <input value={email} onChange={handleChange} />
      {error && <span style={{ color: 'red' }}>{error}</span>}
    </>
  );
}

// UNCONTROLLED COMPONENT
// DOM controls the input value, access via ref
function UncontrolledForm() {
  const emailRef = useRef();
  const passwordRef = useRef();
  
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({
      email: emailRef.current.value,
      password: passwordRef.current.value
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        ref={emailRef}
        defaultValue="user@example.com" // Note: defaultValue, not value
      />
      <input
        type="password"
        ref={passwordRef}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

// Benefits:
// - Less code
// - Better for large forms
// - Integration with non-React code
// - File inputs (must be uncontrolled)

// FILE INPUT (must be uncontrolled)
function FileUpload() {
  const fileInputRef = useRef();
  
  const handleUpload = () => {
    const file = fileInputRef.current.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    fetch('/upload', {
      method: 'POST',
      body: formData
    });
  };
  
  return (
    <>
      <input type="file" ref={fileInputRef} />
      <button onClick={handleUpload}>Upload</button>
    </>
  );
}

// HYBRID APPROACH
function HybridForm() {
  const formRef = useRef();
  const [isValid, setIsValid] = useState(false);
  
  const handleChange = () => {
    // Validate using native DOM API
    const form = formRef.current;
    setIsValid(form.checkValidity());
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(formRef.current);
    const data = Object.fromEntries(formData);
    console.log(data);
  };
  
  return (
    <form ref={formRef} onChange={handleChange} onSubmit={handleSubmit}>
      <input name="email" type="email" required />
      <input name="password" type="password" required minLength="8" />
      <button type="submit" disabled={!isValid}>Submit</button>
    </form>
  );
}

// WHEN TO USE EACH:

// Controlled:
// - Form validation
// - Conditional logic
// - Enforcing input format
// - Dynamic fields

// Uncontrolled:
// - Simple forms
// - File inputs
// - Integration with non-React libraries
// - Performance-critical forms

// PERFORMANCE COMPARISON
function PerformanceExample() {
  // Controlled: Re-renders on every keystroke
  const [value, setValue] = useState('');
  
  return (
    <>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <ExpensiveComponent value={value} />
      {/* Re-renders on every character typed */}
    </>
  );
}

function PerformanceExampleOptimized() {
  // Uncontrolled: Only reads value on submit
  const inputRef = useRef();
  
  const handleSubmit = (e) => {
    e.preventDefault();
    processValue(inputRef.current.value);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input ref={inputRef} />
      <ExpensiveComponent />
      {/* Doesn't re-render while typing */}
    </form>
  );
}
```

---

### 12. useEffect lifecycle traps

```javascript
// TRAP 1: Missing dependencies
function BadExample1() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      console.log(count); // Always logs 0!
    }, 1000);
    
    return () => clearInterval(timer);
  }, []); // Missing 'count' dependency
  
  return <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>;
}

// Fix:
function GoodExample1() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      console.log(count); // Logs current count
    }, 1000);
    
    return () => clearInterval(timer);
  }, [count]); // Include dependency
}

// Or use functional update:
function BetterExample1() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(c => {
        console.log(c);
        return c;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []); // No external dependencies needed
}

// TRAP 2: Infinite loops
function BadExample2() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    setData([1, 2, 3]); // Runs forever!
  }); // No dependency array = runs after every render
}

// Fix:
function GoodExample2() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    setData([1, 2, 3]);
  }, []); // Runs once on mount
}

// TRAP 3: Object dependencies
function BadExample3() {
  const [data, setData] = useState(null);
  const config = { url: '/api/data' }; // New object every render
  
  useEffect(() => {
    fetch(config.url)
      .then(r => r.json())
      .then(setData);
  }, [config]); // Infinite loop! New object ≠ old object
}

// Fix: useMemo or primitive dependencies
function GoodExample3() {
  const [data, setData] = useState(null);
  const config = useMemo(() => ({ url: '/api/data' }), []);
  
  useEffect(() => {
    fetch(config.url)
      .then(r => r.json())
      .then(setData);
  }, [config]);
}

// Or better:
function BetterExample3() {
  const [data, setData] = useState(null);
  const url = '/api/data'; // Primitive
  
  useEffect(() => {
    fetch(url)
      .then(r => r.json())
      .then(setData);
  }, [url]);
}

// TRAP 4: Not cleaning up
function BadExample4() {
  useEffect(() => {
    const handleScroll = () => console.log('scrolling');
    window.addEventListener('scroll', handleScroll);
    // No cleanup! Listener added on every render
  });
}

// Fix:
function GoodExample4() {
  useEffect(() => {
    const handleScroll = () => console.log('scrolling');
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
}

// TRAP 5: Setting state after unmount
function BadExample5() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then(data => setData(data)); // Error if component unmounted!
  }, []);
}

// Fix:
function GoodExample5() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    let cancelled = false;
    
    fetch('/api/data')
      .then(r => r.json())
      .then(data => {
        if (!cancelled) {
          setData(data);
        }
      });
    
    return () => {
      cancelled = true;
    };
  }, []);
}

// OR use AbortController:
function BestExample5() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const controller = new AbortController();
    
    fetch('/api/data', { signal: controller.signal })
      .then(r => r.json())
      .then(setData)
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      });
    
    return () => controller.abort();
  }, []);
}

// TRAP 6: useEffect for derived state
function BadExample6() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  
  useEffect(() => {
    setTotal(items.reduce((sum, item) => sum + item.price, 0));
  }, [items]); // Unnecessary re-render
}

// Fix: Calculate during render
function GoodExample6() {
  const [items, setItems] = useState([]);
  const total = items.reduce((sum, item) => sum + item.price, 0);
  // No useEffect needed!
}

// TRAP 7: Race conditions
function BadExample7() {
  const [userId, setUserId] = useState(1);
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // User clicks fast: userId 1 -> 2 -> 3
    // Responses arrive: 3, 1, 2
    // Final user is 2 (wrong!)
    fetch(`/api/users/${userId}`)
      .then(r => r.json())
      .then(setUser);
  }, [userId]);
}

// Fix: Ignore stale requests
function GoodExample7() {
  const [userId, setUserId] = useState(1);
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    let current = true;
    
    fetch(`/api/users/${userId}`)
      .then(r => r.json())
      .then(data => {
        if (current) {
          setUser(data);
        }
      });
    
    return () => {
      current = false;
    };
  }, [userId]);
}

// MODERN ALTERNATIVE: React 19 `use` hook
function ModernExample() {
  const [userId, setUserId] = useState(1);
  // Automatically handles race conditions
  const user = use(fetch(`/api/users/${userId}`));
}
```

---

### 13. State lifting vs global state

```javascript
// STATE LIFTING: Move state to common ancestor

// Before: State in child (can't share)
function Counter1() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

function Counter2() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

function App() {
  return (
    <>
      <Counter1 /> {/* count: 0 */}
      <Counter2 /> {/* count: 0 */}
      {/* States are separate */}
    </>
  );
}

// After: Lift state to parent (shared)
function Counter({ count, onIncrement }) {
  return <button onClick={onIncrement}>{count}</button>;
}

function App() {
  const [count, setCount] = useState(0);
  
  return (
    <>
      <Counter count={count} onIncrement={() => setCount(c => c + 1)} />
      <Counter count={count} onIncrement={() => setCount(c => c + 1)} />
      {/* Both share the same count */}
    </>
  );
}

// PROBLEM: Prop drilling
function App() {
  const [user, setUser] = useState(null);
  
  return <Dashboard user={user} />;
}

function Dashboard({ user }) {
  return (
    <div>
      <Sidebar user={user} />
      <Content user={user} />
    </div>
  );
}

function Sidebar({ user }) {
  return <UserProfile user={user} />;
}

function UserProfile({ user }) {
  return <div>{user?.name}</div>;
}
// User passed through many levels!

// SOLUTION 1: Context API
const UserContext = React.createContext();

function App() {
  const [user, setUser] = useState(null);
  
  return (
    <UserContext.Provider value={{ user, setUser }}>
      <Dashboard />
    </UserContext.Provider>
  );
}

function Dashboard() {
  return (
    <div>
      <Sidebar />
      <Content />
    </div>
  );
}

function UserProfile() {
  const { user } = useContext(UserContext);
  return <div>{user?.name}</div>;
  // No props needed!
}

// SOLUTION 2: Zustand (lightweight)
import create from 'zustand';

const useStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 }))
}));

function UserProfile() {
  const user = useStore((state) => state.user);
  return <div>{user?.name}</div>;
}

function Counter() {
  const count = useStore((state) => state.count);
  const increment = useStore((state) => state.increment);
  return <button onClick={increment}>{count}</button>;
}

// SOLUTION 3: Redux Toolkit
import { createSlice, configureStore } from '@reduxjs/toolkit';

const userSlice = createSlice({
  name: 'user',
  initialState: { current: null },
  reducers: {
    setUser: (state, action) => {
      state.current = action.payload;
    }
  }
});

const store = configureStore({
  reducer: {
    user: userSlice.reducer
  }
});

function UserProfile() {
  const user = useSelector((state) => state.user.current);
  const dispatch = useDispatch();
  
  return <div>{user?.name}</div>;
}

// WHEN TO USE WHAT:

// State lifting:
// - State shared by 2-3 components nearby
// - Simple parent-child relationships
// - No deep nesting

// Context:
// - Theme, auth, locale (rarely change)
// - 3-5+ levels of nesting
// - Multiple unrelated components need access

// Zustand:
// - Frequent updates
// - Complex state logic
// - Want simple API

// Redux:
// - Very complex state
// - Time-travel debugging
// - Middleware needed (logging, etc)
// - Large team needs conventions

// ANTI-PATTERN: Everything in global state
const useStore = create((set) => ({
  // DON'T put everything here!
  modalOpen: false,       // Local to component
  hoveredItem: null,      // Local to component
  formErrors: {},         // Local to form
  user: null,             // OK - truly global
  theme: 'dark'           // OK - truly global
}));

// BETTER: Mix local and global
function MyComponent() {
  // Local state
  const [modalOpen, setModalOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  
  // Global state
  const user = useStore((state) => state.user);
  const theme = useStore((state) => state.theme);
  
  // ...
}
```

---

### 14. Context vs Redux vs Zustand

```javascript
// CONTEXT API
// Pros: Built-in, simple, no dependencies
// Cons: Performance issues with frequent updates, verbose

const ThemeContext = React.createContext();

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  
  const value = useMemo(
    () => ({ theme, setTheme }), 
    [theme] // Prevent unnecessary re-renders
  );
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook
function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// Usage
function Button() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className={theme}
    >
      Toggle Theme
    </button>
  );
}

// Performance issue with Context:
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <CountContext.Provider value={{ count, setCount }}>
      <Child1 />
      <Child2 />
    </CountContext.Provider>
  );
  // Every time count changes, ALL consumers re-render!
}

// Fix: Split contexts
const CountStateContext = React.createContext();
const CountDispatchContext = React.createContext();

function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <CountStateContext.Provider value={count}>
      <CountDispatchContext.Provider value={setCount}>
        <Child1 />
        <Child2 />
      </CountDispatchContext.Provider>
    </CountStateContext.Provider>
  );
}

// ZUSTAND
// Pros: Simple API, great performance, small bundle, React 18 ready
// Cons: Less ecosystem than Redux

import create from 'zustand';
import { persist } from 'zustand/middleware';

// Basic store
const useStore = create((set, get) => ({
  count: 0,
  user: null,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  setUser: (user) => set({ user }),
  reset: () => set({ count: 0, user: null })
}));

// With persistence
const usePersistentStore = create(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token })
    }),
    {
      name: 'auth-storage', // localStorage key
      getStorage: () => localStorage
    }
  )
);

// Async actions
const useAsyncStore = create((set) => ({
  data: null,
  loading: false,
  error: null,
  fetchData: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/data/${id}`);
      const data = await response.json();
      set({ data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  }
}));

// Usage
function Component() {
  // Only re-renders when count changes
  const count = useStore((state) => state.count);
  const increment = useStore((state) => state.increment);
  
  return <button onClick={increment}>{count}</button>;
}

// Selecting multiple values
function AnotherComponent() {
  const { count, user } = useStore((state) => ({
    count: state.count,
    user: state.user
  }));
  
  return <div>{count} - {user?.name}</div>;
}

// REDUX TOOLKIT
// Pros: Predictable, great devtools, huge ecosystem, middleware
// Cons: More boilerplate, steeper learning curve

import { createSlice, configureStore, createAsyncThunk } from '@reduxjs/toolkit';

// Slice
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0, history: [] },
  reducers: {
    increment: (state) => {
      state.value += 1;
      state.history.push(state.value);
    },
    decrement: (state) => {
      state.value -= 1;
      state.history.push(state.value);
    },
    incrementByAmount: (state, action) => {
      state.value += action.payload;
    }
  }
});

// Async thunk
const fetchUser = createAsyncThunk(
  'user/fetch',
  async (userId, thunkAPI) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState: { data: null, loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.data = action.payload;
        state.loading = false;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.error = action.error.message;
        state.loading = false;
      });
  }
});

// Store
const store = configureStore({
  reducer: {
    counter: counterSlice.reducer,
    user: userSlice.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(logger) // Add middleware
});

// Usage
import { useSelector, useDispatch } from 'react-redux';

function Counter() {
  const count = useSelector((state) => state.counter.value);
  const dispatch = useDispatch();
  
  return (
    <>
      <button onClick={() => dispatch(counterSlice.actions.increment())}>
        {count}
      </button>
      <button onClick={() => dispatch(fetchUser(123))}>
        Load User
      </button>
    </>
  );
}

// COMPARISON CHEAT SHEET:

/*
CONTEXT:
✓ Theme, locale, auth (infrequent updates)
✓ No external dependencies
✗ Frequent updates (performance)
✗ Complex state logic

ZUSTAND:
✓ Simple API, minimal boilerplate
✓ Great performance
✓ Works outside React
✗ Smaller ecosystem
✗ Less tooling

REDUX:
✓ Complex state management
✓ Time-travel debugging
✓ Middleware ecosystem
✓ Large team conventions
✗ More boilerplate
✗ Steeper learning curve

RECOMMENDATION:
- Start with Context for simple cases
- Use Zustand for most apps
- Use Redux for large, complex apps or when team already knows it
*/
```

---

### 15. Rendering optimization techniques

```javascript
// 1. REACT.MEMO - Prevent re-renders for pure components
const ExpensiveComponent = React.memo(({ data, onClick }) => {
  console.log('Rendering ExpensiveComponent');
  return (
    <div onClick={onClick}>
      {data.map(item => <Item key={item.id} {...item} />)}
    </div>
  );
});

// Custom comparison
const CustomMemoComponent = React.memo(
  ({ user }) => <div>{user.name}</div>,
  (prevProps, nextProps) => {
    // Return true if props are equal (skip render)
    return prevProps.user.id === nextProps.user.id;
  }
);

// 2. USEMEMO - Memoize expensive calculations
function ProductList({ products, filter }) {
  // Without useMemo: recalculates on every render
  // const filtered = products.filter(p => p.category === filter);
  
  // With useMemo: only recalculates when dependencies change
  const filtered = useMemo(() => {
    console.log('Filtering products...');
    return products.filter(p => p.category === filter);
  }, [products, filter]);
  
  const total = useMemo(() => {
    return filtered.reduce((sum, p) => sum + p.price, 0);
  }, [filtered]);
  
  return <div>Total: {total}</div>;
}

// 3. USECALLBACK - Memoize function references
function Parent() {
  const [count, setCount] = useState(0);
  
  // Bad: New function on every render
  const handleClick = () => {
    console.log('Clicked');
  };
  
  // Good: Same function reference
  const handleClickMemo = useCallback(() => {
    console.log('Clicked');
  }, []); // Dependencies
  
  return (
    <>
      <Child onClick={handleClickMemo} />
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
    </>
  );
}

const Child = React.memo(({ onClick }) => {
  console.log('Child rendered');
  return <button onClick={onClick}>Click me</button>;
});

// 4. CODE SPLITTING - Lazy load components
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}

// Route-based splitting
const Home = React.lazy(() => import('./pages/Home'));
const About = React.lazy(() => import('./pages/About'));
const Admin = React.lazy(() => import('./pages/Admin'));

function Router() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Suspense>
  );
}

// 5. VIRTUALIZATION - Render only visible items
import { FixedSizeList } from 'react-window';

function VirtualList({ items }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      Item {items[index].name}
    </div>
  );
  
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
  // Only renders visible items, not all 100,000!
}

// 6. DEBOUNCING INPUT
function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDeferredValue(query); // React 18
  
  const results = useMemo(() => {
    return searchDatabase(debouncedQuery);
  }, [debouncedQuery]);
  
  return (
    <>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Results data={results} />
    </>
  );
}

// 7. TRANSITION - Mark non-urgent updates
function TabContainer() {
  const [tab, setTab] = useState('home');
  const [isPending, startTransition] = useTransition();
  
  const handleTabClick = (newTab) => {
    startTransition(() => {
      setTab(newTab); // Low priority
    });
  };
  
  return (
    <>
      <Tabs onChange={handleTabClick} />
      {isPending && <Spinner />}
      <TabContent tab={tab} />
    </>
  );
}

// 8. BATCHING - Group state updates (automatic in React 18)
function Counter() {
  const [count, setCount] = useState(0);
  const [flag, setFlag] = useState(false);
  
  const handleClick = () => {
    // React 18: Both batched automatically (one render)
    setCount(c => c + 1);
    setFlag(f => !f);
    
    // React 17: Batched in event handlers only
    // Not batched in setTimeout, promises, etc.
  };
  
  // Force batching in React 17
  const handleClickOld = () => {
    ReactDOM.unstable_batchedUpdates(() => {
      setCount(c => c + 1);
      setFlag(f => !f);
    });
  };
  
  return <button onClick={handleClick}>{count}</button>;
}

// 9. AVOID INLINE OBJECTS/ARRAYS
function Bad() {
  return (
    <Child
      style={{ color: 'red' }} // New object every render!
      items={[1, 2, 3]} // New array every render!
    />
  );
}

function Good() {
  const style = useMemo(() => ({ color: 'red' }), []);
  const items = useMemo(() => [1, 2, 3], []);
  
  return <Child style={style} items={items} />;
}

// Or define outside component
const STYLE = { color: 'red' };
const ITEMS = [1, 2, 3];

function Better() {
  return <Child style={STYLE} items={ITEMS} />;
}

// 10. CHILDREN PROP PATTERN
function Parent() {
  const [count, setCount] = useState(0);
  
  // Bad: StaticChild re-renders when count changes
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <ExpensiveStaticChild />
    </div>
  );
}

// Good: Wrap children to prevent re-render
function Wrapper({ children }) {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      {children}
    </div>
  );
}

function App() {
  return (
    <Wrapper>
      <ExpensiveStaticChild /> {/* Doesn't re-render! */}
    </Wrapper>
  );
}

// 11. PROFILER - Measure performance
import { Profiler } from 'react';

function onRenderCallback(
  id, phase, actualDuration, baseDuration, startTime, commitTime
) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}

function App() {
  return (
    <Profiler id="Navigation" onRender={onRenderCallback}>
      <Navigation />
    </Profiler>
  );
}
```

---

### 16. Why keys matter (and how bad keys break apps)

```javascript
// WHAT ARE KEYS
// Keys help React identify which items changed, added, or removed

// BAD: No keys
function BadList({ items }) {
  return (
    <ul>
      {items.map(item => (
        <li>{item.name}</li> // Warning: Each child should have a key
      ))}
    </ul>
  );
}

// WORSE: Index as key
function WorseList({ items }) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>{item.name}</li> // Bugs when list changes!
      ))}
    </ul>
  );
}

// GOOD: Unique ID as key
function GoodList({ items }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name}</li> // ✓
      ))}
    </ul>
  );
}

// WHY INDEX KEYS ARE DANGEROUS

// Example: Todo list with delete
function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Buy milk', done: false },
    { id: 2, text: 'Clean room', done: false },
    { id: 3, text: 'Study React', done: false }
  ]);
  
  const deleteTodo = (id) => {
    setTodos(todos.filter(t => t.id !== id));
  };
  
  // WRONG: Using index as key
  return (
    <ul>
      {todos.map((todo, index) => (
        <TodoItem
          key={index} // BUG!
          todo={todo}
          onDelete={() => deleteTodo(todo.id)}
        />
      ))}
    </ul>
  );
}

function TodoItem({ todo, onDelete }) {
  const [input, setInput] = useState('');
  
  return (
    <li>
      {todo.text}
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={onDelete}>Delete</button>
    </li>
  );
}

/*
SCENARIO:
1. User types "test" in "Clean room" input (index 1)
2. User deletes "Buy milk" (index 0)
3. "Clean room" moves to index 0
4. BUT React sees key=1 as same component (now "Study React")
5. Input value "test" stays with key=1 (wrong item!)
*/

// CORRECT: Use unique ID
function TodoListFixed() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Buy milk', done: false },
    { id: 2, text: 'Clean room', done: false },
    { id: 3, text: 'Study React', done: false }
  ]);
  
  return (
    <ul>
      {todos.map(todo => (
        <TodoItem
          key={todo.id} // ✓ Correct
          todo={todo}
          onDelete={() => deleteTodo(todo.id)}
        />
      ))}
    </ul>
  );
}

// WHEN INDEX KEYS ARE OK
// Static lists that never reorder/filter/delete
function StaticNav() {
  const links = ['Home', 'About', 'Contact'];
  
  return (
    <nav>
      {links.map((link, index) => (
        <a key={index} href={`/${link.toLowerCase()}`}>
          {link}
        </a>
      ))}
    </nav>
  );
  // OK: List never changes
}

// HOW KEYS AFFECT RECONCILIATION

// Without proper keys: Re-creates DOM nodes
function NoProperKeys() {
  const [items, setItems] = useState(['A', 'B', 'C']);
  
  const shuffle = () => setItems(['C', 'A', 'B']);
  
  return (
    <>
      <button onClick={shuffle}>Shuffle</button>
      {items.map((item, index) => (
        <ExpensiveComponent key={index} data={item} />
      ))}
    </>
  );
  /*
  Before: [A(0), B(1), C(2)]
  After:  [C(0), A(1), B(2)]
  React sees: Same keys (0,1,2) but different data
  Result: Updates all 3 components (slow!)
  */
}

// With proper keys: Reorders existing DOM nodes
function ProperKeys() {
  const [items, setItems] = useState([
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
    { id: 'c', name: 'C' }
  ]);
  
  const shuffle = () => setItems([items[2], items[0], items[1]]);
  
  return (
    <>
      <button onClick={shuffle}>Shuffle</button>
      {items.map(item => (
        <ExpensiveComponent key={item.id} data={item} />
      ))}
    </>
  );
  /*
  Before: [A(a), B(b), C(c)]
  After:  [C(c), A(a), B(b)]
  React sees: Same keys in different order
  Result: Moves existing components (fast!)
  */
}

// REAL-WORLD EXAMPLE: Form with dynamic fields
function DynamicForm() {
  const [fields, setFields] = useState([
    { id: crypto.randomUUID(), value: '' }
  ]);
  
  const addField = () => {
    setFields([...fields, { id: crypto.randomUUID(), value: '' }]);
  };
  
  const removeField = (id) => {
    setFields(fields.filter(f => f.id !== id));
  };
  
  const updateField = (id, value) => {
    setFields(fields.map(f => 
      f.id === id ? { ...f, value } : f
    ));
  };
  
  return (
    <form>
      {fields.map(field => (
        <div key={field.id}>
          <input
            value={field.value}
            onChange={(e) => updateField(field.id, e.target.value)}
          />
          <button type="button" onClick={() => removeField(field.id)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={addField}>Add Field</button>
    </form>
  );
  // Each field maintains its state correctly!
}

// KEY GENERATION STRATEGIES
// ✓ Database ID
// ✓ UUID/nanoid
// ✓ Stable hash of content
// ✗ Index
// ✗ Random on every render (Math.random())

// For lists without IDs:
import { nanoid } from 'nanoid';

const items = data.map(item => ({
  ...item,
  id: nanoid() // Generate once, not on every render!
}));

// Or use hash of content (if stable):
import hash from 'object-hash';

const key = hash(item); // Only if item content uniquely identifies it
```

---

### 17. Handling large lists efficiently

```javascript
// PROBLEM: Rendering 50,000 items
function NaiveList({ items }) {
  return (
    <div>
      {items.map(item => (
        <div key={item.id}>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </div>
      ))}
    </div>
  );
  // Freezes the browser!
}

// SOLUTION 1: VIRTUALIZATION (react-window)
import { FixedSizeList } from 'react-window';

function VirtualizedList({ items }) {
  const Row = ({ index, style }) => (
    <div style={style} className="row">
      <h3>{items[index].title}</h3>
      <p>{items[index].description}</p>
    </div>
  );
  
  return (
    <FixedSizeList
      height={800}        // Viewport height
      itemCount={items.length}
      itemSize={120}       // Height of each row
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
  // Only renders ~10 visible items instead of 50,000!
}

// Variable height items
import { VariableSizeList } from 'react-window';

function VariableHeightList({ items }) {
  const listRef = useRef();
  
  const getItemSize = (index) => {
    // Calculate height based on content
    return items[index].description.length > 100 ? 150 : 80;
  };
  
  const Row = ({ index, style }) => (
    <div style={style}>
      <h3>{items[index].title}</h3>
      <p>{items[index].description}</p>
    </div>
  );
  
  return (
    <VariableSizeList
      ref={listRef}
      height={800}
      itemCount={items.length}
      itemSize={getItemSize}
      width="100%"
    >
      {Row}
    </VariableSizeList>
  );
}

// SOLUTION 2: INFINITE SCROLL
function InfiniteScroll() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const observer = useRef();
  const lastItemRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(p => p + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);
  
  useEffect(() => {
    setLoading(true);
    fetch(`/api/items?page=${page}&limit=50`)
      .then(r => r.json())
      .then(data => {
        setItems(prev => [...prev, ...data.items]);
        setHasMore(data.hasMore);
        setLoading(false);
      });
  }, [page]);
  
  return (
    <div>
      {items.map((item, index) => {
        if (items.length === index + 1) {
          return (
            <div ref={lastItemRef} key={item.id}>
              {item.title}
            </div>
          );
        }
        return <div key={item.id}>{item.title}</div>;
      })}
      {loading && <div>Loading...</div>}
    </div>
  );
}

// SOLUTION 3: PAGINATION
function PaginatedList({ items }) {
  const [page, setPage] = useState(1);
  const itemsPerPage = 50;
  
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }, [items, page]);
  
  const totalPages = Math.ceil(items.length / itemsPerPage);
  
  return (
    <>
      <div>
        {paginatedItems.map(item => (
          <div key={item.id}>{item.title}</div>
        ))}
      </div>
      
      <div className="pagination">
        <button
          disabled={page === 1}
          onClick={() => setPage(p => p - 1)}
        >
          Previous
        </button>
        <span>Page {page} of {totalPages}</span>
        <button
          disabled={page === totalPages}
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </button>
      </div>
    </>
  );
}

// SOLUTION 4: TANSTACK VIRTUAL (formerly react-virtual)
import { useVirtualizer } from '@tanstack/react-virtual';

function TanstackVirtual({ items }) {
  const parentRef = useRef();
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5 // Render 5 extra items outside viewport
  });
  
  return (
    <div
      ref={parentRef}
      style={{ height: '800px', overflow: 'auto' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`
            }}
          >
            <h3>{items[virtualItem.index].title}</h3>
            <p>{items[virtualItem.index].description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// SOLUTION 5: DEFER RENDERING (React 18)
function DeferredList({ items }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  
  const filteredItems = useMemo(() => {
    return items.filter(item =>
      item.title.toLowerCase().includes(deferredQuery.toLowerCase())
    );
  }, [items, deferredQuery]);
  
  return (
    <>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      <div>
        {filteredItems.map(item => (
          <div key={item.id}>{item.title}</div>
        ))}
      </div>
    </>
  );
  // Input stays responsive while list updates
}

// COMPARISON:

/*
VIRTUALIZATION:
✓ Best for very long lists (10k+ items)
✓ Renders only visible items
✓ Smooth scrolling
✗ Complex implementation
✗ Accessibility considerations

INFINITE SCROLL:
✓ Great UX for continuous content
✓ Mobile-friendly
✗ Hard to reach footer
✗ Difficult to bookmark specific items

PAGINATION:
✓ Simple implementation
✓ SEO-friendly
✓ Easy navigation
✗ Extra clicks
✗ Context switching

RECOMMENDATION:
- <1000 items: Just render all
- 1k-10k items: Pagination
- 10k+ items: Virtualization
- News feed: Infinite scroll
*/
```

---

### 18. Error boundaries and crash recovery

```javascript
// ERROR BOUNDARY CLASS COMPONENT
// (No hooks equivalent yet in React 18)
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  
  static getDerivedStateFromError(error) {
    // Update state so next render shows fallback UI
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    // Log error to service
    console.error('Error caught:', error, errorInfo);
    
    // Send to error tracking service
    logErrorToService(error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <details>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo.componentStack}
          </details>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// USAGE
function App() {
  return (
    <ErrorBoundary>
      <ComponentThatMayError />
    </ErrorBoundary>
  );
}

// MULTIPLE ERROR BOUNDARIES (granular error handling)
function Dashboard() {
  return (
    <div>
      <ErrorBoundary fallback={<h3>Sidebar failed</h3>}>
        <Sidebar />
      </ErrorBoundary>
      
      <ErrorBoundary fallback={<h3>Content failed</h3>}>
        <Content />
      </ErrorBoundary>
      
      <ErrorBoundary fallback={<h3>Footer failed</h3>}>
        <Footer />
      </ErrorBoundary>
    </div>
  );
  // If Sidebar crashes, Content and Footer still work!
}

// CUSTOM FALLBACK UI
class ErrorBoundaryWithFallback extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    this.props.onError?.(error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorUI />;
    }
    return this.props.children;
  }
}

// Usage:
<ErrorBoundaryWithFallback
  fallback={<div>Oops! Widget crashed</div>}
  onError={(error, info) => logToSentry(error, info)}
>
  <MyWidget />
</ErrorBoundaryWithFallback>

// WHAT ERROR BOUNDARIES DON'T CATCH:
function WhatNotCaught() {
  const [count, setCount] = useState(0);
  
  // 1. Event handlers (use try/catch)
  const handleClick = () => {
    try {
      throw new Error('Event error');
    } catch (error) {
      console.error('Caught in handler:', error);
    }
  };
  
  // 2. Async code (use try/catch)
  const fetchData = async () => {
    try {
      const data = await fetch('/api/data');
      return data.json();
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };
  
  // 3. Server-side rendering
  // 4. Errors in error boundary itself
  
  return <button onClick={handleClick}>Click</button>;
}

// ASYNC ERROR HANDLING WITH STATE
function AsyncComponent() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/data');
        if (!response.ok) throw new Error('API error');
        const data = await response.json();
        setData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return <div>{data}</div>;
}

// REACT QUERY ERROR HANDLING
import { useQuery } from '@tanstack/react-query';

function ReactQueryExample() {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
  
  if (isLoading) return <div>Loading...</div>;
  
  if (error) return (
    <div>
      Error: {error.message}
      <button onClick={() => refetch()}>Retry</button>
    </div>
  );
  
  return <div>{data.name}</div>;
}

// RESET ERROR BOUNDARY
class ResettableErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  resetError = () => {
    this.setState({ hasError: false });
  };
  
  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Error occurred</h2>
          <button onClick={this.resetError}>Reset</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// INTEGRATION WITH ERROR TRACKING
import * as Sentry from "@sentry/react";

const SentryErrorBoundary = Sentry.withErrorBoundary(App, {
  fallback: <ErrorFallback />,
  showDialog: true
});

// Or manual:
class ErrorBoundaryWithSentry extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack
        }
      }
    });
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallbackUI />;
    }
    return this.props.children;
  }
}

// FUTURE: React 19 Error Hooks (experimental)
// function useErrorBoundary() {
//   const [error, resetError] = React.unstable_useErrorBoundary();
//   
//   if (error) {
//     return <div>Error: {error.message}</div>;
//   }
//   
//   return <div onClick={resetError}>Content</div>;
// }
```

---

## 𝗣𝗲𝗿𝗳𝗼𝗿𝗺𝗮𝗻𝗰𝗲 (𝗗𝗶𝗳𝗳𝗲𝗿𝗲𝗻𝘁𝗶𝗮𝘁𝗼𝗿)

### 19. How to reduce Time to Interactive (TTI)

**Time to Interactive**: Time until page is fully interactive (loaded + no long tasks + event handlers attached)

```javascript
// TECHNIQUE 1: Code splitting & lazy loading
// Bad: Load everything upfront
import AdminDashboard from './AdminDashboard';
import ReportingTools from './ReportingTools';
import Analytics from './Analytics';

function App() {
  return (
    <>
      <AdminDashboard />
      <ReportingTools />
      <Analytics />
    </>
  );
}
// Total bundle: 500KB - TTI: 8s

// Good: Load on demand
const AdminDashboard = lazy(() => import('./AdminDashboard'));
const ReportingTools = lazy(() => import('./ReportingTools'));
const Analytics = lazy(() => import('./Analytics'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/reports" element={<ReportingTools />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Suspense>
  );
}
// Initial bundle: 50KB - TTI: 2s

// TECHNIQUE 2: Defer non-critical JavaScript
// Bad: Load everything immediately
<script src="analytics.js"></script>
<script src="chat-widget.js"></script>
<script src="tracking.js"></script>
<script src="app.js"></script>

// Good: Defer non-critical scripts
<script src="app.js"></script>
<script src="analytics.js" defer></script>
<script src="chat-widget.js" defer></script>

// Or load after interaction
function loadChatWidget() {
  if (window.chatLoaded) return;
  
  const script = document.createElement('script');
  script.src = 'https://cdn.example.com/chat.js';
  script.defer = true;
  document.body.appendChild(script);
  
  window.chatLoaded = true;
}

// Load on user interaction
document.addEventListener('scroll', loadChatWidget, { once: true });
document.addEventListener('click', loadChatWidget, { once: true });

// Or after timeout
setTimeout(loadChatWidget, 5000);

// TECHNIQUE 3: Optimize JavaScript execution
// Bad: Long task blocks main thread
function processAllData(items) {
  // 300ms task - blocks interaction!
  return items.map(item => expensiveOperation(item));
}

// Good: Break into chunks
async function processDataInChunks(items, chunkSize = 100) {
  const results = [];
  
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const processed = chunk.map(item => expensiveOperation(item));
    results.push(...processed);
    
    // Yield to browser
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  return results;
}

// Or use requestIdleCallback
function processWhenIdle(items) {
  return new Promise(resolve => {
    const results = [];
    let index = 0;
    
    function processChunk(deadline) {
      while (deadline.timeRemaining() > 0 && index < items.length) {
        results.push(expensiveOperation(items[index]));
        index++;
      }
      
      if (index < items.length) {
        requestIdleCallback(processChunk);
      } else {
        resolve(results);
      }
    }
    
    requestIdleCallback(processChunk);
  });
}

// TECHNIQUE 4: Reduce JavaScript bundle size
// 1. Tree shaking
// Bad: Import entire library
import _ from 'lodash'; // 72KB
const result = _.debounce(fn, 100);

// Good: Import specific function
import debounce from 'lodash/debounce'; // 3KB

// 2. Modern dependencies
// Bad: moment.js (67KB)
import moment from 'moment';
const date = moment().format('YYYY-MM-DD');

// Good: date-fns (2KB tree-shakable)
import { format } from 'date-fns';
const date = format(new Date(), 'yyyy-MM-dd');

// 3. Dynamic imports
// Bad: Import heavy library always
import Chart from 'chart.js';

// Good: Load when needed
function ChartComponent() {
  const [Chart, setChart] = useState(null);
  
  useEffect(() => {
    import('chart.js').then(module => {
      setChart(() => module.default);
    });
  }, []);
  
  if (!Chart) return <div>Loading chart...</div>;
  return <Chart data={data} />;
}

// TECHNIQUE 5: Server-side rendering (SSR) + Hydration
// Next.js example
export async function getServerSideProps() {
  const data = await fetch('https://api.example.com/data').then(r => r.json());
  return { props: { data } };
}

function Page({ data }) {
  // HTML rendered on server
  // Interactive immediately after hydration
  return <div>{data.map(item => <Item key={item.id} {...item} />)}</div>;
}

// TECHNIQUE 6: Prefetch/Preload critical resources
// Prefetch next page
function HomePage() {
  useEffect(() => {
    // Prefetch dashboard when user hovers over link
    const link = document.querySelector('a[href="/dashboard"]');
    
    link.addEventListener('mouseenter', () => {
      const component = import('./Dashboard');
      // Loads in background
    }, { once: true });
  }, []);
}

// Preload critical font
<link
  rel="preload"
  href="/fonts/inter.woff2"
  as="font"
  type="font/woff2"
  crossOrigin="anonymous"
/>

// TECHNIQUE 7: Web Workers for heavy computation
// Main thread
const worker = new Worker('heavy-computation.js');

worker.postMessage({ data: largeDataset });

worker.onmessage = (e) => {
  console.log('Result:', e.data);
  // Main thread stays responsive!
};

// heavy-computation.js
self.onmessage = (e) => {
  const result = performHeavyCalculation(e.data);
  self.postMessage(result);
};

// TECHNIQUE 8: Optimize React rendering
// Use React 18 concurrent features
import { startTransition } from 'react';

function SearchResults() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  
  const handleChange = (e) => {
    setQuery(e.target.value); // High priority - immediate
    
    startTransition(() => {
      // Low priority - can be interrupted
      setResults(performSearch(e.target.value));
    });
  };
  
  return (
    <>
      <input value={query} onChange={handleChange} />
      <Results data={results} />
    </>
  );
  // Input stays responsive even with expensive search
}

// MEASURE TTI
// Using Lighthouse
// npm install -g lighthouse
// lighthouse https://yoursite.com --view

// Or programmatically
import { PerformanceObserver } from 'perf_hooks';

const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`TTI: ${entry.startTime + entry.duration}ms`);
  }
});

observer.observe({ entryTypes: ['measure'] });

// REAL-WORLD CHECKLIST:
/*
✓ Code split routes
✓ Lazy load below-the-fold content
✓ Defer third-party scripts
✓ Minimize JavaScript bundle (<200KB compressed)
✓ Use SSR/SSG where possible
✓ Avoid long tasks (>50ms)
✓ Prefetch critical resources
✓ Use React concurrent features
✓ Monitor with Lighthouse/WebPageTest
*/
```

---

### 20. Code splitting strategies

```javascript
// STRATEGY 1: Route-based splitting
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Admin = lazy(() => import('./pages/Admin'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
// Each route is a separate bundle

// STRATEGY 2: Component-based splitting
function ProductPage() {
  const [showReviews, setShowReviews] = useState(false);
  
  const Reviews = lazy(() => import('./Reviews'));
  
  return (
    <div>
      <ProductInfo />
      <button onClick={() => setShowReviews(true)}>
        Show Reviews
      </button>
      
      {showReviews && (
        <Suspense fallback={<div>Loading reviews...</div>}>
          <Reviews />
        </Suspense>
      )}
    </div>
  );
}
// Reviews loaded only when user clicks button

// STRATEGY 3: Library splitting
// Dynamic import for heavy libraries
function ChartComponent({ data }) {
  const [ChartJS, setChartJS] = useState(null);
  
  useEffect(() => {
    import('chart.js').then(({ Chart }) => {
      setChartJS(() => Chart);
    });
  }, []);
  
  if (!ChartJS) return <ChartPlaceholder />;
  
  return <ChartJS type="bar" data={data} />;
}

// Or with React.lazy for components
const PDFViewer = lazy(() =>
  import('react-pdf').then(module => ({
    default: module.Document
  }))
);

// STRATEGY 4: Vendor splitting (webpack)
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      cacheGroups: {
        // Separate vendor bundle
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        },
        // Separate React bundle
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react',
          chunks: 'all',
          priority: 20
        },
        // Large libraries separately
        charts: {
          test: /[\\/]node_modules[\\/](chart\.js|recharts)[\\/]/,
          name: 'charts',
          chunks: 'async',
          priority: 30
        }
      }
    }
  }
};

// STRATEGY 5: Named chunks (for better debugging)
const AdminPanel = lazy(() =>
  import(/* webpackChunkName: "admin-panel" */ './AdminPanel')
);

const Analytics = lazy(() =>
  import(/* webpackChunkName: "analytics" */ './Analytics')
);

const Reports = lazy(() =>
  import(/* webpackChunkName: "reports" */ './Reports')
);

// Generates: admin-panel.chunk.js, analytics.chunk.js, reports.chunk.js

// STRATEGY 6: Prefetching and preloading
// Prefetch: Load during idle time
const Settings = lazy(() =>
  import(/* webpackPrefetch: true */ './Settings')
);
// <link rel="prefetch" href="settings.chunk.js">

// Preload: Load in parallel with parent
const CriticalModal = lazy(() =>
  import(/* webpackPreload: true */ './CriticalModal')
);
// <link rel="preload" href="modal.chunk.js">

// Manual prefetch
function HomePage() {
  useEffect(() => {
    // Prefetch dashboard when user likely to navigate there
    const timer = setTimeout(() => {
      import('./Dashboard');
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);
  
  return <div>Welcome!</div>;
}

// Prefetch on hover
function NavLink({ to, children }) {
  const handleMouseEnter = () => {
    if (to === '/dashboard') {
      import('./Dashboard');
    }
  };
  
  return (
    <Link to={to} onMouseEnter={handleMouseEnter}>
      {children}
    </Link>
  );
}

// STRATEGY 7: Dynamic imports with conditions
function AdminSection({ userRole }) {
  const [Component, setComponent] = useState(null);
  
  useEffect(() => {
    if (userRole === 'admin') {
      import('./AdminDashboard').then(mod =>
        setComponent(() => mod.default)
      );
    } else if (userRole === 'moderator') {
      import('./ModeratorDashboard').then(mod =>
        setComponent(() => mod.default)
      );
    } else {
      import('./UserDashboard').then(mod =>
        setComponent(() => mod.default)
      );
    }
  }, [userRole]);
  
  if (!Component) return <Loader />;
  return <Component />;
}

// STRATEGY 8: Bundle analysis
// package.json
{
  "scripts": {
    "analyze": "webpack-bundle-analyzer dist/stats.json"
  }
}

// Or with Next.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
});

module.exports = withBundleAnalyzer({
  // Next.js config
});

// Run: ANALYZE=true npm run build

// STRATEGY 9: Per-page optimization
function BlogPost({ postId }) {
  const [content, setContent] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [showRelated, setShowRelated] = useState(false);
  
  // Load content immediately
  useEffect(() => {
    import(`./posts/${postId}`).then(setContent);
  }, [postId]);
  
  // Lazy load comments
  const Comments = lazy(() => import('./Comments'));
  
  // Lazy load related posts
  const RelatedPosts = lazy(() => import('./RelatedPosts'));
  
  return (
    <article>
      {content}
      
      <button onClick={() => setShowComments(true)}>
        Show Comments
      </button>
      
      {showComments && (
        <Suspense fallback={<CommentSkeleton />}>
          <Comments postId={postId} />
        </Suspense>
      )}
      
      <button onClick={() => setShowRelated(true)}>
        Show Related
      </button>
      
      {showRelated && (
        <Suspense fallback={<PostSkeleton />}>
          <RelatedPosts postId={postId} />
        </Suspense>
      )}
    </article>
  );
}

// STRATEGY 10: Progressive enhancement
function FeatureRichEditor() {
  const [enhancementsLoaded, setEnhancementsLoaded] = useState(false);
  
  // Basic editor loads immediately
  const [text, setText] = useState('');
  
  // Load enhancements after initial render
  useEffect(() => {
    import('./editor-enhancements').then(enhancements => {
      enhancements.initialize();
      setEnhancementsLoaded(true);
    });
  }, []);
  
  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      
      {enhancementsLoaded && (
        <>
          <Toolbar />
          <AutoSave text={text} />
          <SyntaxHighlighter text={text} />
        </>
      )}
    </div>
  );
}

// BEST PRACTICES:
/*
✓ Split by routes (most common)
✓ Split heavy components (modals, editors, charts)
✓ Split libraries >50KB
✓ Use named chunks for debugging
✓ Prefetch user's likely next action
✓ Analyze bundle regularly
✓ Keep critical path small (<200KB)
✓ Use Suspense for loading states
✓ Cache split bundles aggressively
✓ Monitor bundle sizes in CI
*/
```

---

Due to length constraints, I'll continue with the remaining questions. Would you like me to continue with questions 21-30?