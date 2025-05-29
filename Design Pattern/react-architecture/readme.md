# Babel in Custom React Implementation

## to run : npm install express > node server.js

## Why Babel?

Babel plays a crucial role in this project for the following reasons:

### 1. JSX Transformation

Babel transforms JSX (XML-like syntax in JavaScript) into plain JavaScript that browsers can understand. Without this transformation, browsers would not be able to interpret JSX syntax.

### 2. Custom JSX Pragma

This project uses a custom pragma: `/** @jsx Didact.createElement */`

- This directive tells Babel to use our custom `Didact.createElement` function instead of React's default `React.createElement`
- This enables us to implement our own React-like library

### Example Transformation

JSX Code:

```javascript
<div>
  <h1>Didact Stories</h1>
</div>
```

# Design Patterns in Custom React Implementation

This custom React-like implementation uses several design patterns to achieve its functionality. Below is a breakdown of the patterns and their usage:

## 1. **Composite Pattern**

- **Where Used**: Component structure.
- **Description**: The `App` and `Story` components are composed of smaller components and elements. This pattern allows for a tree-like structure where components can contain other components or elements.
- **Example**:
  ```javascript
  class App extends Didact.Component {
    render() {
      return (
        <div>
          <h1>Didact Stories</h1>
          <ul>
            {this.props.stories.map((story) => {
              return <Story name={story.name} url={story.url} />;
            })}
          </ul>
        </div>
      );
    }
  }
  ```

## 2. **Factory Pattern**

- **Where Used**: Element creation (JSX to object).
- **Description**: The `Didact.createElement` function acts as a factory to create element objects from JSX syntax.
- **Example**:
  ```javascript
  function createElement(type, config, ...args) {
    const props = Object.assign({}, config);
    props.children = args.map((c) =>
      c instanceof Object ? c : createTextElement(c)
    );
    return { type, props };
  }
  ```

## 3. **Observer Pattern**

- **Where Used**: State management and DOM updates.
- **Description**: The `setState` method triggers updates to the component's state and schedules a reconciliation process to update the DOM efficiently.
- **Example**:
  ```javascript
  setState(partialState) {
      scheduleUpdate(this, partialState);
  }
  ```

## 4. **Scheduler Pattern**

- **Where Used**: Re-render control and batching updates.
- **Description**: The `workLoop` and `performWork` functions implement a basic scheduling mechanism using `requestIdleCallback` to prioritize and batch rendering tasks.
- **Example**:
  ```javascript
  function performWork(deadline) {
    workLoop(deadline);
    if (nextUnitOfWork || updateQueue.length > 0) {
      requestIdleCallback(performWork);
    }
  }
  ```

## 5. **Strategy Pattern**

- **Where Used**: Hooks or shared logic.
- **Description**: The architecture allows for reusable logic through components and potential hooks (if extended). Each component can define its own strategy for rendering and state updates.
- **Example**:
  ```javascript
  class Story extends Didact.Component {
    constructor(props) {
      super(props);
      this.state = { likes: Math.ceil(Math.random() * 100) };
    }
    like() {
      this.setState({ likes: this.state.likes + 1 });
    }
    render() {
      return (
        <li>
          <button onClick={() => this.like()}>{this.state.likes} ❤️</button>
          <a href={this.props.url}>{this.props.name}</a>
        </li>
      );
    }
  }
  ```

## Summary Table

| Concept               | Pattern Used      |
| --------------------- | ----------------- |
| Component structure   | Composite Pattern |
| Element creation      | Factory Pattern   |
| Efficient DOM updates | Observer Pattern  |
| Re-render control     | Scheduler Pattern |
| Hooks or shared logic | Strategy Pattern  |
