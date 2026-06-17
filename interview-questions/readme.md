# Technical Knowledge and Expertise (30 minutes)

# a. Core Concepts

## Question: Explain the difference between let, const, and var in JavaScript.

Answer:

var is function-scoped and can be redeclared and updated.

let is block-scoped, can be updated but not redeclared.

const is block-scoped, cannot be updated or redeclared.
Purpose: Tests understanding of variable scoping and immutability.

### Question: What is the difference between == and === in JavaScript?

Answer:

== checks for value equality with type coercion.

=== checks for value and type equality without coercion.
Purpose: Evaluates knowledge of type coercion and strict equality.

### Question: How does React handle state management, and what are the differences between useState and useReducer?

Answer:

useState is used for simple state management.

useReducer is used for complex state logic, similar to Redux.
Purpose: Assesses familiarity with React state management.

## Question: What is the purpose of a REST API, and how does it differ from GraphQL?

Answer:

REST is a standard for creating stateless APIs with endpoints for specific resources.

GraphQL allows clients to request only the data they need, reducing over-fetching.
Purpose: Tests knowledge of API design and modern alternatives.

### Question: Explain the concept of closures in JavaScript.

Answer:

A closure is a function that retains access to its lexical scope, even when executed outside that scope.
Purpose: Evaluates understanding of advanced JavaScript concepts.

b. Debugging and Code Review
Question: What would you do if a piece of code is working in development but failing in production?
Answer:

Check for environment-specific differences (e.g., API endpoints, environment variables).

Review logs and error messages.

Test locally with production-like settings.
Purpose: Tests debugging and problem-solving skills.

### Question: Review this code snippet. What issues do you see, and how would you fix them?

```js
function addNumbers(a, b) {
  return a + b;
}
console.log(addNumbers("5", "10")); // Outputs "510"
```

Answer:

The function concatenates strings instead of adding numbers.

Fix: Convert inputs to numbers using Number() or parseInt().
Purpose: Evaluates attention to detail and debugging skills.

## Problem-Solving Skills

## a. Algorithmic Thinking

Question: Write a function to reverse a string in JavaScript.
Answer:

```javascript
function reverseString(str) {
  return str.split("").reverse().join("");
}
```

Purpose: Tests basic algorithmic thinking and familiarity with JavaScript methods.

### Question: How would you find the first non-repeating character in a string?

Answer:

```js
function firstNonRepeatingChar(str) {
  const charCount = {};
  for (let char of str) {
    charCount[char] = (charCount[char] || 0) + 1;
  }
  for (let char of str) {
    if (charCount[char] === 1) return char;
  }
  return null;
}
```

Purpose: Evaluates problem-solving and optimization skills.

### Question: Write a function to check if a number is a palindrome.

Answer:

```js
function isPalindrome(num) {
  const str = num.toString();
  return str === str.split("").reverse().join("");
}
```

Purpose: Tests ability to solve problems involving numbers and strings.

## b. Real-World Scenarios

### Question: How would you optimize a slow-loading web page?

Answer:

Minimize and compress assets (CSS, JS, images).

Use lazy loading for images.

Enable browser caching.

Reduce server response time.
Purpose: Evaluates understanding of web performance optimization.

### Question: You are given a task to implement a feature, but the requirements are unclear. What would you do?

Answer:

Clarify requirements with stakeholders or product managers.

Break down the task into smaller, manageable parts.

Provide a prototype or proof of concept for feedback.
Purpose: Tests communication and problem-solving in ambiguous situations.

### Question: How would you handle a situation where a teammate’s code is causing bugs in the application?

Answer:

Communicate with the teammate to understand their approach.

Review the code together to identify the issue.

Suggest improvements and collaborate on a fix.
Purpose: Evaluates teamwork and conflict resolution skills.

### 3. Bonus Questions (If Time Permits)

Question: Explain the concept of "hoisting" in JavaScript.
Answer:

## Hoisting is JavaScript's behavior of moving declarations to the top of their scope during compilation.

