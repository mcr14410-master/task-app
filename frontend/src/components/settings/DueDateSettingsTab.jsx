// frontend/src/components/settings/DueDateSettingsTab.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * DueDateSettingsTab – S3
 * - Lädt Buckets von /api/settings/dueDate (GET)
 * - Speichert Änderungen via PUT /api/settings/dueDate
 * - Beibehalt: lokale Bearbeitung, Validierung, Add/Remove
 * - Fix-Buckets: overdue (<0), today (=0) -> nur Farbe/Label/Role veränderbar, Range fix
 *
 * Neu in diesem Schritt:
 * - Nach erfolgreichem Speichern oder Server-Reload:
 *   window.dispatchEvent(new CustomEvent("due-settings-updated"))
 *   → App.jsx hört darauf und injiziert die CSS-Variablen/Klassen neu.
 */

export default function DueDateSettingsTab() {
  const [buckets, setBuckets] = useState(DEFAULT_BUCKETS);        // zuletzt übernommene (lokal)
  const [dirtyBuckets, setDirtyBuckets] = useState(DEFAULT_BUCKETS); // editierbarer Zustand
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  // Initial Load from API
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/settings/dueDate");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        const fromApi = mapFromApi(data);
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

  // --- Actions (lokal) ---
  const addBucket = () => {
    const baseKey = "custom";
    let idx = 1;
    const existing = new Set(dirtyBuckets.map(b => b.key));
    let key = `${baseKey}-${idx}`;
    while (existing.has(key)) key = `${baseKey}-${++idx}`;
    const newB = { key, label: "Neuer Bucket", min: 8, max: 14, color: "#22c55e", fixed: false, role: "ok" };
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

  const resetLocal = () => {
    setDirtyBuckets(buckets);
    setTouched(false);
    setInfo("Lokale Änderungen verworfen (zur letzten übernommenen Konfiguration).");
  };

  const reloadFromServer = async () => {
    try {
      setLoading(true);
      setError(null);
      setInfo(null);
      const res = await fetch("/api/settings/dueDate");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const fromApi = mapFromApi(data);
      setBuckets(fromApi);
      setDirtyBuckets(fromApi);
      setTouched(false);
      setInfo("Vom Server neu geladen.");

      // NEU: Styles live aktualisieren
      window.dispatchEvent(new CustomEvent("due-settings-updated"));
    } catch (e) {
      setError("Neu laden vom Server fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  const applyBuckets = () => {
    setBuckets(dirtyBuckets);
    setTouched(false);
    setInfo("Lokal übernommen (nicht gespeichert).");
    // Kein Event hier: App injiziert aus Serverzustand; lokales Apply ist nur Vorschau.
  };

  const saveToServer = async () => {
    const hasErrors = validation.errors.length > 0;
    if (hasErrors) return;
    try {
      setSaving(true);
      setError(null);
      setInfo(null);
      const payload = mapToApi(dirtyBuckets);
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
      const fromApi = mapFromApi(data);
      setBuckets(fromApi);
      setDirtyBuckets(fromApi);
      setTouched(false);
      setInfo("Gespeichert.");

      // NEU: Styles live aktualisieren
      window.dispatchEvent(new CustomEvent("due-settings-updated"));
    } catch (e) {
      setError(e?.message || "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  // --- Validation ---
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

  return (
    <section role="tabpanel" aria-label="Fälligkeit">
      <h3 style={{ margin: "8px 0 12px 0" }}>Fälligkeit – Buckets</h3>

      {/* Notifications */}
      {error && <div style={errorBox}>{error}</div>}
      {info && !error && <div style={infoBox}>{info}</div>}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={addBucket} style={btnSecondary} title="Neuen Bucket hinzufügen">+ Bucket</button>
        <button onClick={resetLocal} style={btnGhost} title="Lokale Änderungen verwerfen">Zurücksetzen (lokal)</button>
        <button onClick={reloadFromServer} style={btnGhost} title="Serverzustand neu laden">Vom Server laden</button>
        <button
          onClick={applyBuckets}
          style={{ ...btnNeutral, opacity: hasErrors || !touched ? 0.6 : 1, pointerEvents: hasErrors || !touched ? "none" : "auto" }}
          title={hasErrors ? "Bitte Fehler korrigieren" : "Nur lokal übernehmen"}
        >
          Übernehmen (lokal)
        </button>
        <button
          onClick={saveToServer}
          style={{ ...btnPrimary, opacity: hasErrors || (!touched && !error) ? 0.6 : 1, pointerEvents: hasErrors || (!touched && !error) ? "none" : "auto" }}
          title={hasErrors ? "Bitte Fehler korrigieren" : "Auf Server speichern"}
        >
          {saving ? "Speichern…" : "Speichern (Server)"}
        </button>
      </div>

      {/* Validation output */}
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

      {/* Editable table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #555" }}>
            <th style={th}>Key</th>
            <th style={th}>Label</th>
            <th style={th}>Min (Tage)</th>
            <th style={th}>Max (Tage)</th>
            <th style={th}>Farbe</th>
            <th style={th}>Role</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {dirtyBuckets.map((b, i) => {
            const fixed = !!b.fixed;
            const color = b.color || "#999999";
            const minDisabled = fixed && b.key === "today";
            const maxDisabled = fixed; // overdue/today: max fix
            const keyDisabled = fixed;
            const labelDisabled = false; // Label darfst du auch für fixed anpassen
            const roleDisabled = b.key === "overdue"; // overdue bleibt overdue

            return (
              <tr key={b.key} style={{ borderBottom: "1px solid #333" }}>
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
                <td style={td}>
                  <input
                    type="number"
                    value={b.min ?? ""}
                    disabled={minDisabled}
                    onChange={(e) => {
                      const v = e.target.value === "" ? undefined : Number(e.target.value);
                      updateBucket(i, { min: Number.isNaN(v) ? undefined : v });
                    }}
                    style={input(minDisabled)}
                    placeholder="leer = -∞"
                  />
                </td>
                {/* Max */}
                <td style={td}>
                  <input
                    type="number"
                    value={b.max ?? ""}
                    disabled={maxDisabled}
                    onChange={(e) => {
                      const v = e.target.value === "" ? undefined : Number(e.target.value);
                      updateBucket(i, { max: Number.isNaN(v) ? undefined : v });
                    }}
                    style={input(maxDisabled)}
                    placeholder="leer = +∞"
                  />
                </td>
                {/* Color */}
                <td style={td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="color"
                      value={safeHex(color)}
                      onChange={(e) => updateBucket(i, { color: e.target.value })}
                      style={{ width: 28, height: 28, padding: 0, border: "1px solid #555", borderRadius: 6, background: "#222" }}
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => updateBucket(i, { color: e.target.value })}
                      style={input(false)}
                      placeholder="#RRGGBB oder CSS-Farbe"
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
        </tbody>
      </table>

      {/* Info */}
      <div style={{ marginTop: 16, fontSize: 13, color: "#9ca3af", background: "rgba(255,255,255,0.04)", padding: 12, borderRadius: 8 }}>
        <p style={{ margin: 0 }}>
          <strong>Hinweis:</strong> „Überfällig“ (&lt;0) und „Heute“ (=0) sind System-Buckets (feste Bereiche, nur Farbe/Label anpassbar).
          Weitere Buckets sind frei definierbar. Bereiche dürfen sich nicht überlappen; Lücken sind erlaubt.
        </p>
        <p style={{ margin: "8px 0 0 0" }}>
          Diese Einstellungen wirken aktuell nur visuell. Das Dashboard (Planning) nutzt Arbeitstage unabhängig hiervon.
        </p>
      </div>
    </section>
  );
}

/* ---------- Defaults & Validation ---------- */

const DEFAULT_BUCKETS = [
  { key: "overdue", label: "Überfällig", min: undefined, max: -1, color: "#ef4444", fixed: true, role: "overdue" },
  { key: "today",   label: "Heute",      min: 0,        max: 0,  color: "#f5560a", fixed: true, role: "warn" },
  { key: "soon",    label: "Bald",       min: 1,        max: 3,  color: "#facc15", fixed: false, role: "warn" },
  { key: "week",    label: "Woche",      min: 4,        max: 7,  color: "#0ea5e9", fixed: false, role: "ok" },
  { key: "future",  label: "Zukunft",    min: 8,        max: undefined, color: "#94a3b8", fixed: false, role: "ok" },
];

function validateBuckets(dirtyBuckets) {
  const errors = [];
  const warnings = [];

  const keyRegex = /^[a-z0-9-]+$/;
  const seen = new Set();
  dirtyBuckets.forEach((b) => {
    if (!b.key || !keyRegex.test(b.key)) errors.push({ field: "key", msg: `Key '${b.key || ""}' muss ^[a-z0-9-]+$ entsprechen.` });
    if (seen.has(b.key)) errors.push({ field: "key", msg: `Key '${b.key}' ist nicht eindeutig.` });
    seen.add(b.key);
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
    })),
  };
}

/* ---------- Styles ---------- */

const th = { textAlign: "left", padding: "4px 8px" };
const td = { padding: "6px 8px", verticalAlign: "middle" };

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
const btnNeutral = { ...btnBase, background: "#334155", border: "1px solid #1f2937" };
const btnGhost = { ...btnBase, background: "transparent" };
const btnPrimary = { ...btnBase, background: "#3b82f6", border: "1px solid #2563eb" };
const btnDanger = { ...btnBase, background: "#ef4444", border: "1px solid #dc2626" };

const errorBox = {
  marginBottom: 12,
  padding: 10,
  borderRadius: 8,
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.35)",
  color: "#fecaca",
};
const warnBox = {
  marginBottom: 12,
  padding: 10,
  borderRadius: 8,
  background: "rgba(250,204,21,0.12)",
  border: "1px solid rgba(250,204,21,0.35)",
  color: "#fde68a",
};
const infoBox = {
  marginBottom: 12,
  padding: 10,
  borderRadius: 8,
  background: "rgba(59,130,246,0.12)",
  border: "1px solid rgba(59,130,246,0.35)",
  color: "#bfdbfe",
};

/* ---------- Utils ---------- */

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
