// frontend/src/components/settings/DueDateSettingsTab.jsx
import React, { useMemo, useState } from "react";

/**
 * DueDateSettingsTab – S2 (editierbar, lokal, ohne Persistenz)
 *
 * - Zeigt und editiert visuelle Fälligkeits-Buckets.
 * - System-Buckets:
 *    * overdue: fester Bereich (<0), Farbe editierbar
 *    * today:   fester Bereich (=0), Farbe editierbar
 * - Variable Buckets (z. B. soon, week, future + weitere):
 *    * Key/Label/Min/Max/Farbe änderbar
 *    * Löschbar
 * - Validierung:
 *    * Keys eindeutig & regex ^[a-z0-9-]+$
 *    * Bereiche dürfen sich nicht überlappen (inklusive Grenzen)
 * - Buttons:
 *    * Übernehmen (nur lokal anwenden)
 *    * Zurücksetzen (auf Default-Konfiguration)
 *
 * Hinweis:
 *  - Noch keine Persistenz, keine CSS-Generierung. Nur UI/State.
 *  - Planning-Logik (Dashboard) bleibt unabhängig hiervon.
 */

const DEFAULT_BUCKETS = [
  { key: "overdue", label: "Überfällig", min: undefined, max: -1, color: "#ef4444", fixed: true, role: "overdue" },
  { key: "today",   label: "Heute",      min: 0,        max: 0,  color: "#f5560a", fixed: true, role: "warn"    },
  { key: "soon",    label: "Bald",       min: 1,        max: 3,  color: "#facc15", fixed: false, role: "warn"   },
  { key: "week",    label: "Woche",      min: 4,        max: 7,  color: "#0ea5e9", fixed: false, role: "ok"     },
  { key: "future",  label: "Zukunft",    min: 8,        max: undefined, color: "#94a3b8", fixed: false, role: "ok" },
];

