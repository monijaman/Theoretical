// context/TodoContext.ts
import { createContext, useContext } from 'react';
import { Todo } from '../models/Todo';

export interface TodoContextType {
    todos: Todo[];
    addTodo: (text: string) => void;
    removeTodo: (id: number) => void;
    toggleTodo: (id: number) => void;
}

export const TodoContext = createContext<TodoContextType | undefined>(undefined);

export const useTodoContext = (): TodoContextType => {
    const context = useContext(TodoContext);
    if (!context) {
        throw new Error('useTodoContext must be used within a TodoProvider');
    }
    return context;
};
