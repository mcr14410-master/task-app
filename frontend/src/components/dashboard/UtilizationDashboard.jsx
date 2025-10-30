// frontend/src/components/dashboard/UtilizationDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * UtilizationDashboard
 * - Zeitraum-Presets (Woche/Monat) + freie Datumsauswahl
 * - Fetch: /api/dashboard/utilization?from=YYYY-MM-DD&to=YYYY-MM-DD
 * - Charts:
 *    1) Balken je Station: Sum(h) vs. Kapazität (dailyCapacityHours * Tage)
 *    2) Heatmap: Station × Tag, Farbe = Auslastung %
 * - Keine externen Chart-Libs (reines SVG/Div), Dark-UI
 */

export default function UtilizationDashboard() {
  // ---- Zeitraum-State -------------------------------------------------------
  const [range, setRange] = useState(() => presetThisWeek());
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  // ---- Data-State -----------------------------------------------------------
  const [data, setData] = useState([]);      // [{station, dailyCapacityHours, days:[{date,hoursPlanned}]}]
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // ---- Derived --------------------------------------------------------------
  const days = useMemo(() => enumerateDays(from, to), [from, to]);           // ["YYYY-MM-DD", ...]
  const numDays = days.length;

  const stations = useMemo(() => {
    // stabil sortiert wie Backend liefert
    return Array.isArray(data) ? data : [];
  }, [data]);

  const bars = useMemo(() => {
    // Für Balkendiagramm: Summe je Station + Kapazität
    return stations.map(s => {
      const sum = (s.days || []).reduce((acc, d) => acc + (Number(d.hoursPlanned) || 0), 0);
      const capPerDay = toNumber(s.dailyCapacityHours, 8.0);
      const capTotal = capPerDay * numDays;
      const ratio = capTotal > 0 ? sum / capTotal : 0;
      return {
        station: s.station || "nicht zugeordnet",
        hours: round2(sum),
        capacity: round2(capTotal),
        ratio
      };
    });
  }, [stations, numDays]);

  const overall = useMemo(() => {
    // Gesamtübersicht für Legende/Prozent
    const totHours = bars.reduce((a, b) => a + b.hours, 0);
    const totCap = bars.reduce((a, b) => a + b.capacity, 0);
    const pct = totCap > 0 ? (totHours / totCap) : 0;
    return { totHours: round2(totHours), totCap: round2(totCap), pct };
  }, [bars]);

  // ---- Fetch ---------------------------------------------------------------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const qs = `from=${from}&to=${to}`;
        const res = await fetch(`/api/dashboard/utilization?${qs}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!alive) return;
        setData(Array.isArray(json) ? json : []);
      } catch (e) {
        if (!alive) return;
        setErr("Datenabfrage fehlgeschlagen.");
        setData([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [from, to]);

  // ---- Render --------------------------------------------------------------
  return (
    <section style={S.wrap}>
      <header style={S.header}>
        <h2 style={S.h2}>Auslastung</h2>
        <div style={S.toolbar}>
          <PresetButtons onPick={(p) => { setRange(p); setFrom(p.from); setTo(p.to); }} />
          <div style={S.datePick}>
            <label style={S.lbl}>von</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={S.input}/>
          </div>
          <div style={S.datePick}>
            <label style={S.lbl}>bis</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={S.input}/>
          </div>
        </div>
      </header>

      {err && <div style={S.error}>🚨 {err}</div>}

      <div style={S.row}>
        <div style={S.card}>
          <div style={S.cardHeader}>
            <h3 style={S.h3}>Balken: Stunden vs. Kapazität</h3>
            <SummaryBadge total={overall.totHours} cap={overall.totCap} pct={overall.pct}/>
          </div>
          {loading ? <Loader /> : <Bars bars={bars} />}
        </div>
      </div>

      <div style={S.row}>
        <div style={S.card}>
          <div style={S.cardHeader}>
            <h3 style={S.h3}>Heatmap: Station × Tag</h3>
            <HeatLegend />
          </div>
          {loading ? <Loader /> : <Heatmap stations={stations} days={days} />}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- Subcomponents ----------------------------- */

function PresetButtons({ onPick }) {
  return (
    <div style={S.preset}>
      <button style={S.btn} onClick={() => onPick(presetThisWeek())}>Diese Woche</button>
      <button style={S.btn} onClick={() => onPick(presetNextWeek())}>Nächste Woche</button>
      <button style={S.btn} onClick={() => onPick(presetThisMonth())}>Dieser Monat</button>
      <button style={S.btn} onClick={() => onPick(presetNextMonth())}>Nächster Monat</button>
    </div>
  );
}

function SummaryBadge({ total, cap, pct }) {
  const color = pct >= 1.0 ? "#ef4444" : pct >= 0.8 ? "#f59e0b" : "#10b981";
  return (
    <div style={{ ...S.summary, borderColor: color, color }}>
      <strong>{total}h</strong> / {cap}h &nbsp;
      <span>({Math.round((pct || 0)*100)}%)</span>
    </div>
  );
}

function Bars({ bars }) {
  if (!bars || bars.length === 0) {
    return <div style={S.muted}>Keine Daten im Zeitraum.</div>;
  }
  const maxCap = Math.max(1, ...bars.map(b => b.capacity)); // avoid 0-div
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {bars.map((b) => {
        const capW = (b.capacity / maxCap) * 100;
        const hrsW = Math.min(100, (b.hours / maxCap) * 100);
        const color = b.ratio >= 1.0 ? "#ef4444" : b.ratio >= 0.8 ? "#f59e0b" : "#10b981";
        return (
          <div key={b.station} style={S.barRow}>
            <div style={S.barLabel}>{b.station}</div>
            <div style={S.barTrack}>
              <div style={{ ...S.barCap, width: `${capW}%` }} />
              <div style={{ ...S.barVal, width: `${hrsW}%`, background: color }} />
            </div>
            <div style={S.barValText}>
              {b.hours}h / {b.capacity}h
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HeatLegend() {
  const stops = [
    { c: "#0ea5e9", t: "<60%" },
    { c: "#10b981", t: "60–80%" },
    { c: "#f59e0b", t: "80–100%" },
    { c: "#ef4444", t: "100–150%" },
    { c: "#991b1b", t: ">150%" },
  ];
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {stops.map(s => (
        <div key={s.t} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 3, background: s.c, border: "1px solid #00000033" }} />
          <small style={{ color: "#9ca3af" }}>{s.t}</small>
        </div>
      ))}
    </div>
  );
}

function Heatmap({ stations, days }) {
  if (!stations || stations.length === 0) {
    return <div style={S.muted}>Keine Stationen.</div>;
  }
  if (!days || days.length === 0) {
    return <div style={S.muted}>Kein Zeitraum gewählt.</div>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={{ ...S.th, minWidth: 160, position: "sticky", left: 0, zIndex: 2, background: "#0b0c10" }}>Station</th>
            {days.map(d => (
              <th key={d} style={{ ...S.th, textAlign: "center" }}>{formatDayShort(d)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stations.map(s => {
            const cap = toNumber(s.dailyCapacityHours, 8.0);
            const cells = indexByDate(s.days || []);
            return (
              <tr key={s.station}>
                <td style={{ ...S.tdSticky }}>{s.station || "nicht zugeordnet"}</td>
                {days.map(d => {
                  const val = cells[d]?.hoursPlanned || 0;
                  const pct = cap > 0 ? (val / cap) : 0;
                  const bg = heatColor(pct);
                  const color = "#e5e7eb";
                  return (
                    <td key={d} style={{ ...S.td, background: bg, color }} title={`${formatISO(d)} · ${round2(val)}h / ${round2(cap)}h`}>
                      {val ? round1(val) : ""}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Loader() {
  return <div style={S.muted}>Lade…</div>;
}

/* ----------------------------- Styles ----------------------------- */

const S = {
  wrap: { padding: 12 },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  h2: { margin: 0, color: "#e5e7eb", fontSize: 20 },
  h3: { margin: 0, color: "#e5e7eb", fontSize: 16 },
  toolbar: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  preset: { display: "flex", gap: 6, alignItems: "center" },
  btn: {
    padding: "6px 10px", borderRadius: 8, border: "1px solid #ffffff22", background: "#1a1d23",
    color: "#e5e7eb", cursor: "pointer"
  },
  datePick: { display: "flex", alignItems: "center", gap: 6 },
  lbl: { color: "#9ca3af", fontSize: 12 },
  input: {
    padding: "6px 8px", borderRadius: 8, border: "1px solid #2f3540", background: "#111318",
    color: "#e5e7eb", outline: "none"
  },
  row: { marginBottom: 12 },
  card: {
    background: "#0b0c10", border: "1px solid #1f2430", borderRadius: 12, padding: 12,
    boxShadow: "0 4px 16px rgba(0,0,0,.25)"
  },
  cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  muted: { color: "#9ca3af" },
  error: {
    margin: "8px 0 12px 0", padding: 10, borderRadius: 10,
    background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.35)", color: "#fecaca"
  },
  summary: {
    padding: "4px 8px", borderRadius: 8, border: "1px solid", fontWeight: 700, background: "#15171b"
  },

  // Bars
  barRow: { display: "grid", gridTemplateColumns: "220px 1fr 120px", alignItems: "center", gap: 10 },
  barLabel: { color: "#e5e7eb", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  barTrack: { position: "relative", height: 18, background: "#0f1116", borderRadius: 9, border: "1px solid #262b36", overflow: "hidden" },
  barCap: { position: "absolute", left: 0, top: 0, bottom: 0, background: "#1f2937" },
  barVal: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 0 },

  barValText: { color: "#9ca3af", fontFamily: "monospace", textAlign: "right" },

  // Heatmap
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 2, tableLayout: "fixed" },
  th: { color: "#9ca3af", fontWeight: 600, fontSize: 12, padding: 6, position: "relative", top: 0, background: "#0b0c10" },
  td: { color: "#e5e7eb", fontSize: 12, padding: 6, textAlign: "center", borderRadius: 6, border: "1px solid #0f1116", minWidth: 42 },
  tdSticky: {
    color: "#e5e7eb", fontSize: 13, padding: 6, position: "sticky", left: 0, zIndex: 1,
    background: "#0b0c10", borderRight: "1px solid #1f2430", whiteSpace: "nowrap"
  }
};

/* ----------------------------- Utils ----------------------------- */

function enumerateDays(from, to) {
  if (!from || !to) return [];
  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  const out = [];
  for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
    out.push(formatISO(d));
  }
  return out;
}

function formatISO(d) {
  if (typeof d === "string") return d;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatDayShort(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const wd = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][d.getDay()];
  const day = String(d.getDate()).padStart(2, "0");
  return `${wd} ${day}`;
}

function indexByDate(daysArr) {
  const map = {};
  for (const d of daysArr) map[d.date] = d;
  return map;
}

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function round1(n) { return Math.round((Number(n) || 0) * 10) / 10; }
function toNumber(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

// Farbskala für Heatmap (pct = val / cap)
function heatColor(pct) {
  if (!Number.isFinite(pct)) return "#111318";
  if (pct <= 0) return "#0f1116";
  if (pct < 0.6) return "#0ea5e9";   // blau
  if (pct < 0.8) return "#10b981";   // grün
  if (pct < 1.0) return "#f59e0b";   // gelb
  if (pct < 1.5) return "#ef4444";   // rot
  return "#991b1b";                  // dunkelrot (krass überbucht)
}

/* ----------------------------- Presets ----------------------------- */

function presetThisWeek() {
  const now = new Date();
  const { from, to } = weekRangeFromDate(now);
  return { from, to };
}
function presetNextWeek() {
  const now = new Date();
  now.setDate(now.getDate() + 7);
  const { from, to } = weekRangeFromDate(now);
  return { from, to };
}
function weekRangeFromDate(d) {
  const date = new Date(d);
  // Montag als Wochenstart
  const day = (date.getDay() + 6) % 7; // 0..6 (Mo=0)
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { from: formatISO(start), to: formatISO(end) };
}

function presetThisMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const from = new Date(y, m, 1);
  const to = new Date(y, m + 1, 0);
  return { from: formatISO(from), to: formatISO(to) };
}
function presetNextMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const from = new Date(y, m, 1);
  const to = new Date(y, m + 1, 0);
  return { from: formatISO(from), to: formatISO(to) };
}