Variables declared with var are hoisted and initialized with undefined.

Functions are fully hoisted.
Purpose: Tests understanding of JavaScript internals.

## Question: What is the difference between synchronous and asynchronous code execution?

Answer:

Synchronous code runs sequentially, blocking further execution until the current task is complete.

Asynchronous code allows tasks to run in the background, improving performance.
Purpose: Evaluates knowledge of asynchronous programming.

### Question: How would you design a system to handle 1 million requests per second?

Answer:

Use load balancers to distribute traffic.

Implement caching (e.g., Redis) to reduce database load.

Use a microservices architecture for scalability.

Optimize database queries and use indexing.
Purpose: Tests system design and scalability knowledge.

Scoring Criteria
Technical Knowledge: Accuracy and depth of answers.

Problem-Solving: Logical approach, efficiency, and correctness of solutions.

Communication: Clarity and ability to explain concepts.

Adaptability: Handling ambiguous or unfamiliar scenarios.

This set of questions ensures a comprehensive evaluation of the candidate’s technical and problem-solving abilities within a 60-minute timeframe.

Unfortunately, I cannot directly generate a downloadable PDF file for you. However, I can provide you with the text content, which you can copy and paste into a document editor (like Microsoft Word, Google Docs, or any other tool) and save it as a PDF. Here's the content again for your convenience:

## Interview Questions for Technical Analysis of a Jr. or Mid-Level Candidate

### Topic: Technical Knowledge and Expertise

### Question: Explain the difference between let, const, and var in JavaScript.

Answer:

var is function-scoped and can be redeclared and updated.

let is block-scoped, can be updated but not redeclared.

const is block-scoped, cannot be updated or redeclared.

## Question: What is the difference between == and === in JavaScript?

Answer:

== checks for value equality with type coercion.

=== checks for value and type equality without coercion.

## Question: How does React handle state management, and what are the differences between useState and useReducer?

Answer:

useState is used for simple state management.

useReducer is used for complex state logic, similar to Redux.

## Question: What is the purpose of a REST API, and how does it differ from GraphQL?

Answer:

REST is a standard for creating stateless APIs with endpoints for specific resources.

GraphQL allows clients to request only the data they need, reducing over-fetching.

### Question: Explain the concept of closures in JavaScript.

Answer:

A closure is a function that retains access to its lexical scope, even when executed outside that scope.

## Question: What would you do if a piece of code is working in development but failing in production?

Answer:

Check for environment-specific differences (e.g., API endpoints, environment variables).

Review logs and error messages.

Test locally with production-like settings.

### Question: Review this code snippet. What issues do you see, and how would you fix them?

```js
function addNumbers(a, b) {
  return a + b;
}

console.log(addNumbers("5", "10")); // Outputs "510"
```

Answer:

The function concatenates strings instead of adding numbers.

Fix: Convert inputs to numbers using Number() or parseInt().

Topic: Problem-Solving Skills
Question: Write a function to reverse a string in JavaScript.
Answer:

```js
function reverseString(str) {
  return str.split("").reverse().join("");
}
```

### Question: How would you find the first non-repeating character in a string?

Answer:

```js
function firstNonRepeatingChar(str) {
  const charCount = {};
  for (let char of str) {
    charCount[char] = (charCount[char] || 0) + 1;
  }
  for (let char of str) {
    if (charCount[char] === 1) return char;
  }
  return null;
}
```

### Question : Write a function to check if a number is a palindrome.

Answer:

```js
function isPalindrome(num) {
  const str = num.toString();
  return str === str.split("").reverse().join("");
}
```

### Question: How would you optimize a slow-loading web page?

Answer:

Minimize and compress assets (CSS, JS, images).

Use lazy loading for images.

Enable browser caching.

Reduce server response time.

### Question: You are given a task to implement a feature, but the requirements are unclear. What would you do?

Answer:

Clarify requirements with stakeholders or product managers.

