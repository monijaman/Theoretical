# Node.js & Express Interview Questions

## Basic Level

### 1. What is Node.js?

Node.js is a JavaScript runtime built on Chrome's V8 JavaScript engine. It is used to build scalable and high-performance server-side applications. It operates on a non-blocking, event-driven I/O model.

### 2. What are the key features of Node.js?

- **Non-blocking, event-driven I/O**: Handles multiple requests concurrently without waiting for tasks to complete.
- **Single-threaded**: Uses a single thread to handle requests but supports concurrency via the event loop.
- **Built on V8 JavaScript Engine**: Provides fast execution of JavaScript code.
- **Package Manager (npm)**: Comes with npm, which offers a huge collection of open-source libraries.

### 3. What is Express.js and how is it different from Node.js?

Express.js is a web application framework for Node.js. It simplifies the development of APIs by providing a robust set of features to build single-page, multi-page, and hybrid web applications.

### 4. Explain the concept of middleware in Express.js.

Middleware in Express.js is a function that receives the request and response objects, and performs some operation on them. It can modify the request, response, or end the request-response cycle.

### 5. What are callbacks in Node.js?

A callback is a function passed into another function as an argument to be executed later, typically after a task has been completed.

---

## Intermediate Level

### 6. What is an event loop in Node.js?

The event loop is the mechanism that handles asynchronous operations in Node.js. It constantly checks if there are any tasks in the callback queue and pushes them to the stack for execution. It operates in a single thread.

### 7. How does Node.js handle asynchronous code?

Node.js uses non-blocking I/O and a single-threaded event loop to manage asynchronous code. Asynchronous operations are handled by the event loop, which runs in the background while the main thread processes other tasks.

### 8. What is the purpose of `process.nextTick()` in Node.js?

`process.nextTick()` is used to schedule a callback to be invoked in the next iteration of the event loop, right after the current operation completes, but before any I/O tasks are executed.

### 9. Explain the role of `app.listen()` in an Express application.

`app.listen()` is used to bind and listen for incoming connections on a specified port. It starts the HTTP server.

### 10. What is CORS, and how do you enable it in an Express app?

CORS (Cross-Origin Resource Sharing) is a mechanism to allow or restrict web browsers from making requests to a different domain than the one from which the original request was made. You can enable it in Express using the `cors` middleware.

````js
const cors = require('cors');
app.use(cors());


# Advanced Node.js & Express Interview Questions

## 11. What is the difference between `require()` and `import` in Node.js?
- **`require()`**: CommonJS method used for importing modules synchronously.
- **`import`**: ES6 module syntax used for importing modules, typically in ECMAScript modules (ESM).

## 12. How can you handle uncaught exceptions and unhandled promise rejections in Node.js?
You can handle uncaught exceptions and unhandled promise rejections by listening to the respective process events:

```js
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

````

## 13. Explain the cluster module in Node.js.

The cluster module allows you to create child processes (workers) that share the same server port. This helps to scale applications across multiple CPU cores, increasing performance.

## 14. What are Promises and how do they work in Node.js?

A Promise is an object that represents the eventual completion or failure of an asynchronous operation. It can be in one of three states:

- **Pending:** The operation is still in progress.
- **Fulfilled:** The operation completed successfully.
- **Rejected:** The operation failed.

## 15. How do you optimize the performance of a Node.js application?

- Use asynchronous operations (non-blocking I/O).
- Cache responses where possible.
- Optimize database queries.
- Load balancing using the cluster module.
- Avoid memory leaks by properly managing memory and garbage collection.

# Practical/Scenario-Based Questions

## 16. How would you handle file uploads in Express.js?

You can use middleware like multer to handle file uploads in an Express.js application.

```js
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
app.post("/upload", upload.single("file"), (req, res) => {
  res.send("File uploaded successfully!");
});
```

## 17. Explain how you would implement authentication in an Express.js app.

Authentication in Express can be implemented using JWT (JSON Web Token) or session-based authentication. A common approach is using the jsonwebtoken library to issue tokens after the user logs in.

```js
const jwt = require("jsonwebtoken");
app.post("/login", (req, res) => {
  const token = jwt.sign({ userId: user.id }, "secret-key");
  res.json({ token });
});
```

## 18. How would you structure a large Express application?

A large Express application can be structured in a modular way, where you separate concerns like routes, models, controllers, and services into different files or folders. You can use Express Router to organize routes.

```js
/src
  /controllers
    userController.js
  /routes
    userRoutes.js
  /models
    userModel.js
  /services
    userService.js
  app.js
```

## 19. How do you manage environment variables in a Node.js app?

You can use the dotenv package to load environment variables from a .env file.

```js
PORT = 3000;
DB_HOST = localhost;

require("dotenv").config();
const port = process.env.PORT;
```

## 20. How would you implement rate limiting in an Express application?

You can implement rate limiting using the express-rate-limit middleware to limit the number of requests a client can make in a given time period.

```js
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);
```

## 21. How would you perform logging in a Node.js application?

Logging can be done using libraries like winston or morgan for detailed and structured logs.

```js
const winston = require("winston");
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "app.log" }),
  ],
});
logger.info("This is an info log");
```

## 22. Explain the purpose of async and await in Node.js.

async and await simplify working with Promises. async functions always return a Promise, and await pauses the function execution until the Promise resolves or rejects.

```js
async function fetchData() {
  const data = await someAsyncFunction();
  console.log(data);
}
```

[React-Express-Auth-Fileupload](https://github.com/monijaman/React-Express-Auth-Fileupload)
