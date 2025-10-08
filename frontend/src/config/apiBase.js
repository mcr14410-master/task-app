// frontend/src/config/apiBase.js
const raw = import.meta.env.VITE_API_BASE_URL || '/api';
export const API_BASE = raw.replace(/\/$/, '');
export const apiUrl = (path = '') => API_BASE + (String(path).startsWith('/') ? '' : '/') + String(path);