Break down the task into smaller, manageable parts.

Provide a prototype or proof of concept for feedback.

### Question: How would you handle a situation where a teammate’s code is causing bugs in the application?

Answer:

Communicate with the teammate to understand their approach.

Review the code together to identify the issue.

Suggest improvements and collaborate on a fix.

Bonus Questions (If Time Permits)
Question: Explain the concept of "hoisting" in JavaScript.
Answer:

Hoisting is JavaScript's behavior of moving declarations to the top of their scope during compilation.

Variables declared with var are hoisted and initialized with undefined.

Functions are fully hoisted.

### Question: What is the difference between synchronous and asynchronous code execution?

Answer:

Synchronous code runs sequentially, blocking further execution until the current task is complete.

Asynchronous code allows tasks to run in the background, improving performance.

### Question: How would you design a system to handle 1 million requests per second?

Answer:

- Use load balancers to distribute traffic.

- Implement caching (e.g., Redis) to reduce database load.

- Use a microservices architecture for scalability.

- Optimize database queries and use indexing.

Scoring Criteria
Technical Knowledge: Accuracy and depth of answers.

Problem-Solving: Logical approach, efficiency, and correctness of solutions.

Communication: Clarity and ability to explain concepts.

Adaptability: Handling ambiguous or unfamiliar scenarios.

You can copy this content into a document editor, format it as needed, and save it as a PDF. Let me know if you need further assistance!

then .md format for github
Here’s the content in Markdown (.md) format, which you can use directly on GitHub or any Markdown-supported platform:

# Interview Questions for Technical Analysis of a Jr. or Mid-Level Candidate

## Topic: Technical Knowledge and Expertise

### 1. Core Concepts

**Question**: Explain the difference between `let`, `const`, and `var` in JavaScript.  
**Answer**:

- `var` is function-scoped and can be redeclared and updated.
- `let` is block-scoped, can be updated but not redeclared.
- `const` is block-scoped, cannot be updated or redeclared.

---

**Question**: What is the difference between `==` and `===` in JavaScript?  
**Answer**:

- `==` checks for value equality with type coercion.
- `===` checks for value and type equality without coercion.

---

**Question**: How does React handle state management, and what are the differences between `useState` and `useReducer`?  
**Answer**:

- `useState` is used for simple state management.
- `useReducer` is used for complex state logic, similar to Redux.

---

**Question**: What is the purpose of a REST API, and how does it differ from GraphQL?  
**Answer**:

- REST is a standard for creating stateless APIs with endpoints for specific resources.
- GraphQL allows clients to request only the data they need, reducing over-fetching.

---

**Question**: Explain the concept of closures in JavaScript.  
**Answer**:

- A closure is a function that retains access to its lexical scope, even when executed outside that scope.

---

### 2. Debugging and Code Review

**Question**: What would you do if a piece of code is working in development but failing in production?  
**Answer**:

- Check for environment-specific differences (e.g., API endpoints, environment variables).
- Review logs and error messages.
- Test locally with production-like settings.

---

**Question**: Review this code snippet. What issues do you see, and how would you fix them?

```javascript
function addNumbers(a, b) {
  return a + b;
}
console.log(addNumbers("5", "10")); // Outputs "510"
```

Answer:

The function concatenates strings instead of adding numbers.

Fix: Convert inputs to numbers using Number() or parseInt().

Topic: Problem-Solving Skills

## 1. Algorithmic Thinking

Question: Write a function to reverse a string in JavaScript.
Answer:

```js
function reverseString(str) {
  return str.split("").reverse().join("");
}
```

## Question: How would you find the first non-repeating character in a string?

Answer:

```js
function firstNonRepeatingChar(str) {
  const charCount = {};
  for (let char of str) {
    charCount[char] = (charCount[char] || 0) + 1;
  }
  for (let char of str) {
    if (charCount[char] === 1) return char;
  }
  return null;
}
```

## Question: Write a function to check if a number is a palindrome.

Answer:

