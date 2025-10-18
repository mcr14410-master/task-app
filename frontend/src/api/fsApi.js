// frontend/src/api/fsApi.js
import { apiGet, apiPost, apiDelete } from "@/config/apiClient";
import axios from "axios";


// Basis-URL:
// - DEV mit Vite:     /api   (Proxy → :8080)
// - Backend-only:     /api   (gleicher Origin :8080)
// - Produktion:       /api   (hinter Caddy/Nginx)
// Optional via .env.* übersteuerbar (z. B. VITE_API_BASE=/api)
const baseURL = import.meta?.env?.VITE_API_BASE || "/api";

// Einmalige Axios-Instanz
export const api = axios.create({
  baseURL,
  headers: {
    Accept: "application/json",
  },
  // Keine automatische Transformation erzwingen
  transformResponse: [(data) => {
    try { return JSON.parse(data); } catch { return data; }
  }],
});


// Hilfsfunktionen: **ohne** führendes /api aufrufen!
export const get  = (path, cfg)          => api.get(path, cfg);
export const del  = (path, cfg)          => api.delete(path, cfg);
export const post = (path, body, cfg)    => api.post(path, body, cfg);
export const put  = (path, body, cfg)    => api.put(path, body, cfg);
export const patch= (path, body, cfg)    => api.patch(path, body, cfg);
// Beispiel-Aufrufe (so verwenden):
// get("/tasks")
// post(`/tasks/${id}/attachments`, formData, { headers: { "Content-Type": "multipart/form-data" } })


/**
 * Liefert den absoluten Basis-Pfad als Label-String.
 * Erwartet vom Backend: { label: "<voller Pfad>" }
 */
export async function fsBaseLabel() {
  const res = await apiGet(`/fs/base-label`);
  return res?.label || "";
}

/**
 * Liefert IMMER ein Array von Ordnernamen (relativ zum aktuellen sub).
 * Backend akzeptiert optional ?sub=
 * Backend kann entweder { folders: [...] } oder direkt [ ... ] zurückgeben.
 */
export async function fsSubfolders(sub = "") {
  const qs = new URLSearchParams();
  if (sub) qs.set("sub", sub);
  const res = await apiGet(`/fs/subfolders?${qs.toString()}`);
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.folders)) return res.folders;
  return [];
}

/**
 * Existenz-Check des Ordners ?sub=...
 * Erwartet vom Backend: { exists: boolean }
 */
export async function fsExists(sub = "") {
  const qs = new URLSearchParams();
  if (sub) qs.set("sub", sub);
  const res = await apiGet(`/fs/exists?${qs.toString()}`);
  return !!res?.exists;
}

/**
 * Legt unterhalb von ?sub= einen neuen Ordner ?name= an.
 * Backend: POST /fs/mkdir -> 204 No Content
 */
export async function fsMkdir(sub = "", name) {
  const qs = new URLSearchParams();
  if (sub) qs.set("sub", sub);
  qs.set("name", name);
  return apiPost(`/fs/mkdir?${qs.toString()}`);
}

/**
 * Benennt unterhalb von ?sub= einen Ordner von ?from= nach ?to= um.
 * Backend: POST /fs/rename -> 204 No Content
 */
export async function fsRename(sub = "", from, to) {
  const qs = new URLSearchParams();
  if (sub) qs.set("sub", sub);
  qs.set("from", from);
  qs.set("to", to);
  return apiPost(`/fs/rename?${qs.toString()}`);
}

/**
 * Prüft, ob der Ordner <sub>/<name> leer ist.
 * Erwartet vom Backend: { empty: boolean }
 */
export async function fsIsEmpty(sub = "", name) {
  const qs = new URLSearchParams();
  if (sub) qs.set("sub", sub);
  qs.set("name", name);
  const res = await apiGet(`/fs/empty?${qs.toString()}`);
  return { empty: !!res?.empty };
}

/**
 * Löscht den Ordner <sub>/<name>, nur wenn leer.
 * Backend: DELETE /fs/rmdir -> 204 No Content
 */
export async function fsRmdir(sub = "", name) {
  const qs = new URLSearchParams();
  if (sub) qs.set("sub", sub);
  qs.set("name", name);
  return apiDelete(`/fs/rmdir?${qs.toString()}`);
}

// Health-Check
export async function fsHealth() {
  return await apiGet(`/fs/health`); // oder `/fs/health` falls dein apiClient '/api' voranstellt
}