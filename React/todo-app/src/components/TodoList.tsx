import React from 'react';
import { useTodos } from '../hooks/useTodos';
import TodoItem from './TodoItem';

const TodoList: React.FC = () => {
    const { todos } = useTodos();

    return (
        <div className="todo-list">
            {todos.map((todo) => (
                <TodoItem key={todo.id} todo={todo} />
            ))}
        </div>
    );
};

export default TodoList;
