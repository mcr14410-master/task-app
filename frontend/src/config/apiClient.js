// frontend/src/config/apiClient.js
import { apiUrl } from './apiBase';
const baseHeaders = { 'Content-Type': 'application/json' };

async function toJson(r) {
  if (r.status === 204) return null;
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}
async function ensureOk(r) {
  if (!r.ok) {
    let msg = `API ${r.status} ${r.statusText}`;
    try {
      const text = await r.text();
      if (text) {
        try { msg = JSON.parse(text).message || text; } catch { msg = text; }
      }
    } catch {}
    throw new Error(msg);
  }
  return r;
}

export async function apiGet(p,init={}){ const r=await fetch(apiUrl(p),{method:'GET',headers:{...baseHeaders,...(init.headers||{})},...init}); await ensureOk(r); return toJson(r); }

export async function apiPost(p,d,init={}){ const r=await fetch(apiUrl(p),{method:'POST',headers:{...baseHeaders,...(init.headers||{})},body:d!=null?JSON.stringify(d):null,...init}); await ensureOk(r); return toJson(r); }

export async function apiPut(p,d,init={}){ const r=await fetch(apiUrl(p),{method:'PUT',headers:{...baseHeaders,...(init.headers||{})},body:d!=null?JSON.stringify(d):null,...init}); await ensureOk(r); return toJson(r); }

export async function apiPatch(p, d, init = {}) {
  const r = await fetch(apiUrl(p), {
    method: 'PATCH',
    headers: { ...baseHeaders, ...(init.headers || {}) },
    body: d != null ? JSON.stringify(d) : null,
    ...init,
  });
  await ensureOk(r);
  return toJson(r); // gibt bei 204 => null zurück
}


export async function apiDelete(p,init={}){ const r=await fetch(apiUrl(p),{method:'DELETE',headers:{...baseHeaders,...(init.headers||{})},...init}); await ensureOk(r); return toJson(r); }