export default function DueDateSettingsTab() {
  const [buckets, setBuckets] = useState(DEFAULT_BUCKETS);
  const [dirtyBuckets, setDirtyBuckets] = useState(DEFAULT_BUCKETS);
  const [touched, setTouched] = useState(false);

  // Helpers
  const addBucket = () => {
    const baseKey = "custom";
    let idx = 1;
    let key = `${baseKey}-${idx}`;
    const existing = new Set(dirtyBuckets.map(b => b.key));
    while (existing.has(key)) {
      idx += 1;
      key = `${baseKey}-${idx}`;
    }
    const newB = {
      key,
      label: "Neuer Bucket",
      min: 8,
      max: 14,
      color: "#22c55e",
      fixed: false,
      role: "ok",
    };
    setDirtyBuckets(prev => [...prev, newB]);
    setTouched(true);
  };

  const removeBucket = (key) => {
    setDirtyBuckets(prev => prev.filter(b => b.key !== key));
    setTouched(true);
  };

  const updateBucket = (index, patch) => {
    setDirtyBuckets(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
    setTouched(true);
  };

  const resetBuckets = () => {
    setDirtyBuckets(DEFAULT_BUCKETS);
    setTouched(false);
  };

  const applyBuckets = () => {
    // Lokal übernehmen – noch keine Persistenz
    setBuckets(dirtyBuckets);
    setTouched(false);
  };

  // Validation

  const keyRegex = /^[a-z0-9-]+$/;

  const validation = useMemo(() => {
    const errors = [];
    const warnings = [];

    // Keys: unique & format
    const seen = new Set();
    dirtyBuckets.forEach((b, i) => {
      if (!b.key || !keyRegex.test(b.key)) {
        errors.push({ i, field: "key", msg: "Key muss ^[a-z0-9-]+$ entsprechen." });
      }
      const k = b.key || "";
      if (seen.has(k)) {
        errors.push({ i, field: "key", msg: "Key muss eindeutig sein." });
      }
      seen.add(k);
    });

    // Range: numbers or undefined (undefined = offen)
    const toRange = (b) => {
      const min = b.min === "" || b.min === null ? undefined : Number(b.min);
      const max = b.max === "" || b.max === null ? undefined : Number(b.max);
      return { min, max };
    };

    // No overlaps (inclusive)
    const normalize = (x) => (x === undefined || Number.isNaN(x) ? (x === undefined ? undefined : undefined) : x);

    const intervals = dirtyBuckets.map((b, i) => {
      const r = toRange(b);
      return { i, key: b.key, min: normalize(r.min), max: normalize(r.max) };
    });

    // Check fixed ones enforce their ranges
    dirtyBuckets.forEach((b, i) => {
      if (b.fixed && b.key === "overdue") {
        if (!(b.min === undefined && b.max === -1)) {
          errors.push({ i, field: "range", msg: "overdue: Bereich ist fix (< 0)." });
        }
      }
      if (b.fixed && b.key === "today") {
        if (!(b.min === 0 && b.max === 0)) {
          errors.push({ i, field: "range", msg: "today: Bereich ist fix (= 0)." });
        }
      }
    });

    // Overlap detection: two intervals [minA,maxA] and [minB,maxB] overlap if they share any integer day.
    // Treat undefined min as -Infinity, undefined max as +Infinity.
    const toBounds = (min, max) => ({
      lo: min === undefined ? -Infinity : min,
      hi: max === undefined ? Infinity : max,
    });

    for (let a = 0; a < intervals.length; a++) {
      for (let b = a + 1; b < intervals.length; b++) {
        const A = toBounds(intervals[a].min, intervals[a].max);
        const B = toBounds(intervals[b].min, intervals[b].max);
        // Inclusive overlap:
        const overlaps = !(A.hi < B.lo || B.hi < A.lo);
        if (overlaps) {
          errors.push({
            i: intervals[a].i,
            field: "range",
            msg: `Bereich überschneidet sich mit "${intervals[b].key}".`,
          });
          errors.push({
            i: intervals[b].i,
            field: "range",
            msg: `Bereich überschneidet sich mit "${intervals[a].key}".`,
          });
        }
      }
    }

    // Optional: warn if there are gaps (not an error, nur Hinweis)
    // Sort by min asc
    const sorted = [...intervals].sort((a, b) => {
      const aLo = a.min === undefined ? -Infinity : a.min;
      const bLo = b.min === undefined ? -Infinity : b.min;
      return aLo - bLo;
    });
    // detect gap between consecutive bounds
    for (let i = 0; i < sorted.length - 1; i++) {
      const A = toBounds(sorted[i].min, sorted[i].max);
      const B = toBounds(sorted[i + 1].min, sorted[i + 1].max);
      if (A.hi + 1 < B.lo) {
        warnings.push({ msg: `Lücke zwischen ${sorted[i].key} und ${sorted[i + 1].key}.` });
      }
    }

    return { errors, warnings };
  }, [dirtyBuckets]);

  const hasErrors = validation.errors.length > 0;

  return (
    <section role="tabpanel" aria-label="Fälligkeit">
      <h3 style={{ margin: "8px 0 12px 0" }}>Fälligkeit – Buckets (editierbar, lokal)</h3>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={addBucket}
          style={btnSecondary}
          title="Neuen Bucket hinzufügen"
        >
          + Bucket
        </button>
        <button
          onClick={resetBuckets}
          style={btnGhost}
          title="Auf Standard zurücksetzen"
        >
          Zurücksetzen
        </button>
        <button
          onClick={applyBuckets}
          style={{ ...btnPrimary, opacity: hasErrors || !touched ? 0.6 : 1, pointerEvents: hasErrors || !touched ? "none" : "auto" }}
          title={hasErrors ? "Bitte Fehler korrigieren" : "Lokal übernehmen"}
        >
          Übernehmen (nur lokal)
        </button>
      </div>

      {/* Validation output */}
      {validation.errors.length > 0 && (
        <div style={errorBox}>
          <strong style={{ display: "block", marginBottom: 6 }}>Fehler:</strong>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {validation.errors.map((e, idx) => (
              <li key={idx}>{e.msg}</li>
            ))}
          </ul>
        </div>
      )}
      {validation.warnings.length > 0 && validation.errors.length === 0 && (
        <div style={warnBox}>
          <strong style={{ display: "block", marginBottom: 6 }}>Hinweise:</strong>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {validation.warnings.map((w, idx) => (
              <li key={idx}>{w.msg}</li>
            ))}
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
            <th style={th}>Typ</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {dirtyBuckets.map((b, i) => {
            const fixed = !!b.fixed;
            const color = b.color || "#999999";
            return (
              <tr key={b.key} style={{ borderBottom: "1px solid #333" }}>
                {/* Key */}
                <td style={td}>
                  <input
                    type="text"
                    value={b.key}
                    disabled={fixed}
                    onChange={(e) => updateBucket(i, { key: e.target.value.trim() })}
                    style={input(fixed)}
                    placeholder="z. B. soon-14"
                  />
                </td>

                {/* Label */}
                <td style={td}>
                  <input
                    type="text"
                    value={b.label || ""}
                    disabled={fixed}
                    onChange={(e) => updateBucket(i, { label: e.target.value })}
                    style={input(fixed)}
                    placeholder="Anzeigename"
                  />
                </td>

                {/* Min */}
                <td style={td}>
                  <input
                    type="number"
                    value={b.min ?? ""}
                    disabled={fixed && b.key === "today"} // today ist =0 fix, overdue hat min undefined
                    onChange={(e) => {
                      const v = e.target.value === "" ? undefined : Number(e.target.value);
                      updateBucket(i, { min: Number.isNaN(v) ? undefined : v });
                    }}
                    style={input(fixed && b.key === "today")}
                    placeholder="leer = -∞"
                  />
                </td>

                {/* Max */}
                <td style={td}>
                  <input
                    type="number"
                    value={b.max ?? ""}
                    disabled={fixed} // overdue: max -1 fix, today: max 0 fix
                    onChange={(e) => {
                      const v = e.target.value === "" ? undefined : Number(e.target.value);
                      updateBucket(i, { max: Number.isNaN(v) ? undefined : v });
                    }}
                    style={input(fixed)}
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
                    disabled={b.key === "overdue"} // overdue bleibt overdue
                    onChange={(e) => updateBucket(i, { role: e.target.value })}
                    style={input(b.key === "overdue")}
                  >
                    <option value="overdue">overdue</option>
                    <option value="warn">warn</option>
                    <option value="ok">ok</option>
                  </select>
                </td>

                {/* Remove */}
                <td style={{ ...td, textAlign: "right" }}>
                  {!fixed && (
                    <button
                      onClick={() => removeBucket(b.key)}
                      style={btnDanger}
                      title="Bucket entfernen"
                    >
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
      <div
        style={{
          marginTop: 16,
          fontSize: 13,
          color: "#9ca3af",
          background: "rgba(255,255,255,0.04)",
          padding: 12,
          borderRadius: 8,
        }}
      >
        <p style={{ margin: 0 }}>
          <strong>Hinweis:</strong> „Überfällig“ (&lt;0) und „Heute“ (=0) sind System-Buckets (feste Bereiche, nur Farbe anpassbar).
          Weitere Buckets sind frei definierbar. Bereiche dürfen sich nicht überlappen; Lücken sind erlaubt.
        </p>
        <p style={{ margin: "8px 0 0 0" }}>
          Dieses Tab wirkt aktuell nur lokal. Persistenz & CSS-Generierung folgen als nächste Schritte.
        </p>
      </div>
    </section>
  );
}

/* ---------- Styles (inline helpers) ---------- */

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

/* ---------- Utils ---------- */

// versucht, einen Farbstring in ein valides Hex für <input type="color"> umzuwandeln
function safeHex(c) {
  if (typeof c !== "string") return "#94a3b8";
  const s = c.trim();

  // bereits Hex?
  if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(s)) return s;

  // rgb/rgba(..) -> Hex
  const m = s.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (m) {
    const clamp = (n) => Math.max(0, Math.min(255, parseInt(n, 10) || 0));
    const to2 = (n) => clamp(n).toString(16).padStart(2, "0");
    return `#${to2(m[1])}${to2(m[2])}${to2(m[3])}`;
  }

  // alles andere: neutraler Fallback
  return "#94a3b8";
}