```js
function isPalindrome(num) {
  const str = num.toString();
  return str === str.split("").reverse().join("");
}
```

# 2. Real-World Scenarios

## Question: How would you optimize a slow-loading web page?

Answer:

Minimize and compress assets (CSS, JS, images).

Use lazy loading for images.

Enable browser caching.

Reduce server response time.

## Question: You are given a task to implement a feature, but the requirements are unclear. What would you do?

Answer:

Clarify requirements with stakeholders or product managers.

Break down the task into smaller, manageable parts.

Provide a prototype or proof of concept for feedback.

## Question: How would you handle a situation where a teammate’s code is causing bugs in the application?

Answer:

Communicate with the teammate to understand their approach.

Review the code together to identify the issue.

Suggest improvements and collaborate on a fix.

Bonus Questions (If Time Permits)

## Question: Explain the concept of "hoisting" in JavaScript.

Answer:

Hoisting is JavaScript's behavior of moving declarations to the top of their scope during compilation.

Variables declared with var are hoisted and initialized with undefined.

Functions are fully hoisted.

## Question: What is the difference between synchronous and asynchronous code execution?

Answer:

Synchronous code runs sequentially, blocking further execution until the current task is complete.

Asynchronous code allows tasks to run in the background, improving performance.

## Question: How would you design a system to handle 1 million requests per second?

Answer:

Use load balancers to distribute traffic.

Implement caching (e.g., Redis) to reduce database load.

Use a microservices architecture for scalability.

Optimize database queries and use indexing.

Scoring Criteria
Technical Knowledge: Accuracy and depth of answers.

Problem-Solving: Logical approach, efficiency, and correctness of solutions.

Communication: Clarity and ability to explain concepts.

Adaptability: Handling ambiguous or unfamiliar scenarios.

### How to Use:

1. Copy the above Markdown content.
2. Create a new file on GitHub (or any Markdown editor) with a `.md` extension (e.g., `interview_questions.md`).
3. Paste the content into the file.
4. Commit the file to your repository.

This will render the content in a clean, readable format on GitHub. Let me know if you need further assistance! 🚀
complete that
Here’s the complete Markdown (.md) file with all the questions, answers, and formatting for GitHub:

# Interview Questions for Technical Analysis of a Jr. or Mid-Level Candidate

## Topic: Technical Knowledge and Expertise

### 1. Core Concepts

**Question**: Explain the difference between `let`, `const`, and `var` in JavaScript.
**Answer**:

- `var` is function-scoped and can be redeclared and updated.
- `let` is block-scoped, can be updated but not redeclared.
- `const` is block-scoped, cannot be updated or redeclared.

---

**Question**: What is the difference between `==` and `===` in JavaScript?
**Answer**:

- `==` checks for value equality with type coercion.
- `===` checks for value and type equality without coercion.

---

**Question**: How does React handle state management, and what are the differences between `useState` and `useReducer`?
**Answer**:

- `useState` is used for simple state management.
- `useReducer` is used for complex state logic, similar to Redux.

---

**Question**: What is the purpose of a REST API, and how does it differ from GraphQL?
**Answer**:

- REST is a standard for creating stateless APIs with endpoints for specific resources.
- GraphQL allows clients to request only the data they need, reducing over-fetching.

---

**Question**: Explain the concept of closures in JavaScript.
**Answer**:

- A closure is a function that retains access to its lexical scope, even when executed outside that scope.

---

### 2. Debugging and Code Review

**Question**: What would you do if a piece of code is working in development but failing in production?
**Answer**:

- Check for environment-specific differences (e.g., API endpoints, environment variables).
- Review logs and error messages.
- Test locally with production-like settings.

---

**Question**: Review this code snippet. What issues do you see, and how would you fix them?

````javascript
function addNumbers(a, b) {
    return a + b;
}
console.log(addNumbers("5", "10")); // Outputs "510"
Answer:

The function concatenates strings instead of adding numbers.

