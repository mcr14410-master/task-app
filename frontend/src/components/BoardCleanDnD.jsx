// src/components/BoardCleanDnD.jsx
import React, { useEffect, useRef, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import useToast from "./ui/useToast";
import TaskCreationModal from "./modals/TaskCreationModal";
import TaskEditModal from "./modals/TaskEditModal";

function normalizeStationLabel(v) {
  const s = String(v ?? "Unassigned");
  return s.replace(/\u00A0/g, " ").replace(/[\u200B-\u200D\uFEFF]/g, "").normalize("NFKC").replace(/\s+/g, " ").trim();
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

async function deleteTaskServer(id) {
  const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }
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
  return (rec.bezeichnung ?? rec.name ?? rec.titel ?? rec.title ?? rec.arbeitsstation ?? rec.station ?? rec.kurzname ?? null);
}

// --- Suche/Highlight ---
function matchesQuery(task, q) {
  const s = (q || "").trim().toLowerCase();
  if (!s) return true;
  const fields = [
    task?.bezeichnung,
    task?.teilenummer,
    task?.kunde,
    task?.zuständig,
    task?.["zusätzlicheInfos"],
    task?.arbeitsstation,
    task?.status,
  ].filter(Boolean);
  return fields.some((v) => String(v).toLowerCase().includes(s));
}

function formatDate(d) {
  if (!d) return null;
  try {
    const dt = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T00:00:00") : new Date(d);
    if (Number.isNaN(dt.getTime())) return d;
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${dd}.${mm}.${yyyy}`;
  } catch { return String(d); }
}

function dueState(endDatum) {
  if (!endDatum) return { label: null, tone: "muted" };
  const today = new Date(); today.setHours(0,0,0,0);
  const end = /^\d{4}-\d{2}-\d{2}$/.test(endDatum) ? new Date(endDatum + "T00:00:00") : new Date(endDatum);
  if (Number.isNaN(end.getTime())) return { label: endDatum, tone: "muted" };
  const diff = (end - today) / (1000 * 60 * 60 * 24);
  if (diff < 0) return { label: "Überfällig " + formatDate(endDatum), tone: "danger" };
  if (diff <= 2) return { label: "Bald fällig " + formatDate(endDatum), tone: "warn" };
  return { label: formatDate(endDatum), tone: "ok" };
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s.includes("BLOCK")) return "danger";
  if (s.includes("DONE") || s.includes("ERLEDIGT")) return "ok";
  if (s.includes("PROGRESS") || s.includes("WIP")) return "warn";
  if (s.includes("NEU")) return "info";
  return "info";
}

export default function BoardCleanDnD() {
  const [columns, setColumns] = useState({});
  const [labelByKey, setLabelByKey] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);

  const [query, setQuery] = useState("");
  const [stationFilter, setStationFilter] = useState("ALL");

  const toast = useToast();
  const pendingRef = useRef(new Map()); // id -> { timeout, key, index, task }

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
          } catch {}
        }

        const labels = {};
        for (const raw of stations) { const k = normalizeStationLabel(raw); if (!labels[k]) labels[k] = String(raw).trim(); }
        for (const t of tasks) { const raw = t?.arbeitsstation ?? "Unassigned"; const k = normalizeStationLabel(raw); if (!labels[k]) labels[k] = String(raw).trim(); }
        if (!labels["Unassigned"]) labels["Unassigned"] = "Unassigned";

        const grouped = {};
        for (const t of tasks) { const raw = t?.arbeitsstation ?? "Unassigned"; const k = normalizeStationLabel(raw); (grouped[k] ||= []).push(t); }
        for (const k of Object.keys(grouped)) grouped[k] = sortTasksInitial(grouped[k]);
        for (const k of Object.keys(labels)) if (!grouped[k]) grouped[k] = [];

        if (alive) { setLabelByKey(labels); setColumns(grouped); }
      } catch (e) {
        if (alive) setErr(String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; pendingRef.current.forEach(({ timeout }) => clearTimeout(timeout)); };
  }, []);

  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const prev = typeof structuredClone === "function"
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
        await bulkSortServer(buildSortPayload(next, [fromKey, toKey]));
      } else {
        await bulkSortServer(buildSortPayload(next, [toKey]));
      }
    } catch (e) {
      toast.error("Speichern fehlgeschlagen. Änderung zurückgenommen.");
      console.error(e);
      setColumns(prev.columns);
      setLabelByKey(prev.labelByKey);
    }
  };

  const handleCreated = (saved) => {
    const raw = saved?.arbeitsstation ?? "Unassigned";
    const key = normalizeStationLabel(raw);
    setLabelByKey((prev) => ({ ...prev, [key]: String(raw).trim() }));

    const prevCols = typeof structuredClone === "function" ? structuredClone(columns) : JSON.parse(JSON.stringify(columns));
    setColumns((prev) => {
      const next = { ...prev, [key]: (prev[key] || []).concat(saved) };
      const draft = { ...prevCols, [key]: (prevCols[key] || []).concat(saved) };
      bulkSortServer(buildSortPayload(draft, [key])).catch(() => {});
      return next;
    });
    toast.success("Aufgabe erstellt.");
  };

  const handleSaved = (saved) => {
    const oldKey = normalizeStationLabel(editTask?.arbeitsstation ?? "Unassigned");
    const newRaw = saved?.arbeitsstation ?? "Unassigned";
    const newKey = normalizeStationLabel(newRaw);

    setLabelByKey((prev) => ({ ...prev, [newKey]: String(newRaw).trim() }));

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
  };

  const handleRequestDelete = (task) => {
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
      ttl: UNDO_MS,
      actions: [
        {
          label: "Rückgängig",
          variant: "primary",
          onClick: () => {
            const pending = pendingRef.current.get(task.id);
            if (!pending) return;
            clearTimeout(pending.timeout);
            pendingRef.current.delete(task.id);
            setColumns((prev) => {
              const draft = { ...prev };
              const arr = [...(draft[key] || [])];
              arr.splice(index, 0, task);
              draft[key] = arr;
              return draft;
            });
            toast.info("Wiederhergestellt.");
          },
        },
      ],
    });

    const timeout = setTimeout(async () => {
      pendingRef.current.delete(task.id);
      try {
        await deleteTaskServer(task.id);
        const draft = typeof structuredClone === "function" ? structuredClone(columns) : JSON.parse(JSON.stringify(columns));
        await bulkSortServer(buildSortPayload(draft, [key]));
        toast.success("Aufgabe endgültig gelöscht.");
      } catch (e) {
        console.error(e);
        setColumns((prev) => {
          const arr = [...(prev[key] || [])];
          arr.splice(index, 0, task);
          return { ...prev, [key]: arr };
        });
        toast.error("Löschen fehlgeschlagen. Wiederhergestellt.");
      } finally {
        toast.remove?.(toastId);
      }
    }, UNDO_MS);

    pendingRef.current.set(task.id, { timeout, key, index, task });
  };

  if (loading) return <p style={{ padding: 16, color: "#cbd5e1", background: "#0b1220", minHeight: "100vh" }}>lade…</p>;
  if (err) return (
    <div style={{ padding: 16, background: "#0b1220", minHeight: "100vh" }}>
      <pre style={{ whiteSpace: "pre-wrap", color: "#f87171", background: "transparent" }}>Fehler: {err}</pre>
    </div>
  );

  const allStationKeys = Object.keys(labelByKey).sort((a, b) => a.localeCompare(b));
  const visibleStationKeys = stationFilter === "ALL" ? allStationKeys : allStationKeys.filter((k) => k === stationFilter);

  const q = query.trim();
  const queryActive = q.length > 0;

  return (
    <div style={{ padding: 16, background: "var(--bg)", minHeight: "100vh" }}>
      {/* Dark Theme + Karten-Styling */}
      <style>{`
        :root {
          --bg: #0b1220;
          --panel: #0f172a;
          --card: #111827;
          --card-2: #0b1220;
          --text: #e5e7eb;
          --muted: #94a3b8;
          --border: #1f2937;
          --shadow: rgba(0,0,0,0.35);
          --brand: #3b82f6;
          --ok: #22c55e;
          --warn: #f59e0b;
          --danger: #ef4444;
          --info: #38bdf8;
          --match-bg: rgba(59,130,246,0.12);
        }
        .toolbar-input, .toolbar-select { padding: 8px; border-radius: 8px; border: 1px solid var(--border); background: var(--card); color: var(--text); }
        .toolbar-input::placeholder { color: var(--muted); }
        .btn-primary { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: white; }
        .col { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 8px 24px var(--shadow) }
        .col h2 { color: var(--text); }
        .badge { font-size: 12px; color: var(--muted); }
        .task-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 10px;
          margin-bottom: 10px;
          box-shadow: 0 4px 16px var(--shadow);
          transition: transform .06s ease, box-shadow .18s ease, background .18s ease, opacity .18s ease, filter .18s ease;
        }
        .task-card:hover { transform: translateY(-1px); }
        .task-card:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
        .task-card.match { box-shadow: 0 0 0 2px var(--brand) inset, 0 8px 24px var(--shadow); background: linear-gradient(0deg, var(--match-bg), var(--card)); }
        .task-card.dim { opacity: .45; filter: grayscale(.5) blur(.2px); }
        .pill { padding: 3px 8px; border-radius: 999px; font-size: 11px; border: 1px solid var(--border); color: var(--text); background: var(--card-2); }
        .pill.ok { border-color: var(--ok); color: var(--ok); }
        .pill.warn { border-color: var(--warn); color: var(--warn); }
        .pill.danger { border-color: var(--danger); color: var(--danger); }
        .pill.info { border-color: var(--info); color: var(--info); }

        /* Backup-ähnliche Label/Value-Aufteilung */
        .kv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; margin-top: 8px; }
        .kv { display: flex; gap: 6px; align-items: baseline; min-width: 0; }
        .kv-label { width: 78px; flex: 0 0 auto; font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; }
        .kv-value { font-size: 12px; color: var(--text); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .title { color: var(--text); }
        .muted { color: var(--muted); }
        .clamp { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
      `}</style>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ margin: 0, marginRight: 8, color: "var(--text)" }}>Board</h1>

        <input
          className="toolbar-input"
          type="search"
          placeholder="Suchen (Bezeichnung, Kunde, …) – Treffer werden hervorgehoben"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Aufgaben durchsuchen"
        />

        <select
          className="toolbar-select"
          value={stationFilter}
          onChange={(e) => setStationFilter(e.target.value)}
          aria-label="Nach Arbeitsstation filtern"
        >
          <option value="ALL">Alle Stationen</option>
          {allStationKeys.map((k) => (
            <option key={k} value={k}>{labelByKey[k]}</option>
          ))}
        </select>

        <div style={{ flex: 1 }} />
        {queryActive && <span className="badge">Treffer gehighlighted, andere gedimmt</span>}

        <button onClick={() => setIsCreateOpen(true)} className="btn-primary">+ Neue Aufgabe</button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {visibleStationKeys.map((key) => {
            const title = labelByKey[key];
            const list = columns[key] || [];
            const matchesInCol = list.reduce((acc, t) => acc + (matchesQuery(t, q) ? 1 : 0), 0);

            return (
              <Droppable droppableId={key} key={key}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="col" style={{ padding: 12, minHeight: 80 }}>
                    <h2 style={{ margin: "0 0 8px 0" }}>
                      {title} <span className="badge">({matchesInCol}/{list.length})</span>
                    </h2>

                    {list.map((t, index) => {
                      const isMatch = matchesQuery(t, q);
                      const due = dueState(t.endDatum);
                      const tone = statusTone(t.status);

                      return (
                        <Draggable draggableId={t.id.toString()} index={index} key={t.id}>
                          {(dProvided, snapshot) => (
                            <div
                              ref={dProvided.innerRef}
                              {...dProvided.draggableProps}
                              {...dProvided.dragHandleProps}
                              tabIndex={0}
                              className={`task-card ${queryActive ? (isMatch ? "match" : "dim") : ""}`}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setEditTask(t);
                                }
                              }}
                              onClick={() => setEditTask(t)}
                              style={{
                                opacity: snapshot.isDragging ? 0.85 : undefined,
                                cursor: "pointer",
                                ...dProvided.draggableProps.style,
                              }}
                            >
                              {/* Kopfzeile: Titel + ID */}
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                                <strong className="title" style={{ fontSize: 14, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {t.bezeichnung ?? "(ohne Bezeichnung)"}
                                </strong>
                                <span className="muted" style={{ fontSize: 11, flex: "0 0 auto" }}>#{t.id}</span>
                              </div>

                              {/* Backup-ähnliche Info-Zeilen */}
                              <div className="kv-grid">
                                {t.kunde && (
                                  <div className="kv"><span className="kv-label">Kunde</span><span className="kv-value" title={t.kunde}>{t.kunde}</span></div>
                                )}
                                {t.teilenummer && (
                                  <div className="kv"><span className="kv-label">Teilenr.</span><span className="kv-value" title={t.teilenummer}>{t.teilenummer}</span></div>
                                )}
                                {t.zuständig && (
                                  <div className="kv"><span className="kv-label">Zuständig</span><span className="kv-value" title={t.zuständig}>{t.zuständig}</span></div>
                                )}
                                {(t.aufwandStunden ?? 0) > 0 && (
                                  <div className="kv"><span className="kv-label">Aufwand</span><span className="kv-value">{t.aufwandStunden} h</span></div>
                                )}
                              </div>

                              {/* Zusatzinfos */}
                              {t["zusätzlicheInfos"] && (
                                <div className="clamp" style={{ marginTop: 8, fontSize: 12, color: "var(--text)" }}>
                                  {t["zusätzlicheInfos"]}
                                </div>
                              )}

                              {/* Footer: Status & Fälligkeit */}
                              <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span className={`pill ${tone}`} title={`Status: ${t.status ?? "-"}`}>
                                  {t.status ?? "—"}
                                </span>
                                {due.label && <span className={`pill ${due.tone}`}>{due.label}</span>}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}

                    {provided.placeholder}
                    {list.length === 0 && <div className="muted" style={{ fontSize: 12 }}>keine Tasks</div>}
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
        onCreated={handleCreated}
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
