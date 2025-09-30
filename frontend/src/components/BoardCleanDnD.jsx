// src/components/BoardCleanDnD.jsx
import React, { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

// Spaltenname aus Task bestimmen
const stationKey = (t) => t?.arbeitsstation ?? "Unassigned";

// einfache Sortierung pro Spalte: prioritaet, dann id
const sortTasks = (arr) =>
  [...arr].sort((a, b) => {
    const pa = Number.isFinite(a?.prioritaet) ? a.prioritaet : 999999;
    const pb = Number.isFinite(b?.prioritaet) ? b.prioritaet : 999999;
    if (pa !== pb) return pa - pb;
    return (a?.id ?? 0) - (b?.id ?? 0);
  });

// Persistenz-Helper für PUT /api/tasks/{id}
async function updateTaskServer(id, body) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PUT", // TaskController erlaubt PUT/PATCH auf /{id}
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  try {
    return await res.json(); // falls Backend JSON zurückgibt
  } catch {
    return body; // Fallback: notfalls gesendeten Body zurückgeben
  }
}

export default function BoardCleanDnD() {
  const [columns, setColumns] = useState({}); // { [stationName]: Task[] }
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Daten laden und in Spalten gruppieren
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/tasks", {
          headers: { Accept: "application/json" },
        });
        const text = await res.text();

        let arr = [];
        try {
          const json = JSON.parse(text);
          arr = Array.isArray(json)
            ? json
            : Array.isArray(json?.content)
            ? json.content
            : Array.isArray(json?.items)
            ? json.items
            : [];
        } catch {
          throw new Error("Antwort ist kein JSON (Proxy/Backend prüfen).");
        }

        const grouped = arr.reduce((acc, t) => {
          const key = String(stationKey(t));
          (acc[key] ||= []).push(t);
          return acc;
        }, {});
        for (const k of Object.keys(grouped)) grouped[k] = sortTasks(grouped[k]);

        if (alive) {
          setColumns(Object.keys(grouped).length ? grouped : { Unassigned: [] });
        }
      } catch (e) {
        if (alive) setErr(String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Drag & Drop mit Optimistic Update + Rollback bei Fehler
  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    // Snapshot für Rollback
    const prev =
      typeof structuredClone === "function"
        ? structuredClone(columns)
        : JSON.parse(JSON.stringify(columns));

    const fromKey = source.droppableId;
    const toKey = destination.droppableId;

    // Optimistic: lokalen Zustand sofort anpassen
    let updatedTask = null;
    setColumns((prevCols) => {
      const next = { ...prevCols };
      const fromList = [...(next[fromKey] || [])];
      const toList = fromKey === toKey ? fromList : [...(next[toKey] || [])];

      const [moved] = fromList.splice(source.index, 1);
      if (!moved) return prevCols;

      // Arbeitsstation nur ändern, wenn Spalte gewechselt wurde
      updatedTask =
        fromKey === toKey ? moved : { ...moved, arbeitsstation: toKey };

      toList.splice(destination.index, 0, updatedTask);
      next[fromKey] = fromList;
      next[toKey] = sortTasks(toList);
      return next;
    });

    // Persistieren NUR bei Spaltenwechsel
    if (fromKey !== toKey && updatedTask) {
      try {
        await updateTaskServer(updatedTask.id, updatedTask);
        // success: nichts weiter nötig
      } catch (e) {
        console.error("Persistenz fehlgeschlagen:", e);
        alert("Speichern fehlgeschlagen – Änderung wird zurückgenommen.");
        setColumns(prev); // Rollback
      }
    }
  };

  if (loading)
    return <p style={{ padding: 16 }}>lade…</p>;
  if (err)
    return (
      <pre style={{ whiteSpace: "pre-wrap", color: "red", padding: 16 }}>
        Fehler: {err}
      </pre>
    );

  const stationNames = Object.keys(columns).sort((a, b) =>
    a.localeCompare(b)
  );

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Board (Drag & Drop mit Persistenz)</h1>
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: "flex", gap: 16, overflowX: "auto" }}>
          {stationNames.map((station) => (
            <Droppable droppableId={station} key={station}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    minWidth: 260,
                    background: "#f3f4f6",
                    padding: 12,
                    borderRadius: 8,
                  }}
                >
                  <h2 style={{ margin: "0 0 8px 0" }}>{station}</h2>

                  {(columns[station] || []).map((t, index) => (
                    <Draggable
                      draggableId={t.id.toString()}
                      index={index}
                      key={t.id}
                    >
                      {(dProvided, snapshot) => (
                        <div
                          ref={dProvided.innerRef}
                          {...dProvided.draggableProps}
                          {...dProvided.dragHandleProps}
                          style={{
                            background: "white",
                            borderRadius: 8,
                            padding: 8,
                            marginBottom: 8,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                            opacity: snapshot.isDragging ? 0.7 : 1,
                            ...dProvided.draggableProps.style,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 8,
                            }}
                          >
                            <strong style={{ fontSize: 13 }}>
                              {t.bezeichnung ?? "(ohne Bezeichnung)"}
                            </strong>
                            <span style={{ fontSize: 10, color: "#6b7280" }}>
                              #{t.id}
                            </span>
                          </div>
                          {t["zusätzlicheInfos"] && (
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 12,
                                color: "#4b5563",
                              }}
                            >
                              {t["zusätzlicheInfos"]}
                            </div>
                          )}
                          <div
                            style={{
                              marginTop: 6,
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 11,
                              color: "#6b7280",
                            }}
                          >
                            <span>{t.status ?? "—"}</span>
                            {t.endDatum && <span>{t.endDatum}</span>}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}

                  {provided.placeholder}
                  {(columns[station] || []).length === 0 && (
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      keine Tasks
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
