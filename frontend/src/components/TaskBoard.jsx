// frontend/src/components/TaskBoard.lintclean.jsx
// Lint-cleaned version: no unused vars, no empty blocks. Keeps stations-managed + search + hard filter + top anchor.
import React, { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import TaskCreationModal from "./TaskCreationModal";
import TaskEditModal from "./TaskEditModal";
import StationManagementContent from "./StationManagementContent";
import TaskItem from "./TaskItem";

/** ====================== Utilities ====================== */
const norm = (v) =>
  String(v ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();

const pickStationName = (s) => s?.name ?? s?.bezeichnung ?? null;
const pickStationId = (s) => (s?.id ?? s?.stationId ?? s?.pk ?? null);

const bySortOrder = (a, b) => {
  const sa = Number.isFinite(a?.sort_order) ? a.sort_order : (Number.isFinite(a?.sortOrder) ? a.sortOrder : 1e9);
  const sb = Number.isFinite(b?.sort_order) ? b.sort_order : (Number.isFinite(b?.sortOrder) ? b.sortOrder : 1e9);
  if (sa !== sb) return sa - sb;
  return (a?.id ?? 0) - (b?.id ?? 0);
};

function buildStationMaps(stations) {
  const idToLabel = {};
  const labelToId = {};
  for (const s of stations) {
    const id = pickStationId(s);
    const name = norm(pickStationName(s));
    if (id == null || !name) continue;
    const idStr = String(id);
    idToLabel[idStr] = name;
    labelToId[name.toLowerCase()] = idStr;
  }
  return { idToLabel, labelToId };
}

function resolveTaskStationId(task, maps, fallbackId) {
  const { idToLabel, labelToId } = maps;
  const idCandidates = [
    task?.arbeitsstationId,
    task?.stationId,
    task?.station_id,
    task?.arbeitsstation?.id,
    task?.station?.id,
  ].map((x) => (x == null ? null : String(x)));
  for (const id of idCandidates) {
    if (id && idToLabel[id]) return id;
  }
  const nameCandidates = [
    task?.arbeitsstation,
    task?.station,
    task?.stationName,
    task?.arbeitsplatz,
    task?.kunde,
    task?.zuständig,
  ].filter(Boolean);
  for (const nm of nameCandidates) {
    const id = labelToId[norm(nm).toLowerCase()];
    if (id) return id;
  }
  return fallbackId ?? null;
}

/** ====== Visual helpers for TaskItem (status pill + due color/class) ====== */
function getStatusTone(statusRaw) {
  const s = String(statusRaw || "").toUpperCase();
  if (s.includes("DONE") || s.includes("ERLEDIGT") || s.includes("FERTIG")) {
    return { cls: "ok", label: "DONE", statusClass: "status-ok" };
  }
  if (s.includes("BLOCK") || s.includes("WARTET") || s.includes("WAIT") || s.includes("HOLD")) {
    return { cls: "danger", label: "BLOCKED", statusClass: "status-danger" };
  }
  if ((s.includes("IN") && s.includes("PROG")) || s.includes("BEARBEIT") || s.includes("DOING") || s.includes("WORK")) {
    return { cls: "info", label: "IN PROGRESS", statusClass: "status-info" };
  }
  if (s.includes("REVIEW") || s.includes("QA") || s.includes("TEST")) {
    return { cls: "warn", label: "REVIEW", statusClass: "status-warn" };
  }
  return { cls: "warn", label: "OPEN", statusClass: "status-warn" };
}

function getDueVisual(t) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const noDue = { frame: "#1f2937", accent: "transparent", dueClass: "", text: "#94a3b8" };
  if (!t?.endDatum) return noDue;
  const d = new Date(t.endDatum);
  if (isNaN(+d)) return noDue;
  d.setHours(0, 0, 0, 0);
  if (d < today) return { frame: "#7f1d1d", accent: "#ef4444", dueClass: "due-overdue", text: "#fca5a5" };
  if (+d === +today) return { frame: "#7a5d0a", accent: "#f59e0b", dueClass: "due-today", text: "#fde68a" };
  return { frame: "#0f3d25", accent: "#22c55e", dueClass: "due-future", text: "#a7f3d0" };
}

/** ====== Search helper ====== */
function matchesQuery(task, q) {
  const needle = (q || "").trim().toLowerCase();
  if (!needle) return true;
  const fields = [
    task?.bezeichnung,
    task?.teilenummer,
    task?.kunde,
    task?.zuständig,
    task?.zusätzlicheInfos,
    task?.arbeitsstation,
    task?.status,
    task?.id,
  ].filter(Boolean);
  return fields.some((v) => String(v).toLowerCase().includes(needle));
}

/** ====================== Modal wrapper (simple) ====================== */
function Modal({ open, onClose, title, children, width = 760 }) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "grid", placeItems: "center", zIndex: 1000
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width, maxWidth: "96vw", maxHeight: "90vh", overflow: "hidden",
        background: "#0f172a", color: "#e5e7eb", border: "1px solid #1f2937", borderRadius: 12,
        boxShadow: "0 24px 64px rgba(0,0,0,.5)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #1f2937" }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid #334155", color: "#cbd5e1", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: 16 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** ====================== Component ====================== */
