// frontend/src/config/apiClient.js
import { apiUrl } from './apiBase';
const baseHeaders = { 'Content-Type': 'application/json' };
async function toJson(res){ const t=await res.text(); try{ return t?JSON.parse(t):null }catch{ return t } }
async function ensureOk(res){ if(res.ok) return res; const body=await toJson(res); const err=new Error(`API ${res.status} ${res.statusText}`); err.status=res.status; err.body=body; throw err; }
export async function apiGet(p,init={}){ const r=await fetch(apiUrl(p),{method:'GET',headers:{...baseHeaders,...(init.headers||{})},...init}); await ensureOk(r); return toJson(r); }
export async function apiPost(p,d,init={}){ const r=await fetch(apiUrl(p),{method:'POST',headers:{...baseHeaders,...(init.headers||{})},body:d!=null?JSON.stringify(d):null,...init}); await ensureOk(r); return toJson(r); }
export async function apiPut(p,d,init={}){ const r=await fetch(apiUrl(p),{method:'PUT',headers:{...baseHeaders,...(init.headers||{})},body:d!=null?JSON.stringify(d):null,...init}); await ensureOk(r); return toJson(r); }
export async function apiPatch(p,d,init={}){ const r=await fetch(apiUrl(p),{method:'PATCH',headers:{...baseHeaders,...(init.headers||{})},body:d!=null?JSON.stringify(d):null,...init}); await ensureOk(r); return toJson(r); }
export async function apiDelete(p,init={}){ const r=await fetch(apiUrl(p),{method:'DELETE',headers:{...baseHeaders,...(init.headers||{})},...init}); await ensureOk(r); return toJson(r); }
