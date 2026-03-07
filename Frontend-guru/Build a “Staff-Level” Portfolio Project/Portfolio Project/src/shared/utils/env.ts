// Environment configuration utilities
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
export const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
export const appEnv = (import.meta.env.VITE_APP_ENV || 'development') as 'development' | 'production' | 'staging';
export const enableOfflineSync = import.meta.env.VITE_ENABLE_OFFLINE_SYNC === 'true';
export const enableAnalytics = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';

export const isDev = appEnv === 'development';
export const isProd = appEnv === 'production';
