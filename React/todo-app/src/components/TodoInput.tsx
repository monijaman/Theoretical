import { useState } from 'react';
import { useTodos } from '../hooks/useTodos';

const TodoInput = () => {
    const { addTodo } = useTodos();
    const [text, setText] = useState('');

    const handleAddTodo = () => {
        if (text.trim()) {
            addTodo(text);
            setText('');
        }
    };

    return (
        <div className="todo-input">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add Todo" />
            <button onClick={handleAddTodo}>Add</button>
        </div>
    );
};

export default TodoInput;
