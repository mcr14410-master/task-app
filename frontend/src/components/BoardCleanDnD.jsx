// src/components/BoardCleanDnD.jsx
import React, { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

// ---- Helpers ----
function normalizeStationLabel(v) {
  const s = String(v ?? "Unassigned");
  return s
    .replace(/\u00A0/g, " ")                 // NBSP -> Space
    .replace(/[\u200B-\u200D\uFEFF]/g, "")   // Zero-width entfernen
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

// nur beim Initial-Load sortieren
const sortTasksInitial = (arr) =>
  [...arr].sort((a, b) => {
    const pa = Number.isFinite(a?.prioritaet) ? a.prioritaet : 999999;
    const pb = Number.isFinite(b?.prioritaet) ? b.prioritaet : 999999;
    if (pa !== pb) return pa - pb;
    return (a?.id ?? 0) - (b?.id ?? 0);
  });

// Backend: Einzelupdate
async function updateTaskServer(id, body) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  try {
    return await res.json();
  } catch {
    return body;
  }
}

// Backend: Bulk-Sort
async function bulkSortServer(payload) {
  const res = await fetch(`/api/tasks/sort`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
}

// Payload für /sort: aktuelle Reihenfolge -> prioritaet = Index
function buildSortPayload(state, keys) {
  const payload = [];
  for (const k of keys) {
    const list = state[k] || [];
    list.forEach((t, idx) => payload.push({ ...t, prioritaet: idx }));
  }
  return payload;
}

// Mögliche Feldnamen aus /api/arbeitsstationen erkennen
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

// ---- Component ----
export default function BoardCleanDnD() {
  // columns: { [normKey]: Task[] }
  const [columns, setColumns] = useState({});
  // labelByKey: { [normKey]: Original-Label (für Titel & Backend) }
  const [labelByKey, setLabelByKey] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [showDebug, setShowDebug] = useState(true);
  const [apiStations, setApiStations] = useState([]); // reine Label-Liste aus /arbeitsstationen

  // Daten laden: Tasks + Stations
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // beide Endpunkte parallel
        const [tasksRes, stationsRes] = await Promise.allSettled([
          fetch("/api/tasks", { headers: { Accept: "application/json" } }),
          fetch("/api/arbeitsstationen", { headers: { Accept: "application/json" } }),
        ]);

        // Tasks lesen
        let tasks = [];
        if (tasksRes.status === "fulfilled") {
          const text = await tasksRes.value.text();
          try {
            const json = JSON.parse(text);
            tasks = Array.isArray(json)
              ? json
              : Array.isArray(json?.content) ? json.content
              : Array.isArray(json?.items)   ? json.items
              : [];
          } catch {
            throw new Error("Antwort von /api/tasks ist kein JSON.");
          }
        } else {
          throw new Error(`Fehler bei /api/tasks: ${String(tasksRes.reason)}`);
        }

        // Stations lesen (optional; wenn fehlschlägt, machen wir tasks-only)
        let stations = [];
        if (stationsRes.status === "fulfilled" && stationsRes.value.ok) {
          try {
            const stText = await stationsRes.value.text();
            const stJson = JSON.parse(stText);
            const arr = Array.isArray(stJson)
              ? stJson
              : Array.isArray(stJson?.content) ? stJson.content
              : Array.isArray(stJson?.items)   ? stJson.items
              : [];
            stations = arr
              .map(pickStationLabel)
              .filter(Boolean)
              .map((s) => String(s));
          } catch {
            // ignorieren; stations bleiben []
          }
        }
        if (alive) setApiStations(stations);

        // 1) labelByKey aus Stations (falls vorhanden) + aus Tasks aufbauen
        const labels = {};
        // aus Stations
        for (const raw of stations) {
          const key = normalizeStationLabel(raw);
          if (!labels[key]) labels[key] = String(raw).trim();
        }
        // aus Tasks
        for (const t of tasks) {
          const raw = t?.arbeitsstation ?? "Unassigned";
          const key = normalizeStationLabel(raw);
          if (!labels[key]) labels[key] = String(raw).trim();
        }
        if (!labels["Unassigned"]) labels["Unassigned"] = "Unassigned";

        // 2) columns aus Tasks gruppieren
        const grouped = {};
        for (const t of tasks) {
          const raw = t?.arbeitsstation ?? "Unassigned";
          const key = normalizeStationLabel(raw);
          (grouped[key] ||= []).push(t);
        }
        // initial sortieren
        for (const k of Object.keys(grouped)) grouped[k] = sortTasksInitial(grouped[k]);

        // 3) Leere Spalten für jede Station aus API ergänzen
        for (const key of Object.keys(labels)) {
          if (!grouped[key]) grouped[key] = [];
        }

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

  // DnD: Optimistic + Persistenz
  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const prev =
      typeof structuredClone === "function"
        ? structuredClone({ columns, labelByKey })
        : { columns: JSON.parse(JSON.stringify(columns)), labelByKey: { ...labelByKey } };

    const fromKey = source.droppableId;            // normalisiert
    const toKey   = destination.droppableId;       // normalisiert
    const toLabel = labelByKey[toKey] ?? toKey;    // hübscher Name Richtung Backend

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
      console.error("Persistenz fehlgeschlagen:", e);
      alert("Speichern fehlgeschlagen – Änderung wird zurückgenommen.");
      setColumns(prev.columns);
      setLabelByKey(prev.labelByKey);
    }
  };

  if (loading) return <p style={{ padding: 16 }}>lade…</p>;
  if (err)
    return (
      <pre style={{ whiteSpace: "pre-wrap", color: "red", padding: 16 }}>
        Fehler: {err}
      </pre>
    );

  const stationKeys = Object.keys(labelByKey).sort((a, b) => a.localeCompare(b));
  const debugStationsApi = apiStations.join(", ") || "—";

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Board (Drag & Drop mit Persistenz)</h1>
        <label style={{ fontSize: 12, color: "#6b7280", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showDebug}
            onChange={() => setShowDebug((v) => !v)}
            style={{ marginRight: 6 }}
          />
          Debug
        </label>
        {showDebug && (
          <>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Stations aus API: {debugStationsApi}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Spalten: {stationKeys.length} →
              {" "}
              {stationKeys.map((k) => `${labelByKey[k]} (${(columns[k]||[]).length})`).join(" | ")}
            </div>
          </>
        )}
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
    </div>
  );
}
