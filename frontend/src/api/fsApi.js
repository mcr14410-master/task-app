import { apiGet, apiPost } from "@/config/apiClient";

// Gibt IMMER ein Array zurück
export async function fsSubfolders(sub = "") {
  const qs = new URLSearchParams();
  if (sub) qs.set("sub", sub);
  const res = await apiGet(`/fs/subfolders?${qs.toString()}`);

  // Normalisieren: entweder res.folders oder []
  if (Array.isArray(res)) return res;                 // falls Backend mal direkt ein Array liefert
  if (Array.isArray(res?.folders)) return res.folders;
  return [];                                          // Fallback
}

export async function fsExists(sub = "") {
  const qs = new URLSearchParams();
  if (sub) qs.set("sub", sub);
  const res = await apiGet(`/fs/exists?${qs.toString()}`);
  return !!res?.exists;                               // bool
}

export const fsMkdir = (sub = "", name) => {
  const params = new URLSearchParams();
  if (sub) params.set("sub", sub);
  params.set("name", name);
  return apiPost(`/fs/mkdir?${params.toString()}`);
};