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

      // 1) Array aus vielen möglichen Formen robust extrahieren
      let arr = [];
      if (Array.isArray(data)) arr = data;
      else if (Array.isArray(data?.content)) arr = data.content;
      else if (Array.isArray(data?.items)) arr = data.items;
      else if (Array.isArray(data?.tasks)) arr = data.tasks;
      else if (Array.isArray(data?._embedded?.tasks)) arr = data._embedded.tasks;
      else if (data && typeof data === "object") {
        // Notfalls alles Values nehmen (z.B. wenn es ein Objekt-Map ist)
        const vals = Object.values(data);
        if (vals.every(v => typeof v === "object")) arr = vals;
      }

      setTasks(Array.isArray(arr) ? arr : []);
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
