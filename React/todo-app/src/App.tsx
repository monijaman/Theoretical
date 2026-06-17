import React from 'react';
import TodoInput from './components/TodoInput';
import TodoList from './components/TodoList';
import { TodoProvider } from './context/TodoProvider';
import './styles.css';

const App: React.FC = () => {
  return (
    <TodoProvider>
      <div className='app'>
        <h1>Todo App</h1>
        <TodoInput />
        <TodoList />
      </div>
    </TodoProvider>
  );
};

export default App;
