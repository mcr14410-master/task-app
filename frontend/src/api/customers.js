// frontend/src/api/customers.js
import { apiGet, apiPost, apiPut, apiDelete } from "@/config/apiClient";

/**
 * Kunden laden.
 * @param {boolean} activeOnly - true => nur aktive, false => alle (aktiv zuerst)
 */
export async function fetchCustomers(activeOnly = true) {
  const qs = activeOnly ? "?activeOnly=true" : "?activeOnly=false";
  return apiGet(`/customers${qs}`);
}

/**
 * Kunden anlegen.
 * @param {{name: string, active?: boolean}} payload
 */
export async function createCustomer(payload) {
  const body = {
    name: String(payload?.name ?? "").trim(),
    active: payload?.active ?? true,
  };
  if (!body.name) {
    throw new Error("Name ist erforderlich");
  }
  return apiPost(`/customers`, body);
}

/**
 * Kunden aktualisieren (Name/Active).
 * @param {number} id
 * @param {{name?: string, active?: boolean}} patch
 */
export async function updateCustomer(id, patch) {
  if (id == null) throw new Error("ID fehlt");
  const body = {};
  if (patch?.name != null) body.name = String(patch.name).trim();
  if (patch?.active != null) body.active = !!patch.active;
  return apiPut(`/customers/${id}`, body);
}

/**
 * Kunden löschen.
 * @param {number} id
 */
export async function deleteCustomer(id) {
  if (id == null) throw new Error("ID fehlt");
  return apiDelete(`/customers/${id}`);
}
