// frontend/src/components/TaskBoard.jsx
import React, { useEffect, useRef, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import useToast from "./ui/useToast";
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

function pickStationLabel(rec) {
  return normalizeStationLabel(
    rec?.bezeichnung ??
      rec?.name ??
      rec?.label ??
      rec?.title ??
      rec?.titel ??
      rec?.arbeitsstation ??
      rec?.station ??
      rec?.kurzname ??
      (typeof rec === "string" ? rec : null) ??
      null
  );
}

// Sort helper
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
  try {
    return await res.json();
  } catch {
    return body;
  }
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
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }
}

function buildSortPayload(columns, keys) {
  const out = [];
  const kset = new Set(keys);
  for (const [k, list] of Object.entries(columns)) {
    if (!kset.has(k)) continue;
    (list || []).forEach((t, i) => {
      out.push({ ...t, prioritaet: i });
    });
  }
  return out;
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
  } catch {
    return d;
  }
}

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

// Icons
const Icon = ({ size = 16, stroke = "#9ca3af", path }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flex: "0 0 auto" }}
  >
    {path}
  </svg>
);
const IconTag = (p) => (
  <Icon
    {...p}
    path={
      <g>
        <path d="M20.59 13.41L11 3H4v7l9.59 9.59a2 2 0 0 0 2.82 0l4.18-4.18a2 2 0 0 0 0-2.82z" />
        <circle cx="6.5" cy="6.5" r="1.5" />
      </g>
    }
  />
);
const IconUser = (p) => (
  <Icon
    {...p}
    path={
      <g>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </g>
    }
  />
);
const IconClock = (p) => (
  <Icon
    {...p}
    path={
      <g>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </g>
    }
  />
);
const IconCalendar = (p) => (
  <Icon
    {...p}
    path={
      <g>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </g>
    }
  />
);
const IconBriefcase = (p) => (
  <Icon
    {...p}
    path={<path d="M20 7h-5V6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v1H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />}
  />
);

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
          } catch {}
        }

        const labels = {};
        for (const raw of stations) {
          const k = normalizeStationLabel(raw);
          if (!labels[k]) labels[k] = String(raw).trim();
        }
        for (const t of tasks) {
          const raw = t?.arbeitsstation ?? "Unassigned";
          const k = normalizeStationLabel(raw);
          if (!labels[k]) labels[k] = String(raw).trim();
        }

        const grouped = {};
        for (const t of tasks) {
          const raw = t?.arbeitsstation ?? "Unassigned";
          const key = normalizeStationLabel(raw);
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(t);
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

  // DnD Ende (mit „schieben“-Animation im Style unten)
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
    } catch (e) {
      toast.error("Konnte neue Reihenfolge nicht speichern.");
      setColumns((prev) => ({ ...prev })); // no-op trigger
    }
  }

  // Save / Delete aus Modals
  const handleSaved = async (saved) => {
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
      actions: [
        {
          label: "Rückgängig",
          onClick: () => {
            clearTimeout(timeout);
            toast.dismiss(toastId);
            const info = pendingRef.current.get(task.id);
            if (!info) return;
            setColumns((prev) => {
              const draft = { ...prev };
              const list = [...(draft[info.key] || [])];
              list.splice(info.index, 0, info.task);
              draft[info.key] = list;
              return draft;
            });
            pendingRef.current.delete(task.id);
          },
        },
      ],
    });

    const timeout = setTimeout(async () => {
      toast.dismiss(toastId);
      try {
        await deleteTaskServer(task.id);
        pendingRef.current.delete(task.id);
        toast.success("Endgültig gelöscht.");
      } catch (e) {
        toast.error("Löschen fehlgeschlagen.");
      }
    }, UNDO_MS);

    pendingRef.current.set(task.id, { timeout, key, index, task });
  };

  if (loading) return <p style={{ padding: 16, color: "#cbd5e1", background: "#0b1220", minHeight: "100vh" }}>lade…</p>;
  if (err)
    return (
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
          --bg: #0b1220; --panel: #0f172a; --card: #111827; --card-2: #0b1220;
          --text: #e5e7eb; --muted: #94a3b8; --border: #1f2937; --shadow: rgba(0,0,0,0.35);
          --brand: #3b82f6; --ok: #22c55e; --warn: #f59e0b; --danger: #ef4444; --info: #38bdf8; --match-bg: rgba(59,130,246,0.12);
        }
        .toolbar-input, .toolbar-select { padding: 8px; border-radius: 8px; border: 1px solid var(--border); background: var(--card); color: var(--text); }
        .toolbar-input::placeholder { color: var(--muted); }
        .btn-primary { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: white; }
        /* Spalten nebeneinander (Patch #1) */
        .cols-row { display: flex; gap: 16px; align-items: flex-start; overflow-x: auto; padding-bottom: 8px; }
        .cols-row::-webkit-scrollbar { height: 8px; }
        .cols-row::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 8px; }
        .col { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 8px 24px var(--shadow) }
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
        <input
          type="text"
          className="toolbar-input"
          placeholder="Filtern… (Bezeichnung, Kunde, Teilenummer …)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ minWidth: 220 }}
        />
        <select
          className="toolbar-select"
          value={stationFilter}
          onChange={(e) => setStationFilter(e.target.value)}
          aria-label="Nach Arbeitsstation filtern"
        >
          <option value="ALL">Alle Stationen</option>
          {allStationKeys.map((k) => (
            <option key={k} value={k}>
              {labelByKey[k]}
            </option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        {q && <span className="badge">Treffer gehighlighted, andere gedimmt</span>}
        <button onClick={() => setIsCreateOpen(true)} className="btn-primary">
          + Neue Aufgabe
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        {/* Spalten nebeneinander (Patch #1) */}
        <div className="cols-row">
          {visibleStationKeys.map((key) => {
            const title = labelByKey[key];
            const list = columns[key] || [];

            const matchesInCol = q ? list.filter((t) => matchesQuery(t, q)).length : list.length;

            const totalHoursRaw = list.reduce((acc, t) => acc + (Number(t?.aufwandStunden) || 0), 0);
            const totalHours = Math.round(totalHoursRaw * 10) / 10;

            const matchedHoursRaw = q
              ? list.filter((t) => matchesQuery(t, q)).reduce((acc, t) => acc + (Number(t?.aufwandStunden) || 0), 0)
              : totalHoursRaw;
            const matchedHours = Math.round(matchedHoursRaw * 10) / 10;

            return (
              <Droppable droppableId={key} key={key}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="col"
                    /* feste Spaltenbreite (Patch #1B) */
                    style={{ padding: 12, minHeight: 80, minWidth: 320, width: 360, flex: "0 0 auto" }}
                  >
                    <div className="col-head">
                      <h2>{title}</h2>
                      {/* Head rechts: Tasks | Aufwand */}
                      <div className="stats">
                        <span>Tasks {q ? `${matchesInCol}/${list.length}` : `${list.length}`}</span>
                        <span className="sep">|</span>
                        <span>Aufwand {q ? `${matchedHours}/${totalHours}h` : `${totalHours}h`}</span>
                      </div>
                    </div>

                    {list.map((t, index) => {
                      const isMatch = q ? matchesQuery(t, q) : true;
                      const dueInfo = (() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (!t.endDatum) return { color: "#94a3b8", border: "#1f2937" };
                        const d = new Date(t.endDatum);
                        d.setHours(0, 0, 0, 0);
                        if (d < today) return { color: "#fca5a5", border: "#7f1d1d" }; // überfällig
                        if (+d === +today) return { color: "#fde68a", border: "#7a5d0a" }; // heute
                        return { color: "#a7f3d0", border: "#1f2937" }; // zukünftig
                      })();
                      const stTone = (() => {
                        const s = String(t.status || "").toUpperCase();
                        if (s.includes("DONE") || s.includes("ERLEDIGT")) return { cls: "ok", label: "DONE" };
                        if (s.includes("PROG")) return { cls: "info", label: "IN PROGRESS" };
                        if (s.includes("NEU") || s.includes("NEW")) return { cls: "warn", label: "NEU" };
                        return { cls: "warn", label: s || "TO DO" };
                      })();

                      return (
                        <Draggable draggableId={t.id.toString()} index={index} key={t.id}>
                          {(dProvided, snapshot) => {
                            const base = dProvided.draggableProps.style || {};
                            // „schieben“-Gefühl (Patch #3)
                            const composedTransform = `${base.transform || ""}${
                              snapshot.isDragging ? " perspective(900px) rotateX(5deg) scale(1.01) translateZ(0)" : ""
                            }`;
                            return (
                              <div
                                ref={dProvided.innerRef}
                                {...dProvided.draggableProps}
                                {...dProvided.dragHandleProps}
                                tabIndex={0}
                                className={`task-card ${q ? (isMatch ? "match" : "dim") : ""}`}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setEditTask(t);
                                  }
                                }}
                                // Doppelklick statt Single-Klick (Patch #2)
                                onDoubleClick={() => setEditTask(t)}
                                style={{
                                  ...base,
                                  transform: composedTransform,
                                  border: `2px solid ${dueInfo.border}`,
                                  cursor: snapshot.isDragging ? "grabbing" : "grab",
                                  boxShadow: snapshot.isDragging
                                    ? "0 18px 40px rgba(0,0,0,.35), 0 2px 8px rgba(0,0,0,.25)"
                                    : "0 4px 16px var(--shadow, rgba(0,0,0,.35))",
                                }}
                              >
                                {/* Titel */}
                                <h4 className="title">{t.bezeichnung ?? t.titel ?? "(ohne Bezeichnung)"}</h4>

                                {/* Zeile 1: Teilenummer | Kunde */}
                                <div className="row" style={{ marginBottom: 6 }}>
                                  <div className="meta" title={t.teilenummer || "-"}>
                                    <IconTag />
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {t.teilenummer || "-"}
                                    </span>
                                  </div>
                                  <div className="meta" title={t.kunde || "-"} style={{ justifyContent: "flex-end" }}>
                                    <IconBriefcase />
                                    <span className="meta-right">{t.kunde || "-"}</span>
                                  </div>
                                </div>

                                {/* Zeile 2: Zuständig | Aufwand */}
                                <div className="row" style={{ marginBottom: 6 }}>
                                  <div className="meta" title={t.zuständig || "offen"}>
                                    <IconUser />
                                    <span>{t.zuständig || "offen"}</span>
                                  </div>
                                  <div className="meta" title={`${t.aufwandStunden || 0}h`}>
                                    <IconClock />
                                    <span>{t.aufwandStunden ? `${t.aufwandStunden}h` : "0h"}</span>
                                  </div>
                                </div>

                                {/* Zeile 3: Datum links | Status rechts */}
                                <div className="row">
                                  {t.endDatum ? (
                                    <div className="meta" title={formatDate(t.endDatum)} style={{ color: dueInfo.color }}>
                                      <IconCalendar />
                                      <span style={{ color: dueInfo.color }}>{formatDate(t.endDatum)}</span>
                                    </div>
                                  ) : (
                                    <div />
                                  )}
                                  <span className={`pill ${stTone.cls}`} title={`Status: ${stTone.label}`}>
                                    {stTone.label}
                                  </span>
                                </div>

                                {/* Zusatzinfos */}
                                {(t["zusätzlicheInfos"] ?? t.zusatzlicheInfos) && (
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
        onCreated={(newTask) => {
          const k = normalizeStationLabel(newTask?.arbeitsstation ?? "Unassigned");
          setColumns((prev) => {
            const draft = { ...prev };
            draft[k] = sortByPriorityThenId([...(draft[k] || []), newTask]);
            return draft;
          });
          const raw = newTask?.arbeitsstation ?? "Unassigned";
          setLabelByKey((prev) => {
            const kk = normalizeStationLabel(raw);
            if (prev[kk]) return prev;
            return { ...prev, [kk]: String(raw).trim() };
          });
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
