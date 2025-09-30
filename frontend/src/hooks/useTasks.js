import { useState, useEffect } from "react";
import { taskService } from "@/services/api";

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---- Laden aller Tasks ----
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await taskService.getAll();
      setTasks(data);
    } catch (err) {
      console.error("Fehler beim Laden der Aufgaben:", err);
    } finally {
      setLoading(false);
    }
  };

  // ---- Neue Task anlegen ----
  const createTask = async (task) => {
    try {
      const newTask = await taskService.create(task);
      setTasks((prev) => [...prev, newTask]);
    } catch (err) {
      console.error("Fehler beim Erstellen:", err);
    }
  };

  // ---- Task aktualisieren ----
  const updateTask = async (id, updatedTask) => {
    try {
      const saved = await taskService.update(id, updatedTask);
      setTasks((prev) => prev.map((t) => (t.id === id ? saved : t)));
    } catch (err) {
      console.error("Fehler beim Aktualisieren:", err);
    }
  };

  // ---- Task löschen ----
  const deleteTask = async (id) => {
    try {
      await taskService.remove(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Fehler beim Löschen:", err);
    }
  };

  // ---- Initial laden ----
  useEffect(() => {
    fetchTasks();
  }, []);

  return { tasks, loading, createTask, updateTask, deleteTask, fetchTasks };
}
