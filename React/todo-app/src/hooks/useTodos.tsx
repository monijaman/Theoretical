// hooks/useTodos.ts
import { useTodoContext } from '../context/TodoContext';

export const useTodos = () => {
    return useTodoContext();
};
