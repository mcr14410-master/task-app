// src/components/BoardCleanDnD.jsx
import React, { useEffect, useRef, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import useToast from "./ui/useToast";
import TaskCreationModal from "./modals/TaskCreationModal";
import TaskEditModal from "./modals/TaskEditModal";

function normalizeStationLabel(v) {
  const s = String(v ?? "Unassigned");
  return s.replace(/\u00A0/g, " ")
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
async function deleteTaskServer(id) {
  const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const txt = await res.text().catch(() => ""); throw new Error(txt || `HTTP ${res.status}`);
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

// Suche/Highlight
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
function dueColors(endDatum) {
  if (!endDatum) return { color: "#94a3b8", border: "transparent", label: null };
  const today = new Date(); today.setHours(0,0,0,0);
  const dt = /^\d{4}-\d{2}-\d{2}$/.test(endDatum) ? new Date(endDatum + "T00:00:00") : new Date(endDatum);
  if (Number.isNaN(dt.getTime())) return { color: "#94a3b8", border: "transparent", label: endDatum };
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (dt < today) return { color: "#ef4444", border: "#ef4444", label: "Überfällig " + formatDate(endDatum) };
  if (dt.getTime() === today.getTime()) return { color: "#f59e0b", border: "#f59e0b", label: "Fällig heute" };
  if (dt.getTime() === tomorrow.getTime()) return { color: "#fde047", border: "#fde047", label: "Fällig morgen" };
  return { color: "#22c55e", border: "transparent", label: formatDate(endDatum) };
}
function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s.includes("BLOCK")) return { cls: "danger", label: status };
  if (s.includes("DONE") || s.includes("ERLEDIGT")) return { cls: "ok", label: status };
  if (s.includes("PROGRESS") || s.includes("WIP")) return { cls: "warn", label: status };
  if (s.includes("NEU")) return { cls: "info", label: status };
  return { cls: "info", label: status ?? "—" };
}

// kleine Inline-Icons (kein externes Paket nötig)
const Icon = ({ path, size = 12, stroke = "#9ca3af" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}>
    {path}
  </svg>
);
const IconTag = (p) => <Icon {...p} path={<g><path d="M20.59 13.41L11 3H4v7l9.59 9.59a2 2 0 0 0 2.82 0l4.18-4.18a2 2 0 0 0 0-2.82z"/><circle cx="6.5" cy="6.5" r="1.5"/></g>} />;
const IconUser = (p) => <Icon {...p} path={<g><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></g>} />;
const IconClock = (p) => <Icon {...p} path={<g><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></g>} />;
const IconCalendar = (p) => <Icon {...p} path={<g><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></g>} />;

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
        } else { throw new Error(`Fehler bei /api/tasks: ${String(tasksRes.reason)}`); }

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
          padding: 12px;
          margin-bottom: 10px;
          box-shadow: 0 4px 16px var(--shadow);
          transition: transform .12s ease, box-shadow .12s ease, background .18s ease, opacity .18s ease, filter .18s ease;
        }
        .task-card:hover { transform: translateY(-1px) scale(1.02); }
        .task-card:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
        .task-card.match { box-shadow: 0 0 0 2px var(--brand) inset, 0 8px 24px var(--shadow); background: linear-gradient(0deg, var(--match-bg), var(--card)); }
        .task-card.dim { opacity: .45; filter: grayscale(.5) blur(.2px); }
        .pill { padding: 4px 10px; border-radius: 999px; font-size: 11px; border: 1px solid var(--border); color: #fff; text-transform: uppercase; font-weight: 700; }
        .pill.ok { background: var(--ok); border-color: var(--ok); }
        .pill.warn { background: var(--warn); border-color: var(--warn); }
        .pill.danger { background: var(--danger); border-color: var(--danger); }
        .pill.info { background: var(--info); border-color: var(--info); }
        .row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .meta { font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 6px; min-width: 0; }
        .meta-right { font-size: 12px; color: var(--muted); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .title { color: var(--text); font-size: 14px; font-weight: 600; margin: 0 0 8px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .desc { margin: 8px 0 0 0; font-size: 12.5px; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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
                      const { color: dueColor, border: dueBorder, label: dueLabel } = dueColors(t.endDatum);
                      const st = statusTone(t.status);

                      // DnD Transform + extra Effekt beim Drag
                      const dStyle = {};
                      // provided.draggableProps.style wird in-line gemischt
                      return (
                        <Draggable draggableId={t.id.toString()} index={index} key={t.id}>
                          {(dProvided, snapshot) => {
                            const base = dProvided.draggableProps.style || {};
                            const baseTransform = base.transform || "";
                            const extra = snapshot.isDragging ? " rotate(2deg) scale(1.03)" : "";
                            const composedTransform = `${baseTransform || ""}${extra}`;

                            return (
                              <div
                                ref={dProvided.innerRef}
                                {...dProvided.draggableProps}
                                {...dProvided.dragHandleProps}
                                tabIndex={0}
                                className={`task-card ${queryActive ? (isMatch ? "match" : "dim") : ""}`}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditTask(t); }
                                }}
                                onClick={() => setEditTask(t)}
                                style={{
                                  ...base,
                                  transform: composedTransform || base.transform,
                                  border: `2px solid ${dueBorder}`,
                                  cursor: "pointer",
                                }}
                              >
                                {/* Titel */}
                                <h4 className="title">{t.bezeichnung ?? t.titel ?? "(ohne Bezeichnung)"}</h4>

                                {/* Zeile 1: Teilenummer | Kunde */}
                                <div className="row" style={{ marginBottom: 6 }}>
                                  <div className="meta" title={t.teilenummer || "-"}>
                                    <IconTag stroke="#9ca3af" />
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {t.teilenummer || "-"}
                                    </span>
                                  </div>
                                  <div className="meta-right" title={t.kunde || "-"}>
                                    {t.kunde || "-"}
                                  </div>
                                </div>

                                {/* Zeile 2: Zuständig | Aufwand */}
                                <div className="row" style={{ marginBottom: 6 }}>
                                  <div className="meta" title={t.zuständig || "offen"}>
                                    <IconUser stroke="#9ca3af" />
                                    <span>{t.zuständig || "offen"}</span>
                                  </div>
                                  <div className="meta" title={`${t.aufwandStunden || 0}h`}>
                                    <IconClock stroke="#9ca3af" />
                                    <span>{t.aufwandStunden ? `${t.aufwandStunden}h` : "0h"}</span>
                                  </div>
                                </div>

                                {/* Zeile 3: Datum links (falls vorhanden) | Status rechts */}
                                <div className="row">
                                  {t.endDatum ? (
                                    <div className="meta" title={formatDate(t.endDatum)} style={{ color: dueColor }}>
                                      <IconCalendar stroke={dueColor} />
                                      <span style={{ color: dueColor }}>{formatDate(t.endDatum)}</span>
                                    </div>
                                  ) : <div />}

                                  <span className={`pill ${st.cls}`} title={`Status: ${st.label}`}>
                                    {st.label}
                                  </span>
                                </div>

                                {/* Zusatzinfos (eine Zeile, Ellipsis) */}
                                { (t["zusätzlicheInfos"] ?? t.zusatzlicheInfos) && (
                                  <p className="desc" title={t["zusätzlicheInfos"] ?? t.zusatzlicheInfos}>
                                    {t["zusätzlicheInfos"] ?? t.zusatzlicheInfos}
                                  </p>
                                )}
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
