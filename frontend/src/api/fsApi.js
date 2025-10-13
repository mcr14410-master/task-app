// frontend/src/api/fsApi.js
import { apiGet, apiPost, apiDelete } from "@/config/apiClient";

// Liefert IMMER ein Array von Ordnernamen (normalisiert)
export async function fsSubfolders(sub = "") {
  const qs = new URLSearchParams();
  if (sub) qs.set("sub", sub);
  const res = await apiGet(`/fs/subfolders?${qs.toString()}`);
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.folders)) return res.folders;
  return [];
}

export async function fsExists(sub = "") {
  const qs = new URLSearchParams();
  if (sub) qs.set("sub", sub);
  const res = await apiGet(`/fs/exists?${qs.toString()}`);
  return !!res?.exists;
}

export async function fsMkdir(sub = "", name) {
  const qs = new URLSearchParams();
  if (sub) qs.set("sub", sub);
  qs.set("name", name);
  return apiPost(`/fs/mkdir?${qs.toString()}`);
}

export async function fsRename(sub = "", from, to) {
  const qs = new URLSearchParams();
  if (sub) qs.set("sub", sub);
  qs.set("from", from);
  qs.set("to", to);
  return apiPost(`/fs/rename?${qs.toString()}`);
}

// ACHTUNG: Dein Controller heißt /empty (nicht /is-empty)
export async function fsIsEmpty(sub = "", name) {
  const qs = new URLSearchParams();
  if (sub) qs.set("sub", sub);
  qs.set("name", name);
  const res = await apiGet(`/fs/empty?${qs.toString()}`);
  return { empty: !!res?.empty };
}

// Dein Controller nutzt DELETE /rmdir
export async function fsRmdir(sub = "", name) {
  const qs = new URLSearchParams();
  if (sub) qs.set("sub", sub);
  qs.set("name", name);
  return apiDelete(`/fs/rmdir?${qs.toString()}`);
}