Fix: Convert inputs to numbers using Number() or parseInt().

Topic: Problem-Solving Skills
1. Algorithmic Thinking
Question: Write a function to reverse a string in JavaScript.
Answer:

```js
function reverseString(str) {
    return str.split("").reverse().join("");
}

````

Question: How would you find the first non-repeating character in a string?
Answer:

```js
function firstNonRepeatingChar(str) {
  const charCount = {};
  for (let char of str) {
    charCount[char] = (charCount[char] || 0) + 1;
  }
  for (let char of str) {
    if (charCount[char] === 1) return char;
  }
  return null;
}
```

Question: Write a function to check if a number is a palindrome.
Answer:

```js
function isPalindrome(num) {
  const str = num.toString();
  return str === str.split("").reverse().join("");
}
```

2. Real-World Scenarios
   Question: How would you optimize a slow-loading web page?
   Answer:

Minimize and compress assets (CSS, JS, images).

Use lazy loading for images.

Enable browser caching.

Reduce server response time.

## Question: You are given a task to implement a feature, but the requirements are unclear. What would you do?

Answer:

Clarify requirements with stakeholders or product managers.

Break down the task into smaller, manageable parts.

Provide a prototype or proof of concept for feedback.

## Question: How would you handle a situation where a teammate’s code is causing bugs in the application?

Answer:

Communicate with the teammate to understand their approach.

Review the code together to identify the issue.

Suggest improvements and collaborate on a fix.

Bonus Questions (If Time Permits)

## Question: Explain the concept of "hoisting" in JavaScript.

Answer:

Hoisting is JavaScript's behavior of moving declarations to the top of their scope during compilation.

Variables declared with var are hoisted and initialized with undefined.

Functions are fully hoisted.

## Question: What is the difference between synchronous and asynchronous code execution?

Answer:

Synchronous code runs sequentially, blocking further execution until the current task is complete.

Asynchronous code allows tasks to run in the background, improving performance.

## Question: How would you design a system to handle 1 million requests per second?

Answer:

Use load balancers to distribute traffic.

Implement caching (e.g., Redis) to reduce database load.

Use a microservices architecture for scalability.

Optimize database queries and use indexing.

Scoring Criteria
Technical Knowledge: Accuracy and depth of answers.

Problem-Solving: Logical approach, efficiency, and correctness of solutions.

Communication: Clarity and ability to explain concepts.

Adaptability: Handling ambiguous or unfamiliar scenarios.

# React Coding:

## Beginner

### Q1. Write a simple React component that displays “Hello, World!” on the screen.

```js
import React from "react";

const HelloWorld = () => {
  return <h1>Hello, World!</h1>;
};

export default HelloWorld;
```

### Q2. Create a functional component that takes a name prop and displays a greeting message.

```js
import React from "react";

const Greeting = ({ name }) => {
  return <h2>Hello, {name}!</h2>;
};

export default Greeting;
```

### Q3. Write a React component that maintains a count state and has buttons to increment and decrement the count.

```js
import React, { useState } from "react";

const Counter = () => {
  const [count, setCount] = useState(0);
  return (
    <div>
      <h2>Count: {count}</h2>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
    </div>
  );
};

export default Counter;
```

### Q4. How do you create a controlled component for an input field?

```js
import React, { useState } from "react";

const ControlledInput = () => {
  const [value, setValue] = useState("");

  const handleChange = (event) => {
    setValue(event.target.value);
  };

  return <input type="text" value={value} onChange={handleChange} />;
};

export default ControlledInput;
```

### Q5. Write a simple component that fetches data from an API and displays it.

```js
import React, { useEffect, useState } from "react";

