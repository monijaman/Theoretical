What will be the output of this code and why?

function outer() {
  let count = 0;

  return function inner() {
    count++;
    console.log(count);
  };
}

const fn1 = outer();
const fn2 = outer();

fn1();
fn1();
fn2();
fn1();

2. 🔹 Round 2 — Async JavaScript (Event Loop)

console.log("start");

setTimeout(() => {
  console.log("timeout");
}, 0);

Promise.resolve().then(() => {
  console.log("promise");
});

console.log("end");

3.What will this log?

const obj = {
  name: "Monir",
  greet: function () {
    console.log(this.name);

    setTimeout(function () {
      console.log(this.name);
    }, 0);

    setTimeout(() => {
      console.log(this.name);
    }, 0);
  },
};

obj.greet();

4. 🔹 Round 4 — Advanced JS (Hoisting + Temporal Dead Zone)


console.log(a);
console.log(b);
console.log(c);

var a = 10;
let b = 20;
const c = 30;


🔹 Round 5 — Real Fullstack Scenario (Data Handling)



Round 6 — Backend + Async (Very Important for Fullstack)

app.get("/users", async (req, res) => {
  const users = User.find(); // Mongo / DB call

  res.json(users);
});

corrected code:

app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});


7. Dbounce

function debounce(fn, delay) {
  let timer;

  return function (...args) {
    clearTimeout(timer);

    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

// Usage
const handleResize = debounce(() => {
  console.log("Window resized");
}, 500);


8.   proceess.nextTick() vs setTimeout(fn, 0) vs setImmediate()

Correct Senior-Level Explanation
🧠 1. process.nextTick()
Runs immediately after the current function finishes
Executes before any event loop phase
Even before Promises in Node.js

👉 It has its own special queue

⚠️ Danger:

can block event loop if abused
⚡ 2. setTimeout(fn, 0)
Goes to Timers phase
Executes after minimum delay
NOT guaranteed immediate

👉 Runs when:

timer expires
event loop reaches “timers phase”
⚙️ 3. setImmediate()
Runs in Check phase
Executes after I/O events callbacks

👉 Usually:

comes AFTER I/O cycle


9. Throttle
function throttle(fn, delay) {
  let lastTime = 0;

  return function (...args) {
    const now = Date.now();

    if (now - lastTime >= delay) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}


// Usage
const handleScroll = throttle(() => {
  console.log("Scrolled");
}, 200);