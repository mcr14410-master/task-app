// src/components/BoardCleanDnD.jsx
import React, { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useToast } from "./ui/Toasts";
import TaskCreationModal from "./modals/TaskCreationModal";
import TaskEditModal from "./modals/TaskEditModal";

function normalizeStationLabel(v) {
  const s = String(v ?? "Unassigned");
  return s
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

const sortTasksInitial = (arr) =>
  [...arr].sort((a, b) => {
    const pa = Number.isFinite(a?.prioritaet) ? a.prioritaet : 999999;
    const pb = Number.isFinite(b?.prioritaet) ? b.prioritaet : 999999;
    if (pa !== pb) return pa - pb;
    return (a?.id ?? 0) - (b?.id ?? 0);
  });

async function updateTaskServer(id, body) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
  try { return await res.json(); } catch { return body; }
}

async function bulkSortServer(payload) {
  const res = await fetch(`/api/tasks/sort`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
}

function buildSortPayload(state, keys) {
  const payload = [];
  for (const k of keys) (state[k] || []).forEach((t, idx) => payload.push({ ...t, prioritaet: idx }));
  return payload;
}

function pickStationLabel(rec) {
  if (rec == null) return null;
  if (typeof rec === "string") return rec;
  return (
    rec.bezeichnung ??
    rec.name ??
    rec.titel ??
    rec.title ??
    rec.arbeitsstation ??
    rec.station ??
    rec.kurzname ??
    null
  );
}

export default function BoardCleanDnD() {
  const [columns, setColumns] = useState({});       // { [normKey]: Task[] }
  const [labelByKey, setLabelByKey] = useState({}); // { [normKey]: Original-Label }
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);

  const toast = useToast();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [tasksRes, stationsRes] = await Promise.allSettled([
          fetch("/api/tasks", { headers: { Accept: "application/json" } }),
          fetch("/api/arbeitsstationen", { headers: { Accept: "application/json" } }),
        ]);

        let tasks = [];
        if (tasksRes.status === "fulfilled") {
          const txt = await tasksRes.value.text();
          const j = JSON.parse(txt);
          tasks = Array.isArray(j) ? j : Array.isArray(j?.content) ? j.content : Array.isArray(j?.items) ? j.items : [];
        } else {
          throw new Error(`Fehler bei /api/tasks: ${String(tasksRes.reason)}`);
        }

        let stations = [];
        if (stationsRes.status === "fulfilled" && stationsRes.value.ok) {
          try {
            const stTxt = await stationsRes.value.text();
            const stJ = JSON.parse(stTxt);
            const arr = Array.isArray(stJ) ? stJ : Array.isArray(stJ?.content) ? stJ.content : Array.isArray(stJ?.items) ? stJ.items : [];
            stations = arr.map(pickStationLabel).filter(Boolean).map(String);
          } catch { /* ignorieren */ }
        }

        const labels = {};
        for (const raw of stations) {
          const key = normalizeStationLabel(raw);
          if (!labels[key]) labels[key] = String(raw).trim();
        }
        for (const t of tasks) {
          const raw = t?.arbeitsstation ?? "Unassigned";
          const key = normalizeStationLabel(raw);
          if (!labels[key]) labels[key] = String(raw).trim();
        }
        if (!labels["Unassigned"]) labels["Unassigned"] = "Unassigned";

        const grouped = {};
        for (const t of tasks) {
          const raw = t?.arbeitsstation ?? "Unassigned";
          const key = normalizeStationLabel(raw);
          (grouped[key] ||= []).push(t);
        }
        for (const k of Object.keys(grouped)) grouped[k] = sortTasksInitial(grouped[k]);
        for (const key of Object.keys(labels)) if (!grouped[key]) grouped[key] = [];

        if (alive) {
          setLabelByKey(labels);
          setColumns(grouped);
        }
      } catch (e) {
        if (alive) setErr(String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const prev =
      typeof structuredClone === "function"
        ? structuredClone({ columns, labelByKey })
        : { columns: JSON.parse(JSON.stringify(columns)), labelByKey: { ...labelByKey } };

    const fromKey = source.droppableId;
    const toKey   = destination.droppableId;
    const toLabel = labelByKey[toKey] ?? toKey;

    let updatedTask = null;
    let next = null;

    setColumns((prevCols) => {
      const draft = { ...prevCols };
      const fromList = [...(draft[fromKey] || [])];
      const toList   = fromKey === toKey ? fromList : [...(draft[toKey] || [])];

      const [moved] = fromList.splice(source.index, 1);
      if (!moved) return prevCols;

      updatedTask = fromKey === toKey ? moved : { ...moved, arbeitsstation: toLabel };
      toList.splice(destination.index, 0, updatedTask);

      draft[fromKey] = fromList;
      draft[toKey]   = toList;
      next = draft;
      return draft;
    });

    try {
      if (fromKey !== toKey && updatedTask) {
        await updateTaskServer(updatedTask.id, updatedTask);
        const payload = buildSortPayload(next, [fromKey, toKey]);
        await bulkSortServer(payload);
      } else {
        const payload = buildSortPayload(next, [toKey]);
        await bulkSortServer(payload);
      }
    } catch (e) {
      toast.error("Speichern fehlgeschlagen. Änderung zurückgenommen.");
      console.error(e);
      setColumns(prev.columns);
      setLabelByKey(prev.labelByKey);
    }
  };

  // ---- Modal-Callbacks ----

  const handleCreated = (saved) => {
    const raw = saved?.arbeitsstation ?? "Unassigned";
    const key = normalizeStationLabel(raw);

    setLabelByKey((prev) => ({ ...prev, [key]: String(raw).trim() }));
    // State + (optional) Sort persistieren
    const prevCols =
      typeof structuredClone === "function" ? structuredClone(columns) : JSON.parse(JSON.stringify(columns));

    setColumns((prev) => {
      const next = { ...prev, [key]: (prev[key] || []).concat(saved) };
      // Reihung speichern
      const draft = { ...prevCols, [key]: (prevCols[key] || []).concat(saved) };
      bulkSortServer(buildSortPayload(draft, [key])).catch(() => {});
      return next;
    });

    // Modal toasts bereits Erfolg → hier kein zweiter Toast
  };

  const handleSaved = (saved) => {
    const oldKey = normalizeStationLabel(editTask?.arbeitsstation ?? "Unassigned");
    const newRaw = saved?.arbeitsstation ?? "Unassigned";
    const newKey = normalizeStationLabel(newRaw);

    setLabelByKey((prev) => ({ ...prev, [newKey]: String(newRaw).trim() }));

    const prevCols =
      typeof structuredClone === "function" ? structuredClone(columns) : JSON.parse(JSON.stringify(columns));

    setColumns((prev) => {
      const draft = { ...prev };
      draft[oldKey] = (draft[oldKey] || []).filter((t) => t.id !== saved.id);
      draft[newKey] = (draft[newKey] || []).concat(saved);

      // Reihung speichern
      const after = { ...prevCols };
      after[oldKey] = (after[oldKey] || []).filter((t) => t.id !== saved.id);
      after[newKey] = (after[newKey] || []).concat(saved);
      const keys = oldKey === newKey ? [newKey] : [oldKey, newKey];
      bulkSortServer(buildSortPayload(after, keys)).catch(() => {});
      return draft;
    });

    // Modal macht Erfolg-Toast
  };

  const handleDeleted = (deletedTask) => {
    const key = normalizeStationLabel(deletedTask?.arbeitsstation ?? "Unassigned");

    const prevCols =
      typeof structuredClone === "function" ? structuredClone(columns) : JSON.parse(JSON.stringify(columns));

    setColumns((prev) => {
      const draft = { ...prev };
      draft[key] = (draft[key] || []).filter((t) => t.id !== deletedTask.id);
      return draft;
    });

    // Reihenfolge der betroffenen Spalte persistieren
    const nextState = { ...prevCols, [key]: (prevCols[key] || []).filter((t) => t.id !== deletedTask.id) };
    bulkSortServer(buildSortPayload(nextState, [key])).catch(() => {});

    toast.success("Aufgabe gelöscht.");
  };

  if (loading) return <p style={{ padding: 16 }}>lade…</p>;
  if (err) return <pre style={{ whiteSpace: "pre-wrap", color: "red", padding: 16 }}>Fehler: {err}</pre>;

  const stationKeys = Object.keys(labelByKey).sort((a, b) => a.localeCompare(b));

  return (
    <div style={{ padding: 16 }}>
      {/* Action-Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>Board</h1>
        <button onClick={() => setIsCreateOpen(true)} style={styles.btnPrimary}>
          + Neue Aufgabe
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {stationKeys.map((key) => {
            const title = labelByKey[key];
            const list = columns[key] || [];
            return (
              <Droppable droppableId={key} key={key}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      width: "100%",
                      background: "#f3f4f6",
                      padding: 12,
                      borderRadius: 8,
                      minHeight: 60,
                    }}
                  >
                    <h2 style={{ margin: "0 0 8px 0" }}>{title}</h2>
                    {list.map((t, index) => (
                      <Draggable draggableId={t.id.toString()} index={index} key={t.id}>
                        {(dProvided, snapshot) => (
                          <div
                            ref={dProvided.innerRef}
                            {...dProvided.draggableProps}
                            {...dProvided.dragHandleProps}
                            onClick={() => setEditTask(t)}
                            style={{
                              background: "white",
                              borderRadius: 8,
                              padding: 8,
                              marginBottom: 8,
                              boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                              opacity: snapshot.isDragging ? 0.7 : 1,
                              cursor: "pointer",
                              ...dProvided.draggableProps.style,
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                              <strong style={{ fontSize: 13 }}>{t.bezeichnung ?? "(ohne Bezeichnung)"}</strong>
                              <span style={{ fontSize: 10, color: "#6b7280" }}>#{t.id}</span>
                            </div>

                            {t["zusätzlicheInfos"] && (
                              <div style={{ marginTop: 4, fontSize: 12, color: "#4b5563" }}>
                                {t["zusätzlicheInfos"]}
                              </div>
                            )}

                            <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6b7280" }}>
                              <span>{t.status ?? "—"}</span>
                              {t.endDatum && <span>{t.endDatum}</span>}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {list.length === 0 && (
                      <div style={{ fontSize: 12, color: "#6b7280" }}>keine Tasks</div>
                    )}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      {/* Modals */}
      <TaskCreationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        stations={stationKeys.map((k) => labelByKey[k])}
        onCreated={handleCreated}
      />

      <TaskEditModal
        isOpen={!!editTask}
        onClose={() => setEditTask(null)}
        task={editTask}
        stations={stationKeys.map((k) => labelByKey[k])}
        onSaved={handleSaved}
        onDeleted={handleDeleted}   // <- neu: Delete-Callback
      />
    </div>
  );
}

const styles = {
  btnPrimary: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
  },
};
