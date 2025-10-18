// uses the existing apiClient for GET/DELETE; direct fetch for multipart POST
import { apiGet, apiDelete } from "../config/apiClient";

const API_BASE = '/api'; // immer relativ, funktioniert mit Vite-Proxy und Backend-only


export const AttachmentsApi = {
  list(taskId){
    return apiGet(`/tasks/${taskId}/attachments`);
  },
  async upload(taskId, file){
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/tasks/${taskId}/attachments`, {
      method: "POST",
      body: form
    });
    if(!res.ok){
      let msg = `HTTP ${res.status}`;
      try { const b = await res.json(); if(b?.message) msg = b.message; } catch { /* ignore parse failure */ }
      throw new Error(msg);
    }
    return res.json();
  },
  remove(taskId, attId){
    return apiDelete(`/tasks/${taskId}/attachments/${attId}`);
  }
};
