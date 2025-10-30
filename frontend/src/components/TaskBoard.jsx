// frontend/src/components/TaskBoard.jsx
// Wire up due-* stripe classes via central DueDateConfig/DueDateTheme and remove inline due-color logic.
import React, { useCallback, useEffect, useState, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import SettingsModal from '@/components/settings/SettingsModal';
import TaskCreationModal from "./TaskCreationModal";
import TaskEditModal from "./TaskEditModal";
import TaskItem from "./TaskItem";
import useToast from "@/components/ui/useToast";
import apiErrorMessage from "@/utils/apiErrorMessage";
import { apiGet, apiPatch, apiPut } from "../config/apiClient";
import { keyFromTask } from "@/utils/dueStyles";

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
    task?.arbeitsstationName,
  ].filter(Boolean);
  for (const nm of nameCandidates) {
    const id = labelToId[norm(nm).toLowerCase()];
    if (id) return id;
  }
  return fallbackId ?? null;
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

/** ====== Effort helpers (robust to varied schemas) ====== */
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : NaN; }

function parseEffortString(s) {
  if (!s) return NaN;
  const str = String(s).trim().toLowerCase();
  // "2:30" -> 150 min
  const time = str.match(/^(\d+):(\d{1,2})$/);
  if (time) return (+time[1]) * 60 + (+time[2]);
  // "2,5h" or "2.5h"
  const hdec = str.match(/^(\d+(?:[.,]\d+)?)\s*h$/);
  if (hdec) return Math.round(parseFloat(hdec[1].replace(",", ".")) * 60);
  // "150m" or "150 min"
  const mins = str.match(/^(\d+)\s*(m|min|minutes?)$/);
  if (mins) return +mins[1];
  // "2h 30m"
  const hm = str.match(/^(\d+)\s*h(?:\s*(\d+)\s*m)?$/);
  if (hm) return (+hm[1]) * 60 + (hm[2] ? +hm[2] : 0);
  // plain number: heuristic (<=24 => hours, else minutes)
  const plain = str.match(/^\d+(?:[.,]\d+)?$/);
  if (plain) {
    const v = parseFloat(str.replace(",", "."));
    if (!Number.isFinite(v)) return NaN;
    return v <= 24 ? Math.round(v * 60) : Math.round(v); // <=24 as hours, else minutes
  }
  return NaN;
}

