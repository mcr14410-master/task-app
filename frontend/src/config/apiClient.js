// frontend/src/config/apiClient.js

// Immer relative API-Basis benutzen.
// - Wenn die App über Vite (:5173) läuft, leitet der Vite-Proxy /api -> :8080 weiter.
// - Wenn die App vom Backend (:8080) ausgeliefert wird, zeigt /api auf dasselbe Backend.
// - In Produktion zeigt /api auf den Reverse-Proxy/Backend.
const API_BASE = '/api';

function normalizePath(path) {
  if (!path) return '';
  let p = String(path).trim();
  // Absolute URLs unverändert lassen
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  // Tolerant: führendes /api entfernen, falls der Aufrufer es noch drin hat
  if (p.startsWith('/api/')) p = p.slice(4);
  if (!p.startsWith('/')) p = '/' + p;
  return p;
}

async function handle(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error('HTTP ' + res.status + ' ' + res.statusText + ' @ ' + res.url + ' :: ' + text);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.indexOf('application/json') !== -1) return res.json();
  return res.text();
}

export async function apiGet(path, init = {}) {
  const url = API_BASE + normalizePath(path);
  const res = await fetch(url, { method: 'GET', cache: 'no-store', headers: { 'Accept': 'application/json' }, ...init });
  return handle(res);
}

export async function apiPost(path, body, init = {}) {
  const url = API_BASE + normalizePath(path);
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(body || {}), ...init });
  return handle(res);
}

export async function apiPut(path, body, init = {}) {
  const url = API_BASE + normalizePath(path);
  const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(body || {}), ...init });
  return handle(res);
}

export async function apiPatch(path, body, init = {}) {
  const url = API_BASE + normalizePath(path);
  const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(body || {}), ...init });
  return handle(res);
}

export async function apiDelete(path, init = {}) {
  const url = API_BASE + normalizePath(path);
  const res = await fetch(url, { method: 'DELETE', headers: { 'Accept': 'application/json' }, ...init });
  return handle(res);
}

export function getApiBase() { return API_BASE; }
