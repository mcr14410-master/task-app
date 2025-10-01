// frontend/src/components/TaskBoard.jsx
import React, { useEffect, useRef, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import useToast from "./ui/useToast";
import TaskCreationModal from "./modals/TaskCreationModal";
import TaskEditModal from "./modals/TaskEditModal";
import TaskItem from "./TaskItem";

// ---------- helpers ----------
function normalizeStationLabel(v) {
  const s = String(v ?? "Unassigned");
  return s.replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}
function pickStationLabel(rec) {
  return normalizeStationLabel(
    rec?.bezeichnung ?? rec?.name ?? rec?.label ?? rec?.title ?? rec?.titel ??
    rec?.arbeitsstation ?? rec?.station ?? rec?.kurzname ??
    (typeof rec === "string" ? rec : null) ?? null
  );
}
function sortByPriorityThenId(list) {
  return [...list].sort((a, b) => {
    const pa = Number.isFinite(a?.prioritaet) ? a.prioritaet : 999999;
    const pb = Number.isFinite(b?.prioritaet) ? b.prioritaet : 999999;
    if (pa !== pb) return pa - pb;
    return (a?.id ?? 0) - (b?.id ?? 0);
  });
}
async function updateTaskServer(id, body) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
  try { return await res.json(); } catch { return body; }
}
async function deleteTaskServer(id) {
  const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
}
async function bulkSortServer(payload) {
  const res = await fetch(`/api/tasks/sort`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
}
function buildSortPayload(columns, keys) {
  const out = []; const kset = new Set(keys);
  for (const [k, list] of Object.entries(columns)) {
    if (!kset.has(k)) continue;
    (list || []).forEach((t, i) => out.push({ ...t, prioritaet: i }));
  }
  return out;
}
function matchesQuery(task, q) {
  const s = (q || "").trim().toLowerCase();
  if (!s) return true;
  const fields = [task?.bezeichnung, task?.teilenummer, task?.kunde, task?.zuständig, task?.["zusätzlicheInfos"], task?.arbeitsstation, task?.status].filter(Boolean);
  return fields.some((v) => String(v).toLowerCase().includes(s));
}

// ---------- status & due coloring ----------
function getStatusTone(statusRaw) {
  const s = String(statusRaw || "").toUpperCase();
  if (s.includes("GESPERR")) return { label: "GESPERRT", bg: "#ef4444", border: "#7f1d1d" };
  if (s.includes("DONE") || s.includes("ERLED")) return { label: "DONE", bg: "#10b981", border: "#065f46" };
  if (s.includes("PROG")) return { label: "IN PROGRESS", bg: "#22c55e", border: "#166534" };
  if (s.includes("TO_DO") || s === "TODO" || s.includes("TO-DO")) return { label: "TO_DO", bg: "#f59e0b", border: "#7a5d0a" };
  if (s.includes("NEU") || s.includes("NEW")) return { label: "NEU", bg: "#6366f1", border: "#3730a3" };
  return { label: s || "TO DO", bg: "#64748b", border: "#334155" };
}
function getDueInfo(task) {
  // Glow +10% & helleres Gelb für „morgen“
  const noColor = { state: "none", dateColor: "#94a3b8", border: "#1f2937", glow: "" };
  const v = task?.endDatum; if (!v) return noColor;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(v); d.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const rgba = (hex, a) => { const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); if(!m) return `rgba(0,0,0,${a})`; const r=parseInt(m[1],16),g=parseInt(m[2],16),b=parseInt(m[3],16); return `rgba(${r},${g},${b},${a})`; };

  if (d < today)   return { state: "overdue",  dateColor: "#ef4444", border: "#7f1d1d", glow: `0 0 0 2px ${rgba("#ef4444",.22)}, 0 0 14px ${rgba("#ef4444",.31)}` };
  if (+d === +today)    return { state: "today",    dateColor: "#f59e0b", border: "#7a5d0a", glow: `0 0 0 2px ${rgba("#f59e0b",.18)}, 0 0 12px ${rgba("#f59e0b",.24)}` };
  if (+d === +tomorrow) return { state: "tomorrow", dateColor: "#fde68a", border: "#eab308", glow: `0 0 0 2px ${rgba("#fde68a",.154)}, 0 0 10px ${rgba("#fde68a",.22)}` };
  return noColor;
}