export default function TaskBoard() {
  const [stations, setStations] = useState([]);              // [{id, name, sort_order}]
  const [idToLabel, setIdToLabel] = useState({});           // {id: name}
  const [orderIds, setOrderIds] = useState([]);             // [id, id, ...]
  const [columnsById, setColumnsById] = useState({});       // {id: Task[]}
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [isStationsOpen, setIsStationsOpen] = useState(false);

  // Search state
  const [query, setQuery] = useState(() => {
    try { return localStorage.getItem("taskboard:query") || ""; }
    catch { /* storage unavailable */ return ""; }
  });
  
  const [hardFilter, setHardFilter] = useState(() => {
    try { return localStorage.getItem("taskboard:hardFilter") === "1"; }
    catch { /* storage unavailable */ return false; }
  });

  async function fetchAll() {
    setLoading(true);
    try {
      const [tasksRes, stationsRes] = await Promise.all([
        fetch("/api/tasks").then((r) => r.json()),
        fetch("/api/arbeitsstationen").then((r) => r.json()),
      ]);
      const tasks = Array.isArray(tasksRes) ? tasksRes : [];
      const stationsList = Array.isArray(stationsRes) ? stationsRes : [];

      // Sort stations by DB order
      const sortedStations = [...stationsList].sort(bySortOrder);

      const maps = buildStationMaps(sortedStations);
      const { idToLabel } = maps;

      // Prepare empty buckets by station id
      const grouped = {};
      for (const s of sortedStations) {
        const idStr = String(pickStationId(s));
        grouped[idStr] = [];
      }

      // Assign tasks to buckets (fallback to first station if none matches)
      const fallbackId = sortedStations.length ? String(pickStationId(sortedStations[0])) : null;
      for (const t of tasks) {
        const id = resolveTaskStationId(t, maps, fallbackId) ?? fallbackId;
        if (!id) continue;
        grouped[id] ||= [];
        grouped[id].push({ ...t, arbeitsstationId: id, arbeitsstation: idToLabel[id] ?? t.arbeitsstation });
      }

      // Sort tasks
      for (const id of Object.keys(grouped)) {
        grouped[id] = [...grouped[id]].sort((a, b) => {
          const pa = Number.isFinite(a?.prioritaet) ? a.prioritaet : 999999;
          const pb = Number.isFinite(b?.prioritaet) ? b.prioritaet : 999999;
          if (pa !== pb) return pa - pb;
          return (a?.id ?? 0) - (b?.id ?? 0);
        });
      }

      setStations(sortedStations);
      setIdToLabel(idToLabel);
      setOrderIds(sortedStations.map((s) => String(pickStationId(s))));
      setColumnsById(grouped);
      setError(null);
    } catch (e) {
      console.error(e);
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); /* eslint-disable-line */ }, []);

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    const srcId = source.droppableId;
    const dstId = destination.droppableId;
    if (!srcId || !dstId) return;
    if (srcId === dstId && source.index === destination.index) return;

    setColumnsById((prev) => {
      const next = { ...prev };
      const srcList = Array.from(next[srcId] || []);
      const dstList = srcId === dstId ? srcList : Array.from(next[dstId] || []);
      const [moved] = srcList.splice(source.index, 1);
      const movedPatched = { ...moved, arbeitsstationId: dstId, arbeitsstation: idToLabel[dstId] ?? moved.arbeitsstation };
      dstList.splice(destination.index, 0, movedPatched);

      if (srcId === dstId) {
        next[srcId] = dstList.map((t, i) => ({ ...t, prioritaet: i }));
      } else {
        next[srcId] = srcList.map((t, i) => ({ ...t, prioritaet: i }));
        next[dstId] = dstList.map((t, i) => ({ ...t, prioritaet: i }));
      }
      return next;
    });

    try {
      const payload = {
        taskId: Number(draggableId),
        fromId: srcId,
        toId: dstId,
        toIndex: destination.index,
        from: idToLabel[srcId] ?? null,
        to: idToLabel[dstId] ?? null,
      };
      await fetch(`/api/tasks/sort`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.warn("Persist sort failed:", e);
    }
  };

  // Search helpers
  const q = (query || "").trim().toLowerCase();
  const queryActive = q.length > 0;

  // Toolbar helpers
  const clearQuery = () => {
    setQuery("");
    try { localStorage.setItem("taskboard:query", ""); } catch (_E) { /* ignore */ void _E; }
  };
  const toggleHardFilter = () => {
    const next = !hardFilter;
    setHardFilter(next);
    try { localStorage.setItem("taskboard:hardFilter", next ? "1" : "0"); } catch (_E) { /* ignore */ void _E; }
  };

  if (loading) return <div style={{ padding: 24 }}>Lade…</div>;
  if (error) return <div style={{ padding: 24, color: "#ef4444" }}>Fehler: {String(error)}</div>;

  return (
    <div style={{
      padding: 16,
      background: "#0b1220",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-start"
    }}>
      <style>{`
        :root {
          --bg: #0b1220; --panel: #0f172a; --card: #111827;
          --text: #e5e7eb; --muted: #94a3b8;
          --border: #1f2937; --shadow: rgba(0,0,0,0.35);
          --brand: #3b82f6; --ok: #22c55e; --warn: #f59e0b; --danger: #ef4444; --info: #38bdf8;
          --frame-default: #1f2937; --frame-overdue: #7f1d1d; --frame-today: #7a5d0a; --frame-future: #0f3d25;
          --accent-overdue: #ef4444; --accent-today: #f59e0b; --accent-future: #22c55e;
          --match-bg: rgba(59,130,246,0.12);
        }
        .toolbar-input, .toolbar-select { padding: 8px; border-radius: 10px; border: 1px solid var(--border); background: var(--card); color: var(--text); }
        .toolbar-input::placeholder { color: var(--muted); }
        .btn-primary { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: white; }
        .btn-ghost { padding: 8px 12px; border-radius: 8px; border: 1px solid #334155; background: transparent; color: #cbd5e1; }
        .col { background: var(--panel); border: 1px solid var(--border); padding: 12px; border-radius: 12px; box-shadow: 0 8px 24px var(--shadow) }
        /* Task Card */
        .task-card { position: relative; background: var(--card); border: 1px solid var(--frame-default); border-radius: 12px; padding: 12px 12px 12px 16px; box-shadow: 0 4px 16px var(--shadow); transition: box-shadow .12s ease, background .18s ease, opacity .18s ease, filter .18s ease; user-select: none; }
        .task-card:hover { box-shadow: 0 10px 24px var(--shadow); }
        .task-card::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; border-top-left-radius: 12px; border-bottom-left-radius: 12px; background: var(--accent, transparent); }
        .task-card.due-overdue { border-color: var(--frame-overdue); }
        .task-card.due-overdue::before { background: var(--accent-overdue); }
        .task-card.due-today { border-color: var(--frame-today); }
        .task-card.due-today::before { background: var(--accent-today); }
        .task-card.due-future { border-color: var(--frame-future); }
        /* Search highlighting */
        .task-card.match { box-shadow: 0 0 0 2px var(--brand) inset, 0 8px 24px var(--shadow); background: linear-gradient(0deg, var(--match-bg), var(--card)); }
        .task-card.dim { opacity: .45; filter: grayscale(.5) blur(.2px); }

        /* TaskItem inner layout */
        .row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .meta { font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 6px; min-width: 0; }
        .meta-right { font-size: 12px; color: var(--muted); min-width: 0; display: flex; gap: 12px; align-items: center; }
        .title { color: var(--text); font-size: 14px; font-weight: 700; line-height: 1.2; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .desc { margin: 8px 0 0 0; font-size: 12.5px; color: #cbd5e1; line-height: 1.25; max-width: 460px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* Status pills */
        .pill { padding: 4px 10px; border-radius: 999px; font-size: 10px; letter-spacing: .12em; border: 1px solid var(--border); color: #fff; text-transform: uppercase; font-weight: 700; }
        .pill.ok { background: var(--ok); border-color: var(--ok); }
        .pill.warn { background: var(--warn); border-color: var(--warn); color: #111827; }
        .pill.danger { background: var(--danger); border-color: var(--danger); }
        .pill.info { background: var(--info); border-color: var(--info); }

        /* Search input wrapper */
        .search-wrap { position: relative; display: inline-flex; align-items: center; }
        .search-clear { position: absolute; right: 8px; font-size: 16px; line-height: 1; cursor: pointer; border: none; background: transparent; color: var(--muted); padding: 0 4px; }
        .search-clear:hover { color: var(--text); }
        .toggle { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); user-select: none; }
      `}</style>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <span className="search-wrap">
          <input
            type="text"
            className="toolbar-input"
            placeholder="Suchen… (Bezeichnung, Kunde, Teilenummer, Status …)"
            value={query}
            onChange={(e) => {
              const v = e.target.value;
              setQuery(v);
              try { localStorage.setItem("taskboard:query", v); } catch (_ERR) { /* ignore */ void _ERR; }
            }}
            onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); clearQuery(); } }}
            style={{ minWidth: 260, paddingRight: 28 }}
          />
          {query && (
            <button
              className="search-clear"
              aria-label="Suche löschen"
              title="Suche löschen (Esc)"
              onClick={clearQuery}
            >
              ×
            </button>
          )}
        </span>

        <label className="toggle">
          <input
            type="checkbox"
            checked={hardFilter}
            onChange={toggleHardFilter}
          />
          Hart filtern (ausblenden)
        </label>

        <button className="btn-primary" onClick={() => setIsCreateOpen(true)}>+ Neuer Task</button>
        <button className="btn-ghost" onClick={() => setIsStationsOpen(true)}>Stationen verwalten</button>
        {hardFilter && queryActive && <span style={{ fontSize: 12, color: "var(--muted)" }}>Hinweis: Drag & Drop ist bei hartem Filter deaktiviert.</span>}
      </div>

      {/* Columns */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", overflowX: "auto", paddingBottom: 8, flex: "1 1 auto" }}>
          {orderIds.map((colId) => {
            const title = idToLabel[colId] || colId;
            const list = columnsById[colId] || [];
            const visibleList = hardFilter && queryActive ? list.filter((t) => matchesQuery(t, q)) : list;
            const matchesInCol = queryActive ? list.filter((t) => matchesQuery(t, q)).length : list.length;

            return (
              <Droppable droppableId={String(colId)} key={String(colId)} isDropDisabled={hardFilter && queryActive}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="col"
                    style={{ minHeight: 80, minWidth: 320, width: 360, flex: "0 0 auto" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                      <h2 style={{ margin: 0, color: "var(--text)", fontSize: 16 }}>{title}</h2>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>
                        Tasks {queryActive ? `${matchesInCol}/${list.length}` : String(list.length)}
                      </span>
                    </div>

                    {visibleList.map((t, index) => {
                      const due = getDueVisual(t);
                      const st = getStatusTone(t.status);
                      const isMatch = matchesQuery(t, q);

                      const baseStyle = {
                        borderColor: "var(--frame-default)",
                        "--accent": due.accent,
                      };

                      return (
                        <Draggable
                          draggableId={String(t.id)}
                          index={index}
                          key={t.id}
                          isDragDisabled={hardFilter && queryActive}
                        >
                          {(dProvided, snapshot) => {
                            const base = dProvided.draggableProps.style || {};
                            return (
                              <div
                                ref={dProvided.innerRef}
                                {...dProvided.draggableProps}
                                {...dProvided.dragHandleProps}
                                className={`task-card ${due.dueClass} ${st.statusClass} ${!hardFilter && queryActive ? (isMatch ? "match" : "dim") : ""}`}
                                style={{
                                  ...baseStyle,
                                  ...base,
                                  boxShadow: snapshot.isDragging
                                    ? "0 18px 40px rgba(0,0,0,.35), 0 2px 8px rgba(0,0,0,.25)"
                                    : "0 4px 16px var(--shadow)",
                                  cursor: (hardFilter && queryActive) ? "default" : (snapshot.isDragging ? "grabbing" : "grab"),
                                  marginBottom: 10,
                                }}
                                onDoubleClick={() => setEditTask(t)}
                              >
                                <TaskItem task={t} dueColor={due.text} statusTone={st} />
                              </div>
                            );
                          }}
                        </Draggable>
                      );
                    })}

                    {provided.placeholder}
                    {visibleList.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>keine Tasks</div>}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      {/* Modals */}
      {isCreateOpen && (
        <TaskCreationModal
          stations={stations.map((s) => ({ id: String(pickStationId(s)), name: pickStationName(s) }))}
          onTaskCreated={() => { setIsCreateOpen(false); fetchAll(); }}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {editTask && (
        <TaskEditModal
          task={editTask}
          stations={stations.map((s) => ({ id: String(pickStationId(s)), name: pickStationName(s) }))}
          onSave={() => { setEditTask(null); fetchAll(); }}
          onClose={() => setEditTask(null)}
        />
      )}

      <Modal
        open={isStationsOpen}
        onClose={() => setIsStationsOpen(false)}
        title="Stationen verwalten"
        width={760}
      >
        <StationManagementContent
          stations={stations.map((s) => ({ id: pickStationId(s), name: pickStationName(s), sortOrder: s.sort_order ?? s.sortOrder }))}
          onUpdate={() => { setIsStationsOpen(false); fetchAll(); }}
        />
      </Modal>
    </div>
  );
}