function getEffortMinutes(t) {
  // Prefer explicit minute fields
  const minuteFields = ["gesamtaufwandMinuten", "aufwandMinuten", "aufwand_minuten", "minutes", "dauerMinuten", "dauer_minuten", "estimatedMinutes", "estimated_min", "zeitaufwandMinuten"];
  for (const f of minuteFields) {
    const v = t?.[f];
    if (Number.isFinite(v)) return Math.max(0, v);
    const parsed = num(v);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  // Hours fields
  const hourFields = ["gesamtaufwandStunden", "aufwandStunden", "aufwand_stunden", "stunden", "estimatedHours", "estimated_hours", "zeitaufwandStunden"];
  for (const f of hourFields) {
    const v = t?.[f];
    const parsed = num(v);
    if (Number.isFinite(parsed)) return Math.max(0, Math.round(parsed * 60));
  }
  // String-ish fields
  const stringFields = ["gesamtaufwand", "aufwand", "dauer", "zeitaufwand", "estimate", "estimation", "geschaetzteDauer"];
  for (const f of stringFields) {
    const v = t?.[f];
    const parsed = parseEffortString(v);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return 0;
}

function formatEffort(mins) {
  const m = Math.max(0, Math.round(mins || 0));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h > 0 && mm > 0) return `${h}h ${mm}m`;
  if (h > 0) return `${h}h`;
  return `${mm}m`;
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
export default function TaskBoard({ showDashboard = false, onToggleDashboard = () => {} }) {
  const toast = useToast();
  const [stations, setStations] = useState([]);              // [{id, name, sort_order}]
  const [idToLabel, setIdToLabel] = useState({});           // {id: name}
  const [orderIds, setOrderIds] = useState([]);             // [id, id, ...]
  const [columnsById, setColumnsById] = useState({});       // {id: Task[]}
  const [error, setError] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [editInitialTab, setEditInitialTab] = useState("details");   // << neu
  const inFlightByColumn = React.useRef(new Map());
  const [loadingHard, setLoadingHard] = useState(false);   // nur initial
  const [loadingSoft, setLoadingSoft] = useState(false);  // alle Refreshes
  const ignoreRefetchUntil = useRef(0);                   // SSE-Duplikate dämpfen
  const vpRef = useRef(null);
  const [edges, setEdges] = useState({ left: true, right: false, top: true, bottom: false });
  const [openSettings, setOpenSettings] = useState(false);



  // Modal opener
  const openEditModal = useCallback((task, initialTab = "details") => {
    setEditTask(task);
    setEditInitialTab(initialTab);
  }, []);
  const closeEditModal = useCallback(() => {
    setEditTask(null);
    setEditInitialTab("details");
  }, []);

  // persistSort: nur ein Flug pro Spalte zulassen
  const persistSort = React.useCallback(async (dstId, nextMap) => {
    const key = String(dstId);
    if (inFlightByColumn.current.get(key)) return; // skip doppeltes Auslösen
    inFlightByColumn.current.set(key, true);
    try {
      const list = Array.isArray(nextMap?.[dstId]) ? nextMap[dstId] : [];
      const orderedIds = list.map(t => +t?.id).filter(Number.isFinite);
      const stationId = +dstId;

      const payload = {
        arbeitsstationId: stationId,
        orderedIds,
        columnId: stationId, // Kompat
        order: orderedIds,
      };

      // PATCH -> PUT-Fallback nur bei 405
      try {
        await apiPatch("/tasks/sort", payload);
      } catch (e) {
        const msg = (e?.message || "").toLowerCase();
        if (msg.includes("405") || msg.includes("method not allowed")) {
          await apiPut("/tasks/sort", payload);
        } else {
          throw e;
        }
      }
    } catch (e) {
      console.warn("Persist sort failed:", e);
      const msg = typeof apiErrorMessage === "function" ? apiErrorMessage(e) : (e?.message || String(e));
      toast.error(`Sortierung fehlgeschlagen: ${msg}`);
    } finally {
      inFlightByColumn.current.set(String(dstId), false);
    }
  }, []);


  // Search state
  const [query, setQuery] = useState(() => {
    try { return localStorage.getItem("taskboard:query") || ""; }
    catch { return ""; }
  });
  const [hardFilter, setHardFilter] = useState(() => {
    try { return localStorage.getItem("taskboard:hardFilter") === "1"; }
    catch { return false; }
  });
  
  const fetchAll = useCallback(async ({ mode = "soft" } = {}) => {
    if (mode === "hard") setLoadingHard(true); else setLoadingSoft(true);
    try {
      const [tasksRes, stationsRes] = await Promise.all([
        apiGet("/tasks"),
        apiGet("/arbeitsstationen"),
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
      if (mode === "hard") setLoadingHard(false); else setLoadingSoft(false);
    }
  }, []);
  
  useEffect(() => {
    fetchAll({ mode: "hard" });
    // absichtlich ohne Abhängigkeiten, damit es garantiert 1x feuert
  }, []);
 


  useEffect(() => {
    const isVite = typeof window !== "undefined" && window.location && window.location.port === "5173";
    const url = isVite ? "http://localhost:8080/api/tasks/stream" : "/api/tasks/stream";
    const es = new EventSource(url);	
 	let t = null;
 	const onTask = () => {
	   // Speicherkollisionen vermeiden (Save triggert gleich nochmal via SSE)
	   if (Date.now() < ignoreRefetchUntil.current) return;
	   if (t) clearTimeout(t);
	   t = setTimeout(() => fetchAll({ mode: "soft" }), 400);
	 };
	
		
    es.addEventListener("task-created", onTask);
    es.addEventListener("task-updated", onTask);
    es.addEventListener("task-deleted", onTask);

    es.onerror = () => {}; // Browser reconnectet automatisch
    return () => { if (t) clearTimeout(t); es.close(); };
  }, [fetchAll]);


  useEffect(() => {
    const el = vpRef.current;
    if (!el) return;

    const update = () => {
      const { scrollLeft, scrollTop, scrollWidth, scrollHeight, clientWidth, clientHeight } = el;
      const left   = scrollLeft <= 0;
      const right  = scrollLeft + clientWidth  >= scrollWidth  - 1;
      const top    = scrollTop  <= 0;
      const bottom = scrollTop  + clientHeight >= scrollHeight - 1;
      setEdges({ left, right, top, bottom });
    };

    update(); // initial
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const el = vpRef.current;
    if (!el) return;

    const setSB = () => {
      const v = Math.max(0, el.offsetWidth  - el.clientWidth);   // vertikale Leiste (rechts)
      const h = Math.max(0, el.offsetHeight - el.clientHeight);  // horizontale Leiste (unten)
      el.style.setProperty("--sb-v", `${v}px`);
      el.style.setProperty("--sb-h", `${h}px`);
    };

    setSB();
    const ro = new ResizeObserver(setSB);
    ro.observe(el);
    window.addEventListener("resize", setSB);
    return () => { ro.disconnect(); window.removeEventListener("resize", setSB); };
  }, []);

  
  
  
  
  // --- NEU: Handler top-level, nicht in onDragEnd ---
  const handleTaskDeleted = useCallback((deletedId) => {
    setColumnsById(prev => {
      const next = {};
      for (const colId of Object.keys(prev || {})) {
        const arr = Array.isArray(prev[colId]) ? prev[colId] : [];
        next[colId] = arr.filter(t => String(t.id) !== String(deletedId));
      }
      return next;
    });
    closeEditModal();
  }, [closeEditModal]);

  const onDragEnd = async ({ source, destination, draggableId }) => {
    if (!destination) return;

    const srcId = source.droppableId;
    const dstId = destination.droppableId;

    setColumnsById((prev) => {
      const srcList = Array.isArray(prev?.[srcId]) ? [...prev[srcId]] : [];
      const dstList = Array.isArray(prev?.[dstId]) ? [...prev[dstId]] : [];
      if (!srcList || !dstList) return prev;

      const next = { ...prev };

      if (srcId === dstId) {
        // innerhalb einer Spalte: Task-Objekt bewegen
        const from = Math.max(0, Math.min(source.index, srcList.length - 1));
        const to = Math.max(0, Math.min(destination.index, srcList.length - 1));
        const [moved] = srcList.splice(from, 1);
        srcList.splice(to, 0, moved ?? srcList.find(t => String(t.id) === String(draggableId)));
        next[srcId] = srcList;
      } else {
        // zwischen Spalten: Task-Objekt rüber schieben
        const from = Math.max(0, Math.min(source.index, srcList.length - 1));
        const [moved] = srcList.splice(from, 1);
        const insert = moved ?? srcList.find(t => String(t.id) === String(draggableId));
        const to = Math.max(0, Math.min(destination.index, dstList.length));
        dstList.splice(to, 0, insert);
        next[srcId] = srcList;
        next[dstId] = dstList;
      }

      // Persist anhand des neuen Arrays (IDs daraus extrahieren)
      persistSort(dstId, next);
      return next;
    });
  };


  // Search helpers
  const q = (query || "").trim().toLowerCase();
  const queryActive = q.length > 0;

  // Toolbar helpers
  const clearQuery = () => {
    setQuery("");
    try { localStorage.setItem("taskboard:query", ""); } catch { /* ignore */ }
  };
  const toggleHardFilter = () => {
    const next = !hardFilter;
    setHardFilter(next);
    try { localStorage.setItem("taskboard:hardFilter", next ? "1" : "0"); } catch { /* ignore */ }
  };

  
  if (loadingHard) { return ( <div className="hard-loader">Lade…</div> );}
  
  if (error) return <div style={{ padding: 24, color: "#ef4444" }}>Fehler: {String(error)}</div>;
  
  
  // Hilfsfunktion: bestimmt die CSS-Klasse "due-<key>" für einen Task
  function getDueClass(task) {
    if (!task) return "";

    // 1) Bevorzugt: vom Backend geliefertes Feld nehmen
    // Wir decken beide Varianten ab: als String oder als Objekt mit .key
    const keyFromApi =
      task.dueSeverityVisualKey ??
      (typeof task.dueSeverityVisual === "string" ? task.dueSeverityVisual : task.dueSeverityVisual?.key);
    if (keyFromApi) {
      return `due-${String(keyFromApi).toLowerCase()}`;
    }

    // 2) Fallback: simple Berechnung aus endDatum (Kalendertage)
    const end = task.endDatum ? new Date(task.endDatum) : null;
    if (!end || isNaN(end.getTime())) return ""; // kein Datum -> keine Klasse

    const today = new Date();
    // nur Datumsteil vergleichen (Mitternacht)
    const toMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.floor(
      (toMidnight(end).getTime() - toMidnight(today).getTime()) / (1000 * 60 * 60 * 24)
    );

    let key = "";
    if (diffDays < 0) key = "overdue";
    else if (diffDays === 0) key = "today";
    else if (diffDays <= 3) key = "soon";
    else if (diffDays <= 7) key = "week";
    else key = "future";

    return `due-${key}`;
  }

  
  
  // Style für Buttons in der Toolbar, wir benutzen den Stil für beide Buttons
  const toolbarButtonStyle = {backgroundColor: "#3b82f6", border: "1px solid #3b82f6", borderRadius: "0.5rem", color: "white", fontSize: "0.8rem", lineHeight: 1.2, padding: "0.4rem 0.6rem", cursor: "pointer", };
  
  // Button-Label abhängig von showDashboard
  const viewToggleLabel = showDashboard ? "Board" : "Dashboard";

  return (
	<div
	  ref={vpRef}
	  className={["board-viewport", edges.left?"at-left":"", edges.right?"at-right":"", edges.top?"at-top":"", edges.bottom?"at-bottom":""].join(" ").trim()}
	>
	  <div className="board-fade-left"  aria-hidden="true" />
	  <div className="board-fade-right" aria-hidden="true" />
	  <div className="board-fade-top"   aria-hidden="true" />
	  <div className="board-container">
	
	  <div style={{ padding: 0, display: "flex", flexDirection: "column", justifyContent: "flex-start", marginTop: 0 }}>

      <style>{`
        :root {
          --bg: #0b1220; --panel: #0f172a; --card: #111827;
          --text: #e5e7eb; --muted: #94a3b8;
          --border: #1f2937; --shadow: rgba(0,0,0,0.35);
          --brand: #3b82f6; --ok: #22c55e; --warn: #f59e0b; --danger: #ef4444; --info: #38bdf8;
          --match-bg: rgba(59,130,246,0.12);
        }
        .toolbar-input, .toolbar-select { padding: 8px; border-radius: 10px; border: 1px solid var(--border); background: var(--card); color: var(--text); }
        .toolbar-input::placeholder { color: var(--muted); }
        .btn-primary { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: white; }
        .btn-ghost { padding: 8px 12px; border-radius: 8px; border: 1px solid #334155; background: transparent; color: #cbd5e1; }
        .col { background: var(--panel); border: 1px solid var(--border); padding: 12px; border-radius: 12px; box-shadow: 0 8px 24px var(--shadow) }
		
        /* Task Card  */
        .task-card { position: relative; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 12px 12px 12px 16px; box-shadow: 0 4px 16px var(--shadow); transition: box-shadow .12s ease, background .18s ease, opacity .18s ease, filter .18s ease; user-select: none; }
        .task-card:hover { box-shadow: 0 10px 24px var(--shadow); }

        /* Search highlighting */
        .task-card.match { box-shadow: 0 0 0 2px var(--brand) inset, 0 8px 24px var(--shadow); background: linear-gradient(0deg, var(--match-bg), var(--card)); }
        .task-card.dim { opacity: .45; filter: grayscale(.5) blur(.2px); }

        /* TaskItem inner layout */
        .row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .meta { font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 6px; min-width: 0; }
        .meta-right { font-size: 12px; color: var(--muted); min-width: 0; display: flex; gap: 12px; align-items: center; }
        .title { color: var(--text); font-size: 14px; font-weight: 700; line-height: 1.2; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .desc { margin: 8px 0 0 0; font-size: 12.5px; color: #cbd5e1; line-height: 1.25; max-width: 460px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* (Status-Pill-Farben sind zentral in TaskStatusTheme.css) */

        /* Search input wrapper */
        .search-wrap { position: relative; display: inline-flex; align-items: center; }
        .search-clear { position: absolute; right: 8px; font-size: 16px; line-height: 1; cursor: pointer; border: none; background: transparent; color: var(--muted); padding: 0 4px; }
        .search-clear:hover { color: var(--text); }
        .toggle { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); user-select: none; }
		
		 /* Soft load spinner*/
		 .soft-spinner { width:16px; height:16px; border:2px solid #999; border-top-color:transparent; border-radius:50%; display:inline-block; animation:spin .8s linear infinite; opacity:.8; margin-left:8px; }
		 @keyframes spin{to{transform:rotate(360deg)}}
			
      `}</style>
	  
	  
	  
	  

	  {/* Toolbar */}
	  <div
	    className="board-toolbar"
	    style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 0, marginTop: 5 }}
	  >
	    {/* LEFT: Suche, Filter, Aktionen */}
	    <div className="toolbar-left" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginLeft: 10 }}>
	      <span className="search-wrap">
	        <input
	          type="text"
	          className="toolbar-input"
	          placeholder="Suchen… (Bezeichnung, Kunde, Teilenummer, Status …)"
	          value={query}
	          onChange={(e) => {
	            const v = e.target.value;
	            setQuery(v);
	            try { localStorage.setItem("taskboard:query", v); } catch { /* ignore */ }
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

		  
		  
		  
		  {/* Neuer Task */}
		  <button
		    style={toolbarButtonStyle}
		    onClick={() => setIsCreateOpen(true)}
		    title="Neuen Task anlegen"
		  >
		    + Neuer Task
		  </button>



		  {/* Toggle Board/Dashboard */}
		  <button
		    style={toolbarButtonStyle}
		    onClick={onToggleDashboard}
		    title={showDashboard ? "Zurück zum Board" : "Auslastung / Engpässe anzeigen"}
		  >
		    {viewToggleLabel}
		  </button>		  
		  
		  

		  {loadingSoft && <span className="soft-spinner" aria-label="Aktualisieren…" />}
	     
		   {hardFilter && queryActive && (
	        <span style={{ fontSize: 12, color: "var(--muted)" }}>
	          Hinweis: Drag & Drop ist bei hartem Filter deaktiviert.
	        </span>
	      )}
	    </div>

		
		
		
	    {/* RIGHT: Einstellungen (rechtsbündig per margin-left:auto) */}
	    <div className="toolbar-right" style={{ marginLeft: "auto", display: "flex", gap: 8, marginRight: 10 }}>
		
		{/* Settings */}
		<button
		  style={toolbarButtonStyle}
		  onClick={() => setOpenSettings(true)}
		  aria-haspopup="dialog"
		  aria-controls="settings-modal"
		  title="Einstellungen"
		>
		  ⚙ Einstellungen
		</button>
		
		
		
	    </div>
	  </div>




      {/* Columns */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="columns-wrap" style={{ alignItems: "flex-start", paddingBottom: 8 }}>
          {orderIds.map((colId) => {
            const title = idToLabel[colId] || colId;
            const list = Array.isArray(columnsById[colId]) ? columnsById[colId] : [];
            const matches = queryActive ? list.filter((t) => matchesQuery(t, q)) : list;
            const visibleList = (hardFilter && queryActive) ? matches : list;
            const matchesInCol = matches.length;
            const totalEffortMins = matches.reduce((sum, t) => sum + getEffortMinutes(t), 0);

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
                        Tasks {queryActive ? `${matchesInCol}/${list.length}` : String(list.length)} | Aufwand {formatEffort(totalEffortMins)}
                      </span>
                    </div>

                    {visibleList.map((t, index) => {
					  const dueKey = keyFromTask(t);
					  const dueCls = dueKey ? `due-${dueKey}` : "";
                      const isMatch = matchesQuery(t, q);

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
                                className={`task-card ${dueCls} ${!hardFilter && queryActive ? (isMatch ? "match" : "dim") : ""}`}
                                style={{
									position: "relative",
                                  ...base,
                                  boxShadow: snapshot.isDragging
                                    ? "0 18px 40px rgba(0,0,0,.35), 0 2px 8px rgba(0,0,0,.25)"
                                    : "0 4px 16px var(--shadow)",
                                  cursor: (hardFilter && queryActive) ? "default" : (snapshot.isDragging ? "grabbing" : "grab"),
                                  marginBottom: 10,
                                }}
                                onDoubleClick={() => openEditModal(t, "details")}
                              >
                                <TaskItem task={t} openAttachmentsModal={(task) => openEditModal(task, "attachments")} />
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
	  
	    </div>
		</div>
		<div className="board-fade-bottom" aria-hidden="true" />
 

      {/* Modals */}
      {isCreateOpen && (
        <TaskCreationModal
          stations={stations.map((s) => ({ id: String(pickStationId(s)), name: pickStationName(s) }))}
		   onTaskCreated={(opts) => {
		     ignoreRefetchUntil.current = Date.now() + 800; // kurz SSE-Refetch ignorieren
		     fetchAll({ mode: "soft" });
		     if (!opts || !opts.keepOpen) setIsCreateOpen(false);
		   }}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {editTask && (
        <TaskEditModal
          task={editTask}
          stations={stations.map((s) => ({ id: String(pickStationId(s)), name: pickStationName(s) }))}
		  
		  onSave={() => {
		    closeEditModal();
		    ignoreRefetchUntil.current = Date.now() + 800;
		    fetchAll({ mode: "soft" });
		   }}
		   
		  onClose={closeEditModal}
		  
		  onDeleted={(id) => {
		    handleTaskDeleted(id);                            // optimistisches Entfernen
		    ignoreRefetchUntil.current = Date.now() + 800;   // SSE-Kollision dämpfen
		    fetchAll({ mode: "soft" });                      // später serverseitig verifizieren
		  }}
		  
          initialTab={editInitialTab}                              // << neu
        />
      )}


	  
	  {openSettings && (
	    <SettingsModal
	      open={openSettings}
	      onClose={() => setOpenSettings(false)}
		     initialTab="stations"
		     stations={stations}   
		     onUpdate={() => fetchAll({ mode: "soft" })} 
	    />
	  )}
	  
	  
	  
    </div>
	
	
  );
}
