import axios from "axios";

// Axios-Instanz mit Basis-URL
const api = axios.create({
  baseURL: "/api", // wird durch Proxy oder Nginx an dein Backend (Port 8080) weitergeleitet
});

// ---- Task-Endpunkte ----
export const taskService = {
  getAll: () => api.get("/tasks").then(res => res.data),
  create: (task) => api.post("/tasks", task).then(res => res.data),
  update: (id, task) => api.put(`/tasks/${id}`, task).then(res => res.data),
  remove: (id) => api.delete(`/tasks/${id}`),
};

// ---- Arbeitsstationen-Endpunkte ----
export const stationService = {
  getAll: () => api.get("/arbeitsstationen").then(res => res.data),
};

