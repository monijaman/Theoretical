/**
 *  To separate data access logic from the rest of the application, we can create a service:
 */

import { Todo } from "../models/Todo";
import { getFromLocalStorage, saveToLocalStorage } from "../utils/storage";

const STORAGE_KEY = "todos";

export const fetchTodos = (): Todo[] => {
  return getFromLocalStorage<Todo[]>(STORAGE_KEY, []);
};

export const saveTodos = (todos: Todo[]): void => {
  saveToLocalStorage(STORAGE_KEY, todos);
};