const DataFetchingComponent = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("https://api.example.com/data")
      .then((response) => response.json())
      .then((data) => setData(data));
  }, []);

  return (
    <ul>
      {data.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
};

export default DataFetchingComponent;
```

### Q6. Write a component that toggles between two states using a button.

Answer: We can write a React component that toggles between two states using a button with this code:

import React, { useState } from 'react';

const ToggleComponent = () => {
const [isOn, setIsOn] = useState(false);

    return (
        <div>
            <h2>{isOn ? 'On' : 'Off'}</h2>
            <button onClick={() => setIsOn(!isOn)}>Toggle</button>
        </div>
    );

};

export default ToggleComponent;

### Q7. How can you use the useEffect hook to mimic componentDidMount?

Answer: To mimic componentDidMount using the useEffect hook, we can consider this code:

```js
import React, { useEffect } from "react";

const ComponentDidMountExample = () => {
  useEffect(() => {
    console.log("Component Mounted");
  }, []); // Empty dependency array mimics componentDidMount

  return <h2>Check the console for a message.</h2>;
};

export default ComponentDidMountExample;
```

### Q8. Write a component that displays a list of items and highlights the selected item.

Answer: This component displays a list of items and highlights the selected item based on user interaction:

```js
import React, { useState } from "react";

const HighlightList = () => {
  const items = ["Item 1", "Item 2", "Item 3"];
  const [selectedIndex, setSelectedIndex] = useState(null);

  return (
    <ul>
      {items.map((item, index) => (
        <li
          key={index}
          onClick={() => setSelectedIndex(index)}
          style={{
            backgroundColor: selectedIndex === index ? "yellow" : "white",
          }}
        >
          {item}
        </li>
      ))}
    </ul>
  );
};

export default HighlightList;
```

### Q09. Create a simple form with validation for an email input.

```js
import React, { useState } from "react";

const EmailForm = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Invalid email format");
    } else {
      setError("");
      console.log("Email submitted:", email);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
      />
      <button type="submit">Submit</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
};

export default EmailForm;
```

## Mid Level

### Q10. Write a higher-order component that logs props to the console.

Answer: Through this code, you can create a higher-order component (HOC) that logs the received props before rendering the wrapped component. This is useful for debugging and understanding the data flow in React components.

```js
import React from "react";

const withLogging = (WrappedComponent) => {
  return (props) => {
    console.log("Props:", props);
    return <WrappedComponent {...props} />;
  };
};

export default withLogging;
```

### Q11. Create a component that uses the useContext hook.

Answer: Here’s a simple code that demonstrates how to utilize the useContext hook in React. This allows components to access context data without having to pass props through every level of the component tree.

```js
import React, { useContext, createContext } from "react";

const MyContext = createContext();

const ContextProvider = ({ children }) => {
  return (
    <MyContext.Provider value="Hello from Context">
      {children}
    </MyContext.Provider>
  );
};

const ComponentUsingContext = () => {
  const value = useContext(MyContext);
  return <h2>{value}</h2>;
};

const App = () => {
  return (
    <ContextProvider>
      <ComponentUsingContext />
    </ContextProvider>
  );
};

export default App;
```

### Q12. Create a component that implements error boundaries.

Answer: This code illustrates how to create an error boundary in React, which catches JavaScript errors in its child component tree and displays a fallback UI.

```js
import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.log("Error logged:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}

const FaultyComponent = () => {
  throw new Error("I crashed!");
};

const App = () => {
  return (
    <ErrorBoundary>
      <FaultyComponent />
    </ErrorBoundary>
  );
};

export default App;
```

### Q13. How do you implement debouncing for an input field?

Answer: This component demonstrates how to implement debouncing for an input field, allowing the input value to be updated only after the user stops typing for a specified duration.

```js
import React from "react";

import React, { useState, useEffect } from "react";

const DebouncedInput = () => {
  const [value, setValue] = useState("");
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [value]);

  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type something..."
      />
      <p>Debounced Value: {debouncedValue}</p>
    </div>
  );
};

export default DebouncedInput;
```

### Q14. Write a component that uses the useReducer hook.

Answer: This code showcases how to manage complex state logic using the useReducer hook, providing a more structured way to handle state updates than useState.

```js
import React, { useReducer } from "react";

