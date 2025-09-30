import { useState, useEffect } from "react";
import { taskService } from "@/services/api"; // falls Alias @ nicht existiert, siehe Hinweis unten
import toast from "react-hot-toast";

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---- Laden aller Tasks ----
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await taskService.getAll();
      // Robust normalisieren: akzeptiert Array, {content:[]}, {items:[]}, sonst []
      const normalized = Array.isArray(data)
        ? data
        : Array.isArray(data?.content)
        ? data.content
        : Array.isArray(data?.items)
        ? data.items
        : [];
      setTasks(normalized);
    } catch (err) {
      console.error("Fehler beim Laden der Aufgaben:", err);
      setTasks([]); // Fallback verhindert reduce-Fehler
    } finally {
      setLoading(false);
    }
  };

  // ---- Neue Task anlegen ----
  const createTask = async (task) => {
    try {
      const newTask = await taskService.create(task);
      setTasks((prev) => [...prev, newTask]);
      toast.success("Aufgabe erstellt ✅");
    } catch (err) {
      console.error("Fehler beim Erstellen:", err);
      toast.error("Erstellen fehlgeschlagen ❌");
    }
  };

  // ---- Task aktualisieren ----
  const updateTask = async (id, updatedTask) => {
    try {
      const saved = await taskService.update(id, updatedTask);
      setTasks((prev) => prev.map((t) => (t.id === id ? saved : t)));
      toast.success("Aufgabe gespeichert 💾");
    } catch (err) {
      console.error("Fehler beim Aktualisieren:", err);
      toast.error("Speichern fehlgeschlagen ❌");
    }
  };

  // ---- Task löschen ----
  const deleteTask = async (id) => {
    try {
      await taskService.remove(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Aufgabe gelöscht 🗑️");
    } catch (err) {
      console.error("Fehler beim Löschen:", err);
      toast.error("Löschen fehlgeschlagen ❌");
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return { tasks, loading, createTask, updateTask, deleteTask, fetchTasks };
}
