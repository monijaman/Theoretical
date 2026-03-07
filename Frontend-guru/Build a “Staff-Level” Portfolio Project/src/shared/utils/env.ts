export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
export const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:4000";
export const appEnv = (import.meta.env.VITE_APP_ENV || "development") as "development" | "production";
export const isDev = appEnv === "development";
