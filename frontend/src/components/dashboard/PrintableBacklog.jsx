// frontend/src/components/dashboard/PrintableBacklog.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * PrintableBacklog
 * - Datenquelle: GET /api/dashboard/backlog?from&to&station&includeNoDate
 * - Stationen für Filter: GET /api/arbeitsstationen
 * - Gruppiert nach Arbeitsstation, sortiert nach Fällig (älteste zuerst)
 * - Spalten: Bezeichnung, Kunde, Teilenummer, Fällig am, Aufwand (h), Status, Zusatzarbeiten
 * - Summen je Station + Gesamtsumme
 * - Druck-Button und Print-CSS (helle Version, UI-Elemente ausgeblendet)
 */

export default function PrintableBacklog() {
  // Zeitraum
  const [range, setRange] = useState(() => presetThisWeek());
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  // Filter
  const [stations, setStations] = useState([]);
  const [station, setStation] = useState(""); // leer = alle
  const [includeNoDate, setIncludeNoDate] = useState(false);

  // Daten
  const [rows, setRows] = useState([]); // TaskBacklogDto[]
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // Stationen laden (Namen)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/arbeitsstationen");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const json = await res.json();
        if (!alive) return;
        // Erwartet Array von Stationen mit name/bezeichnung
        const names = (Array.isArray(json) ? json : [])
          .map(s => s.name || s.bezeichnung || "")
          .filter(Boolean)
          .sort((a,b) => a.localeCompare(b, "de"));
        setStations(["nicht zugeordnet", ...names]);
      } catch {
        // Falls Endpoint anders heißt: Fallback nur mit „nicht zugeordnet“
        if (!alive) return;
        setStations(["nicht zugeordnet"]);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Backlog laden
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const qs = new URLSearchParams();
        if (from) qs.set("from", from);
        if (to) qs.set("to", to);
        if (station && station.trim()) qs.set("station", station.trim());
        qs.set("includeNoDate", includeNoDate ? "true" : "false");
        const res = await fetch(`/api/dashboard/backlog?${qs.toString()}`);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const json = await res.json();
        if (!alive) return;
        setRows(Array.isArray(json) ? json : []);
      } catch (e) {
        if (!alive) return;
        setErr("Datenabfrage fehlgeschlagen.");
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [from, to, station, includeNoDate]);

  // Gruppierung nach Station
  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const key = r.station || "nicht zugeordnet";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    // Innerhalb jeder Gruppe: sort by endDatum asc (nulls last), dann Bezeichnung
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => {
        const da = a.endDatum ? a.endDatum : "9999-12-31";
        const db = b.endDatum ? b.endDatum : "9999-12-31";
        if (da !== db) return da.localeCompare(db);
        const aa = (a.bezeichnung || "").toLocaleLowerCase("de");
        const bb = (b.bezeichnung || "").toLocaleLowerCase("de");
        return aa.localeCompare(bb, "de");
      });
    }
    // Sort Station namen
    return Array.from(map.entries()).sort((a,b) => (a[0]||"").localeCompare(b[0]||"", "de"));
  }, [rows]);

  // Summen
  const totals = useMemo(() => {
    const perStation = new Map();
    let overall = 0;
    for (const [name, arr] of grouped) {
      const sum = arr.reduce((acc, r) => acc + toNumber(r.aufwandStunden), 0);
      perStation.set(name, round2(sum));
      overall += sum;
    }
    return { perStation, overall: round2(overall) };
  }, [grouped]);

  return (
    <section style={S.wrap}>
      <PrintStyles />

      <header style={S.header} className="no-print">
        <h2 style={S.h2}>Rückstandsliste</h2>
        <div style={S.tools}>
          <PresetButtons onPick={(p) => { setRange(p); setFrom(p.from); setTo(p.to); }} />
          <div style={S.group}>
            <label style={S.lbl}>von</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={S.input} />
          </div>
          <div style={S.group}>
            <label style={S.lbl}>bis</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={S.input} />
          </div>
          <div style={S.group}>
            <label style={S.lbl}>Station</label>
            <select value={station} onChange={(e) => setStation(e.target.value)} style={S.select}>
              <option value="">Alle</option>
              {stations.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={S.groupRow}>
            <input
              id="inod"
              type="checkbox"
              checked={includeNoDate}
              onChange={(e) => setIncludeNoDate(e.target.checked)}
            />
            <label htmlFor="inod" style={S.lbl}>Ohne Fälligkeitsdatum einbeziehen</label>
          </div>
          <button style={S.btnPrimary} onClick={() => window.print()}>Drucken</button>
        </div>
      </header>

      {/* Titel für Druck */}
      <div style={S.printHeader} className="only-print">
        <h1 style={{ margin: 0, fontSize: 18 }}>Rückstandsliste</h1>
        <div style={{ fontSize: 12 }}>
          Zeitraum: {formatDate(from)} – {formatDate(to)}
          {station ? ` · Station: ${station}` : " · Station: Alle"}
          {includeNoDate ? " · inkl. ohne Datum" : ""}
        </div>
      </div>

      {err && <div style={S.error} className="no-print">🚨 {err}</div>}
      {loading ? (
        <div style={S.muted}>Lade…</div>
      ) : (
        <>
          {/* Gesamtsumme */}
          <div style={S.summary} className="no-print">
            Gesamtstunden: <strong>{totals.overall} h</strong>
          </div>

          {/* Gruppen */}
          {grouped.length === 0 && (
            <div style={S.muted}>Keine Daten im gewählten Zeitraum.</div>
          )}
          {grouped.map(([stationName, arr]) => (
            <section key={stationName} style={S.card} className="print-section">
              <div style={S.cardHead}>
                <h3 style={S.h3}>{stationName}</h3>
                <div style={S.badge}>Summe: {round2(arr.reduce((a,r)=>a+toNumber(r.aufwandStunden),0))} h</div>
              </div>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={{...S.th, minWidth: 200, textAlign: 'left'}}>Bezeichnung</th>
                    <th style={{...S.th, minWidth: 150, textAlign: 'left'}}>Kunde</th>
                    <th style={{...S.th, minWidth: 130, textAlign: 'left'}}>Teilenummer</th>
                    <th style={{...S.th, minWidth: 110}}>Fällig am</th>
                    <th style={{...S.th, minWidth: 90}}>Aufwand (h)</th>
                    <th style={{...S.th, minWidth: 120}}>Status</th>
                    <th style={{...S.th, minWidth: 180, textAlign: 'left'}}>Zusatzarbeiten</th>
                  </tr>
                </thead>
                <tbody>
                  {arr.map((r, idx) => (
                    <tr key={stationName + "_" + idx}>
                      <td style={{...S.td, textAlign: 'left'}}>{r.bezeichnung || "—"}</td>
                      <td style={{...S.td, textAlign: 'left'}}>{r.kunde || "—"}</td>
                      <td style={{...S.td, textAlign: 'left'}}>{r.teilenummer || "—"}</td>
                      <td style={S.td}>{r.endDatum ? formatDate(r.endDatum) : "—"}</td>
                      <td style={S.tdMono}>{round1(r.aufwandStunden)}</td>
                      <td style={S.td}>{r.statusCode || "—"}</td>
                      <td style={{...S.td, textAlign: 'left'}}>{r.zusatzarbeiten || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}

          {/* Gesamtsumme (Print unten) */}
          <div className="only-print" style={{ marginTop: 12, fontSize: 12 }}>
            Gesamtstunden: <strong>{totals.overall} h</strong>
          </div>
        </>
      )}
    </section>
  );
}

/* ------------------------ Styles (Screen & Print) ------------------------ */

function PrintStyles() {
  return (
    <style>
      {`
      @media screen {
        .only-print { display: none !important; }
      }
      @media print {
        @page { size: A4 portrait; margin: 12mm; }
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          background: #fff !important;
        }
        .no-print { display: none !important; }
        .only-print { display: block !important; }
        /* Karten auflösen, Tabellen vollbreit */
        .print-section {
          break-inside: avoid;
          page-break-inside: avoid;
          border: 1px solid #ddd !important;
          background: #fff !important;
          color: #000 !important;
        }
        table, th, td { color: #000 !important; }
        th { background: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
      }
    `}
    </style>
  );
}

const S = {
  wrap: { padding: 12, color: "#e5e7eb", background: "#0b0c10", minHeight: "100%" },
  header: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  h2: { margin: 0, color: "#fff", fontSize: 20 },
  tools: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" },
  group: { display: "flex", alignItems: "center", gap: 6 },
  groupRow: { display: "flex", alignItems: "center", gap: 6, color: "#9ca3af" },
  lbl: { color: "#9ca3af", fontSize: 12 },
  input: { padding: "6px 8px", borderRadius: 8, border: "1px solid #2f3540", background: "#111318", color: "#e5e7eb" },
  select: { padding: "6px 8px", borderRadius: 8, border: "1px solid #2f3540", background: "#111318", color: "#e5e7eb", minWidth: 160 },
  btn: { padding: "6px 10px", borderRadius: 8, border: "1px solid #ffffff22", background: "#1a1d23", color: "#e5e7eb", cursor: "pointer" },
  btnPrimary: { padding: "8px 12px", borderRadius: 8, border: "1px solid #2563eb", background: "#3b82f6", color: "#fff", cursor: "pointer", fontWeight: 700 },
  error: { marginBottom: 10, padding: 10, borderRadius: 8, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.35)", color: "#fecaca" },

  printHeader: { marginBottom: 8, borderBottom: "1px solid #ddd", paddingBottom: 6, color: "#000" },

  // Cards/Tables
  card: { background: "#0b0c10", border: "1px solid #1f2430", borderRadius: 12, padding: 12, marginBottom: 12 },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  h3: { margin: 0, color: "#e5e7eb", fontSize: 16 },
  badge: { padding: "4px 8px", borderRadius: 8, border: "1px solid #ffffff22", color: "#e5e7eb", fontWeight: 700 },

  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0 },
  th: { color: "#9ca3af", textAlign: "center", fontWeight: 600, fontSize: 12, padding: 6, borderBottom: "1px solid #273042" },
  td: { color: "#e5e7eb", fontSize: 13, padding: 6, textAlign: "center", borderBottom: "1px solid #111318" },
  tdMono: { color: "#e5e7eb", fontSize: 13, padding: 6, textAlign: "center", borderBottom: "1px solid #111318", fontFamily: "monospace" },

  muted: { color: "#9ca3af" },
  summary: { color: "#9ca3af", margin: "6px 0 8px" },
};

/* ----------------------------- Presets ----------------------------- */

function PresetButtons({ onPick }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button style={S.btn} onClick={() => onPick(presetOverdueToday())}>Überfällig + Heute</button>
      <button style={S.btn} onClick={() => onPick(presetNextDays(7))}>Nächste 7 Tage</button>
      <button style={S.btn} onClick={() => onPick(presetThisMonth())}>Dieser Monat</button>
      <button style={S.btn} onClick={() => onPick(presetNextMonth())}>Nächster Monat</button>
    </div>
  );
}

function presetThisWeek() {
  const now = new Date();
  const { from, to } = weekRangeFromDate(now);
  return { from, to };
}
function weekRangeFromDate(d) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Mo=0
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { from: iso(start), to: iso(end) };
}
function presetOverdueToday() {
  const today = new Date();
  const from = iso(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())); // großzügig
  const to = iso(today);
  return { from, to };
}
function presetNextDays(n) {
  const today = new Date();
  const from = iso(today);
  const end = new Date(today);
  end.setDate(today.getDate() + (n - 1));
  return { from, to: iso(end) };
}
function presetThisMonth() {
  const now = new Date();
  const from = iso(new Date(now.getFullYear(), now.getMonth(), 1));
  const to = iso(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  return { from, to };
}
function presetNextMonth() {
  const now = new Date();
  const from = iso(new Date(now.getFullYear(), now.getMonth() + 1, 1));
  const to = iso(new Date(now.getFullYear(), now.getMonth() + 2, 0));
  return { from, to };
}

/* ----------------------------- Utils ----------------------------- */

function iso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function formatDate(s) {
  if (!s) return "—";
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function round2(n) { return Math.round(toNumber(n) * 100) / 100; }
function round1(n) { return Math.round(toNumber(n) * 10) / 10; }
