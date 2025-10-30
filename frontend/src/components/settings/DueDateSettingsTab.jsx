// frontend/src/components/settings/DueDateSettingsTab.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";

/**
 * DueDateSettingsTab – schlanke UX:
 * - Aktionen: + Bucket, Zurücksetzen (vom Server laden), Speichern
 * - DnD-Sortierung, Range-Hinweis, ∞-Buttons, Farbchip (Text in Bucket-Farbe)
 * - API bleibt: GET/PUT /api/settings/dueDate
 */

export default function DueDateSettingsTab() {
  const [buckets, setBuckets] = useState(DEFAULT_BUCKETS);
  const [dirtyBuckets, setDirtyBuckets] = useState(DEFAULT_BUCKETS);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  // DnD-State
  const [dragKey, setDragKey] = useState(null);
  const [dragOverKey, setDragOverKey] = useState(null);
  const dragIndexRef = useRef(-1);

  // Initial Load
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/settings/dueDate");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        const fromApi = mapFromApi(data).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        if (!alive) return;
        setBuckets(fromApi);
        setDirtyBuckets(fromApi);
        setTouched(false);
      } catch (e) {
        setError("Konnte DueDate-Einstellungen nicht laden – verwende Default-Konfiguration.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Anzeige sortiert nach sortOrder, dann key (Hook VOR early return!)
  const view = useMemo(() => {
    const copy = Array.isArray(dirtyBuckets) ? [...dirtyBuckets] : [];
    return copy.sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.key).localeCompare(String(b.key))
    );
  }, [dirtyBuckets]);
  
  
  // Validation (memoisiert für Buttons/Fehleranzeige)
  const validation = useMemo(() => validateBuckets(dirtyBuckets), [dirtyBuckets]);
  const hasErrors = validation.errors.length > 0;

  if (loading) {
    return (
      <section role="tabpanel" aria-label="Fälligkeit">
        <h3 style={{ margin: "8px 0 12px 0" }}>Fälligkeit – Buckets</h3>
        <div style={{ color: "#9ca3af" }}>Lade Einstellungen…</div>
      </section>
    );
  }

  // Actions
  const addBucket = () => {
    const baseKey = "custom";
    let idx = 1;
    const existing = new Set(dirtyBuckets.map(b => b.key));
    let key = `${baseKey}-${idx}`;
    while (existing.has(key)) key = `${baseKey}-${++idx}`;
    const maxOrder = dirtyBuckets.reduce((m, b) => Math.max(m, Number(b.sortOrder || 0)), 0);
    const newB = { key, label: "Neuer Bucket", min: 8, max: 14, color: "#22c55e", fixed: false, role: "ok", sortOrder: maxOrder + 10 };
    setDirtyBuckets(prev => [...prev, newB]);
    setTouched(true);
    setInfo(null);
  };

  const removeBucket = (key) => {
    setDirtyBuckets(prev => prev.filter(b => b.key !== key));
    setTouched(true);
    setInfo(null);
  };

  const updateBucket = (index, patch) => {
    setDirtyBuckets(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
    setTouched(true);
    setInfo(null);
  };

  const resetFromServer = async () => {
    try {
      setLoading(true);
      setError(null);
      setInfo(null);
      const res = await fetch("/api/settings/dueDate");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const fromApi = mapFromApi(data).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setBuckets(fromApi);
      setDirtyBuckets(fromApi);
      setTouched(false);
      setInfo("Zurückgesetzt (Serverzustand geladen).");
      window.dispatchEvent(new CustomEvent("due-settings-updated"));
    } catch (e) {
      setError("Zurücksetzen fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  const saveToServer = async () => {
	 const validationNow = validateBuckets(dirtyBuckets);
	 const hasErrorsNow = validationNow.errors.length > 0;
      if (hasErrorsNow) {
      setInfo(null);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setInfo(null);
      const payload = mapToApi(sortForSave(dirtyBuckets));
      const res = await fetch("/api/settings/dueDate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = "Speichern fehlgeschlagen.";
        try {
          const t = await res.text();
          if (t) msg = `Speichern fehlgeschlagen: ${t}`;
        } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      const fromApi = mapFromApi(data).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setBuckets(fromApi);
      setDirtyBuckets(fromApi);
      setTouched(false);
      setInfo("Gespeichert.");
      window.dispatchEvent(new CustomEvent("due-settings-updated"));
    } catch (e) {
      setError(e?.message || "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };



  // DnD-Handler
  function onDragStartRow(key, idx) {
    setDragKey(key);
    dragIndexRef.current = idx;
  }
  function onDragOverRow(e, overKey) {
    e.preventDefault();
    if (dragOverKey !== overKey) setDragOverKey(overKey);
  }
  function onDragEndOrLeave() {
    setDragOverKey(null);
  }
  function onDropRow(e, overKey) {
    e.preventDefault();
    setDragOverKey(null);
    if (!dragKey || dragKey === overKey) { setDragKey(null); return; }

    const current = [...view]; // schon sortiert
    const from = current.findIndex(s => s.key === dragKey);
    const to   = current.findIndex(s => s.key === overKey);
    if (from < 0 || to < 0) { setDragKey(null); return; }

    const moved = current.splice(from, 1)[0];
    current.splice(to, 0, moved);

    // sortOrder neu verteilen (10er Schritte)
    const next = current.map((b, i) => ({ ...b, sortOrder: (i + 1) * 10 }));
    const mapOrder = new Map(next.map(b => [b.key, b.sortOrder]));
    setDirtyBuckets(prev => prev.map(b => mapOrder.has(b.key) ? { ...b, sortOrder: mapOrder.get(b.key) } : b));
    setTouched(true);
    setInfo("Reihenfolge geändert (lokal).");
    setDragKey(null);
  }

  return (
    <section role="tabpanel" aria-label="Fälligkeit">
      <h3 style={{ margin: "8px 0 12px 0" }}>Fälligkeit – Buckets</h3>

      {error && <div style={errorBox}>{error}</div>}
      {info && !error && <div style={infoBox}>{info}</div>}

      {/* Actions – nur noch +Bucket, Zurücksetzen, Speichern */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={addBucket} style={btnSecondary} title="Neuen Bucket hinzufügen">+ Bucket</button>
        <button onClick={resetFromServer} style={btnGhost} title="Änderungen verwerfen und vom Server laden">
          Zurücksetzen
        </button>
        <button
          onClick={saveToServer}
          style={{ ...btnPrimary, opacity: hasErrors || (!touched && !error) ? 0.6 : 1, pointerEvents: hasErrors || (!touched && !error) ? "none" : "auto" }}
          title={hasErrors ? "Bitte Fehler korrigieren" : "Änderungen speichern"}
        >
          {saving ? "Speichern…" : "Speichern"}
        </button>
      </div>

      {validation.errors.length > 0 && (
        <div style={errorBox}>
          <strong style={{ display: "block", marginBottom: 6 }}>Fehler:</strong>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {validation.errors.map((e, idx) => (<li key={idx}>{e.msg}</li>))}
          </ul>
        </div>
      )}
      {validation.warnings.length > 0 && validation.errors.length === 0 && (
        <div style={warnBox}>
          <strong style={{ display: "block", marginBottom: 6 }}>Hinweise:</strong>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {validation.warnings.map((w, idx) => (<li key={idx}>{w.msg}</li>))}
          </ul>
        </div>
      )}

      {/* Table (mit DnD wie AdditionalWorks) */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #555" }}>
            <th style={th}>⠿</th>
            <th style={th}>Sort</th>
            <th style={th}>Key</th>
            <th style={th}>Label</th>
            <th style={th}>Min</th>
            <th style={th}>Max</th>
            <th style={th}>Range</th>
            <th style={th}>Farbe</th>
            <th style={th}>Role</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {view.map((b, i) => {
            const fixed = !!b.fixed;
            const color = b.color || "#999999";
            const minDisabled = fixed && b.key === "today";
            const maxDisabled = fixed;
            const keyDisabled = fixed;
            const labelDisabled = false;
            const roleDisabled = b.key === "overdue";
            const rangeHint = formatRange(b.min, b.max);
            const colorValid = isValidColor(color);
            const chipStyle = colorChipStyle(color);

            const isDragging = dragKey === b.key;
            const isOver = dragOverKey === b.key && dragKey && dragKey !== b.key;

            return (
              <tr
                key={b.key}
                draggable
                onDragStart={() => onDragStartRow(b.key, i)}
                onDragOver={(e) => onDragOverRow(e, b.key)}
                onDrop={(e) => onDropRow(e, b.key)}
                onDragEnd={onDragEndOrLeave}
                onDragLeave={onDragEndOrLeave}
                style={{
                  borderBottom: "1px solid #ffffff11",
                  background: isOver ? "#ffffff0f" : (isDragging ? "#ffffff08" : "transparent"),
                  outline: isOver ? "2px dashed #ffffff44" : "none",
                  transition: "background 120ms ease",
                }}
              >
                {/* Drag Handle */}
                <td style={{ ...td, width: 10, cursor: "grab", opacity: .9 }} title="Ziehen zum Sortieren">⠿</td>

                {/* Sort */}
                <td style={{ ...td, width: 50, }}>
				<div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <input
                    type="number"
                    value={b.sortOrder ?? ""}
                    onChange={(e) => updateBucket(i, { sortOrder: parseIntOrZero(e.target.value) })}
                    style={input(false)}
                    title="Sortierreihenfolge"
                  />
				  </div>
                </td>

                {/* Key */}
                <td style={td}>
                  <input
                    type="text"
                    value={b.key}
                    disabled={keyDisabled}
                    onChange={(e) => updateBucket(i, { key: e.target.value.trim() })}
                    style={input(keyDisabled)}
                    placeholder="z. B. soon-14"
                  />
                </td>

                {/* Label */}
                <td style={td}>
                  <input
                    type="text"
                    value={b.label || ""}
                    disabled={labelDisabled}
                    onChange={(e) => updateBucket(i, { label: e.target.value })}
                    style={input(labelDisabled)}
                    placeholder="Anzeigename"
                  />
                </td>

                {/* Min */}
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="number"
                      value={b.min ?? ""}
                      disabled={minDisabled}
                      onChange={(e) => {
                        const v = e.target.value === "" ? undefined : Number(e.target.value);
                        updateBucket(i, { min: Number.isNaN(v) ? undefined : v });
                      }}
                      style={input(minDisabled)}
                      placeholder="-∞"
                    />
                    {!minDisabled && (
                      <button
                        type="button"
                        onClick={() => updateBucket(i, { min: undefined })}
                        style={miniBtn}
                        title="Min auf -∞ setzen"
                      >
                        ∞
                      </button>
                    )}
                  </div>
                </td>

                {/* Max */}
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="number"
                      value={b.max ?? ""}
                      disabled={maxDisabled}
                      onChange={(e) => {
                        const v = e.target.value === "" ? undefined : Number(e.target.value);
                        updateBucket(i, { max: Number.isNaN(v) ? undefined : v });
                      }}
                      style={input(maxDisabled)}
                      placeholder="+∞"
                    />
                    {!maxDisabled && (
                      <button
                        type="button"
                        onClick={() => updateBucket(i, { max: undefined })}
                        style={miniBtn}
                        title="Max auf +∞ setzen"
                      >
                        ∞
                      </button>
                    )}
                  </div>
                </td>

                {/* Range hint */}
                <td style={{ ...td, color: "#9ca3af", fontFamily: "monospace" }}>
                  {rangeHint}
                </td>

                {/* Color (Text in Bucket-Farbe, dunkler Hintergrund) */}
                <td style={td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={chipStyle} title={color}>
                      Aa
                    </div>
                    <input
                      type="color"
                      value={safeHex(color)}
                      onChange={(e) => updateBucket(i, { color: e.target.value })}
                      style={{ width: 28, height: 28, padding: 0, border: "1px solid #555", borderRadius: 6, background: "#222" }}
                      title="Picker (setzt Hex)"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => updateBucket(i, { color: e.target.value })}
                      style={{
                        ...input(false),
                        borderColor: colorValid ? "#444" : "#b91c1c",
                        outline: colorValid ? "none" : "1px solid #b91c1c",
                      }}
                      placeholder="#RRGGBB oder rgb(...)"
                      title="Hex (#RRGGBB) oder rgb/rgba(...)"
                    />
                  </div>
                </td>

                {/* Role */}
                <td style={td}>
                  <select
                    value={b.role || "ok"}
                    disabled={roleDisabled}
                    onChange={(e) => updateBucket(i, { role: e.target.value })}
                    style={input(roleDisabled)}
                    title="Visual-Gruppierung"
                  >
                    <option value="overdue">overdue</option>
                    <option value="warn">warn</option>
                    <option value="ok">ok</option>
                  </select>
                </td>

                {/* Remove */}
                <td style={{ ...td, textAlign: "right" }}>
                  {!fixed && (
                    <button onClick={() => removeBucket(b.key)} style={btnDanger} title="Bucket entfernen">
                      Entfernen
                    </button>
                  )}
                </td>
              </tr>
            );
          })}

          {view.length === 0 && (
            <tr>
              <td style={td} colSpan={10}><em>Keine Einträge.</em></td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ fontSize: 12, color: "var(--muted,#9ca3af)", marginTop: 6 }}>
        Tipp: Ziehe die Zeilen mit „⠿“, um die Sortierung zu ändern. Speichern nicht vergessen.
      </div>

      {/* Hinweis */}
      <div style={{ marginTop: 16, fontSize: 13, color: "#9ca3af", background: "rgba(255,255,255,0.04)", padding: 12, borderRadius: 8 }}>
        <p style={{ margin: 0 }}>
          <strong>Hinweis:</strong> „Überfällig“ (&lt;0) und „Heute“ (=0) sind fixe Bereiche (nur Farbe/Label anpassbar).
          Weitere Buckets sind frei definierbar. Bereiche dürfen sich nicht überlappen; Lücken sind erlaubt.
        </p>
        <p style={{ margin: "8px 0 0 0" }}>
          Änderungen speichern → Styles werden live neu injiziert (Event <code>due-settings-updated</code>).
        </p>
      </div>
    </section>
  );
}

/* ---------- Defaults & Validation ---------- */

const DEFAULT_BUCKETS = [
  { key: "overdue", label: "Überfällig", min: undefined, max: -1, color: "#ef4444", fixed: true, role: "overdue", sortOrder: 10 },
  { key: "today",   label: "Heute",      min: 0,        max: 0,  color: "#f5560a", fixed: true, role: "warn",    sortOrder: 20 },
  { key: "soon",    label: "Bald",       min: 1,        max: 3,  color: "#facc15", fixed: false, role: "warn",   sortOrder: 30 },
  { key: "week",    label: "Woche",      min: 4,        max: 7,  color: "#0ea5e9", fixed: false, role: "ok",     sortOrder: 40 },
  { key: "future",  label: "Zukunft",    min: 8,        max: undefined, color: "#94a3b8", fixed: false, role: "ok", sortOrder: 50 },
];

function sortForSave(list) {
  // Leere SortOrders in 10er-Schritten auffüllen (stabil)
  let acc = 10;
  const copy = [...list].map(b => ({ ...b }));
  copy.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  for (const b of copy) {
    if (!b.sortOrder) { b.sortOrder = acc; acc += 10; }
  }
  return copy;
}

function validateBuckets(dirtyBuckets) {
  const errors = [];
  const warnings = [];

  const keyRegex = /^[a-z0-9-]+$/;
  const seen = new Set();
  dirtyBuckets.forEach((b) => {
    if (!b.key || !keyRegex.test(b.key)) errors.push({ field: "key", msg: `Key '${b.key || ""}' muss ^[a-z0-9-]+$ entsprechen.` });
    if (seen.has(b.key)) errors.push({ field: "key", msg: `Key '${b.key}' ist nicht eindeutig.` });
    seen.add(b.key);

    if (!isValidColor(b.color || "")) {
      errors.push({ field: "color", msg: `Farbe für '${b.key}' ist ungültig (Hex oder rgb/rgba).` });
    }
  });

  const overdue = dirtyBuckets.find(b => b.key === "overdue");
  const today = dirtyBuckets.find(b => b.key === "today");
  if (!overdue) errors.push({ field: "range", msg: "Pflicht-Bucket 'overdue' fehlt." });
  if (!today) errors.push({ field: "range", msg: "Pflicht-Bucket 'today' fehlt." });
  if (overdue && !(overdue.min === undefined && overdue.max === -1)) errors.push({ field: "range", msg: "overdue: Bereich ist fix (<0)." });
  if (today && !(today.min === 0 && today.max === 0)) errors.push({ field: "range", msg: "today: Bereich ist fix (=0)." });

  const intervals = dirtyBuckets.map(b => ({ key: b.key, min: b.min, max: b.max }));
  const toBounds = (min, max) => ({
    lo: min === undefined ? -Infinity : Number(min),
    hi: max === undefined ? Infinity : Number(max),
  });
  for (let a = 0; a < intervals.length; a++) {
    for (let b = a + 1; b < intervals.length; b++) {
      const A = toBounds(intervals[a].min, intervals[a].max);
      const B = toBounds(intervals[b].min, intervals[b].max);
      const overlaps = !(A.hi < B.lo || B.hi < A.lo);
      if (overlaps) {
        errors.push({ field: "range", msg: `Bereichs-Überschneidung zwischen '${intervals[a].key}' und '${intervals[b].key}'.` });
      }
    }
  }

  // optionale Lückenhinweise
  const sorted = [...intervals].sort((a, b) => {
    const alo = a.min === undefined ? -Infinity : Number(a.min);
    const blo = b.min === undefined ? -Infinity : Number(b.min);
    return alo - blo;
  });
  for (let i = 0; i < sorted.length - 1; i++) {
    const A = toBounds(sorted[i].min, sorted[i].max);
    const B = toBounds(sorted[i + 1].min, sorted[i + 1].max);
    if (A.hi + 1 < B.lo) warnings.push({ field: "range", msg: `Lücke zwischen ${sorted[i].key} und ${sorted[i + 1].key}.` });
  }

  return { errors, warnings };
}

/* ---------- Mapping API <-> UI ---------- */

function mapFromApi(api) {
  const list = Array.isArray(api?.buckets) ? api.buckets : [];
  return list.map(b => ({
    key: b.key ?? "",
    label: b.label ?? "",
    min: b.min ?? undefined,
    max: b.max ?? undefined,
    color: b.color ?? "#94a3b8",
    fixed: !!b.fixed,
    role: b.role ?? "ok",
    sortOrder: b.sortOrder ?? 0,
  }));
}

function mapToApi(localBuckets) {
  return {
    buckets: localBuckets.map(b => ({
      key: b.key,
      label: b.label,
      min: b.min === undefined || b.min === "" ? null : Number(b.min),
      max: b.max === undefined || b.max === "" ? null : Number(b.max),
      color: b.color,
      fixed: !!b.fixed,
      role: b.role || "ok",
      sortOrder: Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 0,
    })),
  };
}

/* ---------- Styles ---------- */

const th = { textAlign: "left", padding: "6px 8px" };
const td = { padding: "10px 8px", verticalAlign: "middle" };

const input = (disabled) => ({
  width: "100%",
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid #444",
  background: disabled ? "#202020" : "#1a1a1a",
  color: "#e5e7eb",
  outline: "none",
});

const btnBase = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #ffffff22",
  background: "#ffffff14",
  color: "#e5e7eb",
  cursor: "pointer",
};
const btnSecondary = { ...btnBase };
const btnNeutral   = { ...btnBase, background: "#334155", border: "1px solid #1f2937" };
const btnGhost     = { ...btnBase, background: "transparent" };
const btnPrimary   = { ...btnBase, background: "#3b82f6", border: "1px solid #2563eb" };
const btnDanger    = { ...btnBase, background: "#ef4444", border: "1px solid #dc2626" };
const miniBtn = {
  padding: "2px 8px",
  borderRadius: 8,
  border: "1px solid #ffffff22",
  background: "transparent",
  color: "#e5e7eb",
  cursor: "pointer",
};

const errorBox = {
  marginBottom: 12,
  padding: 10,
  borderRadius: 8,
  background: "rgba(239,68,68,0.10)",
  border: "1px solid rgba(239,68,68,0.35)",
  color: "#fecaca",
};
const warnBox = {
  marginBottom: 12,
  padding: 10,
  borderRadius: 8,
  background: "rgba(250,204,21,0.10)",
  border: "1px solid rgba(250,204,21,0.35)",
  color: "#fde68a",
};
const infoBox = {
  marginBottom: 12,
  padding: 10,
  borderRadius: 8,
  background: "rgba(59,130,246,0.10)",
  border: "1px solid rgba(59,130,246,0.35)",
  color: "#bfdbfe",
};

/* ---------- Utils ---------- */

function formatRange(min, max) {
  const hasMin = min !== null && min !== undefined;
  const hasMax = max !== null && max !== undefined;
  if (!hasMin && hasMax) return `< 0`.replace("0", String(max + 1)); // (…,-1] => <0
  if (hasMin && hasMax && min === 0 && max === 0) return "= 0";
  if (hasMin && hasMax) return `${min}–${max}`;
  if (hasMin && !hasMax) return `≥ ${min}`;
  return "alle";
}

function parseIntOrZero(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

function isValidColor(c) {
  if (typeof c !== "string") return false;
  const s = c.trim();
  if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(s)) return true;
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i.test(s)) return true;
  return false;
}

function safeHex(c) {
  if (typeof c !== "string") return "#94a3b8";
  const s = c.trim();
  if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(s)) return s;
  const m = s.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (m) {
    const clamp = (n) => Math.max(0, Math.min(255, parseInt(n, 10) || 0));
    const to2 = (n) => clamp(n).toString(16).padStart(2, "0");
    return `#${to2(m[1])}${to2(m[2])}${to2(m[3])}`;
  }
  return "#94a3b8";
}

// Vorschau: Text in Bucket-Farbe, dunkler Hintergrund (TaskCard-Nähe)
function colorChipStyle(color) {
  const fg = safeHex(color || "#94a3b8");
  return {
    width: 42,
    height: 24,
    borderRadius: 6,
    border: `1px solid ${fg}`,
    background: "var(--card-bg, #1a1a1a)",
    color: fg,
    display: "grid",
    placeItems: "center",
    fontSize: 12,
    fontWeight: 700,
    userSelect: "none",
    letterSpacing: 0.2,
  };
}
