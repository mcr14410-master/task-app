// src/components/TaskItem.jsx
import React from "react";

function formatDate(value) {
  if (!value) return null;
  // Reines YYYY-MM-DD -> in DE-Format umwandeln
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}.${m}.${y}`;
  }
  // ISO-String oder Date-kompatibel
  const dt = new Date(value);
  if (!isNaN(dt.getTime())) {
    return dt.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  }
  // Fallback: Rohwert anzeigen
  return String(value);
}

export default function TaskItem({ task, onDelete }) {
  const title = task?.bezeichnung ?? "(ohne Bezeichnung)";
  // Achtung: Schlüssel mit Umlaut muss in eckigen Klammern angesprochen werden
  const description =
    (task && task["zusätzlicheInfos"]) ??
    task?.zusatzlicheInfos ?? // falls mal ohne Umlaut gespeichert
    "";

  const due = task?.endDatum ? formatDate(task.endDatum) : null;
  const station = task?.arbeitsstation ?? task?.status ?? "—";
  const id = task?.id;

  const handleDelete = (e) => {
    e.stopPropagation(); // verhindert Öffnen des Edit-Modals
    if (!onDelete) return;
    const ok = window.confirm(`Aufgabe #${id} wirklich löschen?`);
    if (ok) onDelete(id);
  };

  return (
    <div className="bg-white rounded-md shadow p-2 cursor-pointer hover:shadow-lg transition">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm">{title}</h3>

        {onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            title="Löschen"
            className="text-red-600 text-xs px-2 py-1 border border-red-200 rounded hover:bg-red-50"
          >
            Löschen
          </button>
        )}
      </div>

      {description && (
        <p className="text-xs text-gray-600 mt-1">{description}</p>
      )}

      <div className="flex flex-wrap items-center justify-between mt-2 text-xs text-gray-500 gap-2">
        <span>#{id}</span>
        <span className="px-2 py-0.5 rounded bg-gray-200">{station}</span>
        {due && <span>{due}</span>}
      </div>
    </div>
  );
}
