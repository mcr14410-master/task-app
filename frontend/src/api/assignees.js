// frontend/src/api/assignees.js
import { apiGet, apiPost, apiPut, apiDelete } from "@/config/apiClient";

/**
 * Zuständigkeiten (Assignees) laden.
 * @param {boolean} activeOnly - true => nur aktive, false => alle (aktiv zuerst)
 */
export async function fetchAssignees(activeOnly = true) {
  const qs = activeOnly ? "?activeOnly=true" : "?activeOnly=false";
  return apiGet(`/assignees${qs}`);
}

/**
 * Assignee anlegen.
 * @param {{name: string, email?: string, active?: boolean}} payload
 */
export async function createAssignee(payload) {
  const body = {
    name: String(payload?.name ?? "").trim(),
    email: payload?.email ? String(payload.email).trim() : undefined,
    active: payload?.active ?? true,
  };
  if (!body.name) {
    throw new Error("Name ist erforderlich");
  }
  return apiPost(`/assignees`, body);
}

/**
 * Assignee aktualisieren.
 * @param {number} id
 * @param {{name?: string, email?: string, active?: boolean}} patch
 */
export async function updateAssignee(id, patch) {
  if (id == null) throw new Error("ID fehlt");
  const body = {};
  if (patch?.name != null) body.name = String(patch.name).trim();
  if (patch?.email != null) body.email = String(patch.email).trim();
  if (patch?.active != null) body.active = !!patch.active;
  return apiPut(`/assignees/${id}`, body);
}

/**
 * Assignee löschen.
 * @param {number} id
 */
export async function deleteAssignee(id) {
  if (id == null) throw new Error("ID fehlt");
  return apiDelete(`/assignees/${id}`);
}
