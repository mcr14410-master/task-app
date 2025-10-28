// frontend/src/api/additionalWorks.js
import { apiGet, apiPost, apiPut, apiDelete } from "@/config/apiClient";

const BASE = "/additional-works";

export async function fetchAdditionalWorks() {
  return apiGet(BASE);
}

export async function createAdditionalWork(payload) {
  return apiPost(BASE, payload);
}

export async function updateAdditionalWork(id, payload) {
  return apiPut(`${BASE}/${id}`, payload);
}

export async function deleteAdditionalWork(id) {
  return apiDelete(`${BASE}/${id}`);
}
