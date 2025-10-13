// frontend/src/api/fsApi.js
import { apiGet, apiPost, apiDelete } from "@/config/apiClient";

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
