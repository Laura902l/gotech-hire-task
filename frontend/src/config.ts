// import.meta.env typing may not be available in this environment; use any to avoid TS error
export const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:3000';
