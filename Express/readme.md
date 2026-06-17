# ExpressJs

## How does Express.js handle routing in a web application?

Express.js handles routing by using its built-in router to define URL paths and associate them with specific HTTP methods (GET, POST, PUT, DELETE, etc.) and their corresponding handler functions. For example:

```ts
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.post("/submit", (req, res) => {
  res.send("Data submitted!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## What is the difference between a class component and a functional component in React?

Class components use ES6 classes, support lifecycle methods like componentDidMount, and manage state using this.state and this.setState. Functional components are simpler, use hooks like useState for state management, and do not have lifecycle methods. For example:

```ts
// Class Component
import React, { Component } from "react";

class Greeting extends Component {
  constructor(props) {
    super(props);
    this.state = { message: "Hello, World!" };
  }

  render() {
    return <h1>{this.state.message}</h1>;
  }
}

// Functional Component
import React, { useState } from "react";

function Greeting() {
  const [message, setMessage] = useState("Hello, World!");
  return <h1>{message}</h1>;
}
```

## Explain the purpose and use of MongoDB in the MERN stack.

MongoDB is a NoSQL database used for storing and retrieving data in a document-oriented format. It uses collections and documents instead of tables and rows, making it highly flexible for applications with dynamic schemas. In the MERN stack, MongoDB serves as the primary database to store application data.

## What is the MERN stack, and what are its main components?

The MERN stack is a set of technologies used for full-stack web development:

M: MongoDB (Database)
E: Express.js (Backend framework)
R: React.js (Frontend library)
N: Node.js (Runtime environment)
These components work together to build scalable and modern web applications.

## What is the purpose of middleware in Express.js, and how do you implement it?

Middleware functions in Express.js are used to handle request and response processing.