// =======================================================
export default function TaskBoard() {
  const toast = useToast();
  const pendingRef = useRef(new Map());

  const [labelByKey, setLabelByKey] = useState({});
  const [columns, setColumns] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [query, setQuery] = useState("");
  const [stationFilter, setStationFilter] = useState("ALL");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);

  // ESC leeren — immer montiert
  useEffect(() => {
    const onKey = (ev) => { if (ev.key === "Escape") setQuery((prev) => (prev ? "" : prev)); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Daten laden
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [tasksRes, stationsRes] = await Promise.allSettled([
          fetch(`/api/tasks`),
          fetch(`/api/arbeitsstationen`),
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
          } catch { /* optional */ }
        }

        const labels = {};
        for (const raw of stations) { const k = normalizeStationLabel(raw); if (!labels[k]) labels[k] = String(raw).trim(); }
        for (const t of tasks) { const raw = t?.arbeitsstation ?? "Unassigned"; const k = normalizeStationLabel(raw); if (!labels[k]) labels[k] = String(raw).trim(); }

        const grouped = {};
        for (const t of tasks) {
          const raw = t?.arbeitsstation ?? "Unassigned";
          const key = normalizeStationLabel(raw);
          (grouped[key] ||= []).push(t);
        }
        Object.keys(grouped).forEach((k) => (grouped[k] = sortByPriorityThenId(grouped[k])));

        setLabelByKey(labels);
        setColumns(grouped);
        setErr(null);
      } catch (e) {
        console.error(e);
        setErr(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // DnD Ende — ohne 3D/Rotate/Scale-Effekt
  async function onDragEnd(result) {
    const { destination, source } = result;
    if (!destination) return;

    const fromKey = source.droppableId;
    const toKey = destination.droppableId;
    const toLabel = labelByKey[toKey] ?? toKey;

    let updatedTask = null;
    let next = null;

    setColumns((prevCols) => {
      const draft = { ...prevCols };
      const fromList = [...(draft[fromKey] || [])];
      const toList = fromKey === toKey ? fromList : [...(draft[toKey] || [])];

      const [moved] = fromList.splice(source.index, 1);
      if (!moved) return prevCols;

      updatedTask = fromKey === toKey ? moved : { ...moved, arbeitsstation: toLabel };
      toList.splice(destination.index, 0, updatedTask);

      draft[fromKey] = fromList;
      draft[toKey] = toList;
      next = draft;
      return draft;
    });

    try {
      if (fromKey !== toKey && updatedTask) {
        await updateTaskServer(updatedTask.id, updatedTask);
        await bulkSortServer(buildSortPayload(next, [fromKey, toKey]));
      } else {
        await bulkSortServer(buildSortPayload(next, [fromKey]));
      }
    } catch (err) {
      toast.error("Konnte neue Reihenfolge nicht speichern.");
      setColumns((prev) => ({ ...prev }));
      console.error(err);
    }
  }

  function handleSaved(saved) {
    const oldKey = normalizeStationLabel(saved?.__oldArbeitsstation ?? saved?.arbeitsstation ?? "Unassigned");
    const newKey = normalizeStationLabel(saved?.arbeitsstation ?? "Unassigned");
    const prevCols = typeof structuredClone === "function" ? structuredClone(columns) : JSON.parse(JSON.stringify(columns));
    setColumns((prev) => {
      const draft = { ...prev };
      draft[oldKey] = (draft[oldKey] || []).filter((t) => t.id !== saved.id);
      draft[newKey] = (draft[newKey] || []).concat(saved);

      const after = { ...prevCols };
      after[oldKey] = (after[oldKey] || []).filter((t) => t.id !== saved.id);
      after[newKey] = (after[newKey] || []).concat(saved);
      const keys = oldKey === newKey ? [newKey] : [oldKey, newKey];
      bulkSortServer(buildSortPayload(after, keys)).catch(() => {});
      return draft;
    });
    toast.success("Änderungen gespeichert.");
  }

  function handleRequestDelete(task) {
    const key = normalizeStationLabel(task?.arbeitsstation ?? "Unassigned");
    const index = (columns[key] || []).findIndex((t) => t.id === task.id);
    if (index < 0) return;

    setColumns((prev) => {
      const draft = { ...prev };
      draft[key] = (draft[key] || []).filter((t) => t.id !== task.id);
      return draft;
    });

    const UNDO_MS = 5000;
    const toastId = toast.show("info", `Aufgabe #${task.id} wird gelöscht …`, {
      title: "Gelöscht",
      actions: [{ label: "Rückgängig", onClick: () => {
        clearTimeout(timeout); toast.dismiss(toastId);
        const info = pendingRef.current.get(task.id); if (!info) return;
        setColumns((prev) => {
          const draft = { ...prev };
          const list = [...(draft[info.key] || [])];
          list.splice(info.index, 0, info.task);
          draft[info.key] = list;
          return draft;
        });
        pendingRef.current.delete(task.id);
      }}],
    });

    const timeout = setTimeout(async () => {
      toast.dismiss(toastId);
      try { await deleteTaskServer(task.id); pendingRef.current.delete(task.id); toast.success("Endgültig gelöscht."); }
      catch (e) { toast.error("Löschen fehlgeschlagen."); console.error(e); }
    }, UNDO_MS);

    pendingRef.current.set(task.id, { timeout, key, index, task });
  }

  if (loading) return <p style={{ padding: 16, color: "#cbd5e1", background: "#0b1220", minHeight: "100vh" }}>lade…</p>;
  if (err) return <div style={{ padding: 16, background: "#0b1220", minHeight: "100vh" }}>
    <pre style={{ whiteSpace: "pre-wrap", color: "#f87171", background: "transparent" }}>Fehler: {err}</pre>
  </div>;

  const allStationKeys = Object.keys(labelByKey).sort((a, b) => a.localeCompare(b));
  const visibleStationKeys = stationFilter === "ALL" ? allStationKeys : allStationKeys.filter((k) => k === stationFilter);
  const q = query.trim();
  const queryActive = q.length > 0;

  return (
    <div style={{ padding: 16, background: "var(--bg)", minHeight: "100vh" }}>
      <style>{`
        :root {
          --bg: #0b1220; --panel: #0f172a; --card: #111827; --card-2: #0b1220;
          --text: #e5e7eb; --muted: #94a3b8; --border: #1f2937; --shadow: rgba(0,0,0,0.35);
          --brand: #3b82f6; --ok: #22c55e; --warn: #f59e0b; --danger: #ef4444; --info: #38bdf8; --match-bg: rgba(59,130,246,0.12);
        }
        .toolbar-input, .toolbar-select { padding: 8px; border-radius: 8px; border: 1px solid var(--border); background: var(--card); color: var(--text); }
        .toolbar-input::placeholder { color: var(--muted); }
        .btn-primary { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: white; }

        .cols-row { display: flex; gap: 16px; align-items: flex-start; overflow-x: auto; padding-bottom: 8px; }
        .cols-row::-webkit-scrollbar { height: 8px; }
        .cols-row::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 8px; }

        .col { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 8px 24px var(--shadow); padding: 12px; minHeight: 80px; min-width: 320px; width: 360px; flex: 0 0 auto; }
        .col-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin: 0 0 8px 0; }
        .col h2 { color: var(--text); margin: 0; font-size: 16px; }
        .stats { color: var(--muted); font-size: 12px; display: flex; align-items: baseline; gap: 8px; white-space: nowrap; }
        .stats .sep { opacity: .6; }
        .badge { font-size: 12px; color: var(--muted); }

        .task-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 12px; margin-bottom: 10px; box-shadow: 0 4px 16px var(--shadow); transition: transform .12s ease, box-shadow .12s ease, background .18s ease, opacity .18s ease, filter .18s ease; }
        .task-card:hover { transform: translateY(-1px) scale(1.02); }
        .task-card:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
        .task-card.match { box-shadow: 0 0 0 2px var(--brand) inset, 0 8px 24px var(--shadow); background: linear-gradient(0deg, var(--match-bg), var(--card)); }
        .task-card.dim { opacity: .45; filter: grayscale(.5) blur(.2px); }

        .pill { padding: 4px 10px; border-radius: 999px; font-size: 11px; border: 1px solid var(--border); color: #fff; text-transform: uppercase; font-weight: 700; }

        .search-wrap { position: relative; display: inline-flex; align-items: center; }
        .search-wrap input { padding-right: 28px; }
        .search-clear { position: absolute; right: 6px; background: transparent; border: 0; color: #9ca3af; cursor: pointer; font-size: 16px; line-height: 1; border-radius: 6px; padding: 2px 4px; }
        .search-clear:hover { color: #e5e7eb; }
      `}</style>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <div className="search-wrap">
          <input
            type="text"
            className="toolbar-input"
            placeholder="Filtern… (Bezeichnung, Kunde, Teilenummer …) — ESC leert"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") setQuery(""); }}
            style={{ minWidth: 260 }}
            aria-label="Aufgaben filtern"
          />
          {queryActive && (
            <button className="search-clear" onClick={() => setQuery("")} aria-label="Filter löschen">×</button>
          )}
        </div>
        {queryActive && <span className="badge">Treffer gehighlighted, andere gedimmt</span>}

        <select
          className="toolbar-select"
          value={stationFilter}
          onChange={(e) => setStationFilter(e.target.value)}
          aria-label="Nach Arbeitsstation filtern"
        >
          <option value="ALL">Alle Stationen</option>
          {allStationKeys.map((k) => (<option key={k} value={k}>{labelByKey[k]}</option>))}
        </select>

        <div style={{ flex: 1 }} />
        <button onClick={() => setIsCreateOpen(true)} className="btn-primary">+ Neue Aufgabe</button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="cols-row">
          {visibleStationKeys.map((key) => {
            const title = labelByKey[key];
            const list = columns[key] || [];

            const totalHoursRaw = list.reduce((acc, t) => acc + (Number(t?.aufwandStunden) || 0), 0);
            const totalHours = Math.round(totalHoursRaw * 10) / 10;
            const matchesInCol = queryActive ? list.filter((t) => matchesQuery(t, q)).length : list.length;
            const matchedHoursRaw = queryActive
              ? list.filter((t) => matchesQuery(t, q)).reduce((acc, t) => acc + (Number(t?.aufwandStunden) || 0), 0)
              : totalHoursRaw;
            const matchedHours = Math.round(matchedHoursRaw * 10) / 10;

            return (
              <Droppable droppableId={key} key={key}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="col">
                    <div className="col-head">
                      <h2>{title}</h2>
                      <div className="stats">
                        <span>Tasks {queryActive ? `${matchesInCol}/${list.length}` : `${list.length}`}</span>
                        <span className="sep">|</span>
                        <span>Aufwand {queryActive ? `${matchedHours}/${totalHours}h` : `${totalHours}h`}</span>
                      </div>
                    </div>

                    {list.map((t, index) => {
                      const isMatch = queryActive ? matchesQuery(t, q) : true;
                      const due = getDueInfo(t);
                      const tone = getStatusTone(t.status);

                      return (
                        <Draggable draggableId={t.id.toString()} index={index} key={t.id}>
                          {(dProvided, snapshot) => {
                            const base = dProvided.draggableProps.style || {};

                            const normalShadow = snapshot.isDragging
                              ? "0 18px 40px rgba(0,0,0,.35), 0 2px 8px rgba(0,0,0,.25)"
                              : "0 4px 16px var(--shadow, rgba(0,0,0,.35))";
                            const shadowWithGlow = due.glow ? `${normalShadow}, ${due.glow}` : normalShadow;

                            // WICHTIG: kein eigenes transform setzen -> Bibliothek steuert Position alleine
                            const borderStyle =
                              due.state === "none" ? "1px solid var(--border)" : `2px solid ${due.border}`;

                            return (
                              <div
                                ref={dProvided.innerRef}
                                {...dProvided.draggableProps}
                                {...dProvided.dragHandleProps}
                                tabIndex={0}
                                className={`task-card ${queryActive ? (isMatch ? "match" : "dim") : ""}`}
                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditTask(t); } }}
                                onDoubleClick={() => setEditTask(t)}
                                style={{
                                  ...base,
                                  border: borderStyle,
                                  cursor: snapshot.isDragging ? "grabbing" : "grab",
                                  boxShadow: due.state === "none" ? normalShadow : shadowWithGlow,
                                }}
                              >
                                <TaskItem task={t} dueColor={due.dateColor} statusTone={tone} />
                              </div>
                            );
                          }}
                        </Draggable>
                      );
                    })}

                    {provided.placeholder}
                    {list.length === 0 && <div className="badge" style={{ fontSize: 12 }}>keine Tasks</div>}
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
        stations={allStationKeys.map((k) => labelByKey[k])}
        onCreated={(newTask) => {
          const k = normalizeStationLabel(newTask?.arbeitsstation ?? "Unassigned");
          setColumns((prev) => { const draft = { ...prev }; draft[k] = sortByPriorityThenId([...(draft[k] || []), newTask]); return draft; });
          const raw = newTask?.arbeitsstation ?? "Unassigned";
          setLabelByKey((prev) => { const kk = normalizeStationLabel(raw); return prev[kk] ? prev : { ...prev, [kk]: String(raw).trim() }; });
        }}
      />
      <TaskEditModal
        isOpen={!!editTask}
        onClose={() => setEditTask(null)}
        task={editTask}
        stations={allStationKeys.map((k) => labelByKey[k])}
        onSaved={handleSaved}
        onRequestDelete={handleRequestDelete}
      />
    </div>
  );
}