const initialState = { count: 0 };

const reducer = (state, action) => {
  switch (action.type) {
    case "increment":
      return { count: state.count + 1 };
    case "decrement":
      return { count: state.count - 1 };
    default:
      throw new Error();
  }
};

const CounterWithReducer = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <div>
      <h2>Count: {state.count}</h2>
      <button onClick={() => dispatch({ type: "increment" })}>Increment</button>
      <button onClick={() => dispatch({ type: "decrement" })}>Decrement</button>
    </div>
  );
};

export default CounterWithReducer;
```

`

### Q15. Create a custom hook to manage the form input state.

Answer: In this code, you can create a custom hook to handle form input state, which simplifies managing controlled components in forms.

```js
import React, { useState } from "react";

const useFormInput = (initialValue) => {
  const [value, setValue] = useState(initialValue);

  const handleChange = (event) => {
    setValue(event.target.value);
  };

  return {
    value,
    onChange: handleChange,
  };
};

const CustomForm = () => {
  const nameInput = useFormInput("");

  return (
    <form>
      <input type="text" {...nameInput} placeholder="Name" />
      <button type="submit">Submit</button>
    </form>
  );
};

export default CustomForm;
```

### Q16. Write a component that uses local storage to save form data.

Answer: This component demonstrates how to utilize the browser’s local storage to save and retrieve form data, providing persistence across page reloads.

```js
import React, { useState, useEffect } from "react";

const LocalStorageForm = () => {
  const [name, setName] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("name");
    if (savedName) {
      setName(savedName);
    }
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    localStorage.setItem("name", name);
    alert("Name saved to local storage!");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your name"
      />
      <button type="submit">Save</button>
    </form>
  );
};

export default LocalStorageForm;
```

### Q17. How do you create a component that uses the useMemo hook?

Answer: This code illustrates how to use the useMemo hook to optimize performance by memoizing expensive calculations based on dependencies.

```js
import React, { useMemo, useState } from "react";

const MemoizedComponent = () => {
  const [count, setCount] = useState(0);
  const [name, setName] = useState("");

  const computedValue = useMemo(() => {
    console.log("Calculating...");
    return count * 2;
  }, [count]);

  return (
    <div>
      <h2>Count: {count}</h2>
      <h3>Computed Value: {computedValue}</h3>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your name"
      />
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
};

export default MemoizedComponent;
```

### Q18. Write a component that implements infinite scrolling.

Answer: This component showcases how to implement infinite scrolling, dynamically loading more content as the user scrolls down the page.

```js
import React, { useState, useEffect } from "react";

const InfiniteScrollComponent = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchItems = async () => {
    const response = await fetch(`https://api.example.com/items?page=${page}`);
    const newItems = await response.json();
    setItems((prev) => [...prev, ...newItems]);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [page]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight
      ) {
        setPage((prev) => prev + 1);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div>
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
      {loading && <p>Loading...</p>}
    </div>
  );
};

export default InfiniteScrollComponent;
```

## Advanced

### Q19. Write a component that uses the React. memo for optimization.

Answer: In this code, we can see how to use React.memo to prevent unnecessary re-renders of a child component. This is particularly useful when the parent component re-renders frequently, allowing the child component to remain unchanged if its props have not changed.

```js
import React from "react";

const ChildComponent = React.memo(({ name }) => {
  console.log("ChildComponent rendered");
  return <h3>{name}</h3>;
});

