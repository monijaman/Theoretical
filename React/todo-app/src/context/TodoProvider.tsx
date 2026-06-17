// context/TodoProvider.tsx
import { ReactNode, useEffect, useState } from 'react';
import { Todo } from '../models/Todo';
import { fetchTodos, saveTodos } from '../services/todoService';
import { TodoContext } from './TodoContext';

interface TodoProviderProps {
    children: ReactNode;
}

export const TodoProvider = ({ children }: TodoProviderProps) => {
    const [todos, setTodos] = useState<Todo[]>([]);

    // Load initial todos from the service
    useEffect(() => {
        setTodos(fetchTodos());
    }, []);

    // Persist todos whenever the state changes
    useEffect(() => {
        saveTodos(todos);
    }, [todos]);

    const addTodo = (text: string) => {
        const newTodo: Todo = { id: Date.now(), text, completed: false };
        setTodos([...todos, newTodo]);
    };

    const removeTodo = (id: number) => {
        setTodos(todos.filter(todo => todo.id !== id));
    };

    const toggleTodo = (id: number) => {
        setTodos(
            todos.map(todo => (todo.id === id ? { ...todo, completed: !todo.completed } : todo))
        );
    };

    return (
        <TodoContext.Provider value={{ todos, addTodo, removeTodo, toggleTodo }}>
            {children}
        </TodoContext.Provider>
    );
};