const ParentComponent = () => {
  const [count, setCount] = React.useState(0);
  const name = "John Doe";

  return (
    <div>
      <h2>Count: {count}</h2>
      <ChildComponent name={name} />
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
};

export default ParentComponent;
```

### Q20. Create a component that demonstrates the use of refs.

Answer: This code illustrates how to use the useRef hook to create a reference to a DOM element, allowing us to programmatically focus an input field when a button is clicked.

```js
import React, { useRef } from "react";

const RefExample = () => {
  const inputRef = useRef();

  const focusInput = () => {
    inputRef.current.focus();
  };

  return (
    <div>
      <input ref={inputRef} type="text" placeholder="Focus me!" />
      <button onClick={focusInput}>Focus Input</button>
    </div>
  );
};

export default RefExample;
```

### Q21. How do you implement a custom context provider?

Answer: In this code, we will create a custom context provider using React’s Context API. This provider allows us to manage and share state across multiple components without prop drilling.

```js
import React, { createContext, useContext, useState } from "react";

const MyContext = createContext();

const MyProvider = ({ children }) => {
  const [state, setState] = useState("Default Value");

  return (
    <MyContext.Provider value={{ state, setState }}>
      {children}
    </MyContext.Provider>
  );
};

const MyComponent = () => {
  const { state, setState } = useContext(MyContext);
  return (
    <div>
      <h2>{state}</h2>
      <button onClick={() => setState("New Value")}>Change Value</button>
    </div>
  );
};

const App = () => {
  return (
    <MyProvider>
      <MyComponent />
    </MyProvider>
  );
};

export default App;
```

### Q22. Create a component that shows how to use portals.

Answer: This code demonstrates how to create a modal using React portals. Portals provide a way to render children into a DOM node that exists outside the hierarchy of the parent component.

```js
import React from "react";
import ReactDOM from "react-dom";

const Modal = ({ children }) => {
  return ReactDOM.createPortal(
    <div style={{ background: "rgba(0,0,0,0.7)", padding: "20px" }}>
      <h2>Modal</h2>
      {children}
    </div>,
    document.getElementById("modal-root")
  );
};

const App = () => {
  return (
    <div>
      <h1>Main App</h1>
      <Modal>
        <p>This is a modal!</p>
      </Modal>
    </div>
  );
};

export default App;
```

## Q23. How can you use the useLayoutEffect hook?

Answer: Here, we will illustrate the use of the useLayoutEffect hook to measure the window size immediately after the DOM is updated, allowing us to perform side effects based on the layout of the components.

```js
import React, { useLayoutEffect, useState } from "react";

const LayoutEffectExample = () => {
  const [size, setSize] = useState(window.innerWidth);

  useLayoutEffect(() => {
    const handleResize = () => {
      setSize(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <h2>Window Size: {size}</h2>;
};

export default LayoutEffectExample;
```

### Q24. Write a react component that utilizes error boundaries.

Answer: In this code, an error boundary that logs props before rendering the wrapped component is created. Error boundaries are essential for catching JavaScript errors in components and displaying a fallback UI.

```js
import React from "react";

const withLogging = (WrappedComponent) => {
  return (props) => {
    console.log("Props:", props);
    return <WrappedComponent {...props} />;
  };
};

export default withLogging;
```

### Q25. How do you implement a dynamic import in a React component?

Answer: This code demonstrates how to implement dynamic imports using React.lazy and Suspense, allowing us to load components lazily, and improving the initial load time of our application.

```js
import React, { Suspense, useState } from "react";

const LazyComponent = React.lazy(() => import("./LazyComponent"));

const App = () => {
  const [show, setShow] = useState(false);

  return (
    <div>
      <button onClick={() => setShow(!show)}>Toggle Lazy Component</button>
      <Suspense fallback={<div>Loading...</div>}>
        {show && <LazyComponent />}
      </Suspense>
    </div>
  );
};

export default App;
```

### Q28. Create a component that demonstrates how to handle fetch requests with error handling.

Answer: In this example, we handle fetch requests and implement error handling using the useEffect hook. This approach ensures that any network issues are gracefully handled, providing feedback to the user.

```js
import React, { useState, useEffect } from "react";

const FetchExample = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("https://api.example.com/data");
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const result = await response.json();
        setData(result);
      } catch (error) {
        setError(error.message);
      }
    };

    fetchData();
  }, []);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return <div>{data ? JSON.stringify(data) : "Loading..."}</div>;
};

export default FetchExample;
```
