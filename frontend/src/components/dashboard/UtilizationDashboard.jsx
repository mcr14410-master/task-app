// frontend/src/components/dashboard/UtilizationDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * UtilizationDashboard – Balken + Heatmap (v2.2)
 * - Heatmap zeigt h & %, Wochenenden markiert, Summen (Zeile/Spalte)
 * - Single-Click: Zelle markieren; Double-Click: Backlog in neuem Popup (API-basiert)
 * - Router-unabhängig (kein Hash/Path nötig)
 */

function UtilizationDashboard() {
  // Zeitraum
  const [range, setRange] = useState(() => presetThisWeek());
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  // Daten
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // Auswahl (UX)
  const [selected, setSelected] = useState(null); // {station, day} | null

  // Derived
  const days = useMemo(() => enumerateDays(from, to), [from, to]);
  const numDays = days.length;
  const stations = useMemo(() => Array.isArray(data) ? data : [], [data]);

  const bars = useMemo(() => {
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
    const totHours = bars.reduce((a, b) => a + b.hours, 0);
    const totCap = bars.reduce((a, b) => a + b.capacity, 0);
    const pct = totCap > 0 ? (totHours / totCap) : 0;
    return { totHours: round2(totHours), totCap: round2(totCap), pct };
  }, [bars]);

  // Fetch
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

      <div style={S.info}>
        <span style={S.infoDot} />
        Anzeige umfasst <strong>alle nicht fertigen</strong> Tasks mit <code>endDatum ≤ „bis“</code>.
        Überfällige (<code>endDatum &lt; „von“</code>) werden als <em>Carry-In</em> dem ersten Tag der Ansicht zugerechnet.
      </div>

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
          {loading ? <Loader /> : (
            <Heatmap
              stations={stations}
              days={days}
              selected={selected}
              onSelect={(stationName, dayIso) => setSelected({ station: stationName, day: dayIso })}
              onOpenBacklog={(stationName, dayIso) => openBacklogSafe(stationName, dayIso)}
            />
          )}
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
  const maxCap = Math.max(1, ...bars.map(b => b.capacity));
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

function Heatmap({ stations, days, selected, onSelect, onOpenBacklog }) {
  if (!stations || stations.length === 0) return <div style={S.muted}>Keine Stationen.</div>;
  if (!days || days.length === 0) return <div style={S.muted}>Kein Zeitraum gewählt.</div>;

  const indexByDate = (daysArr) => {
    const map = {};
    for (const d of (daysArr || [])) map[d.date] = d;
    return map;
  };

  const dayTotals = days.map(d => 0);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={{ ...S.th, minWidth: 180, position: "sticky", left: 0, zIndex: 2, background: "#0b0c10", textAlign: "left" }}>Station</th>
            {days.map(d => {
              const wday = new Date(d + "T00:00:00").getDay();
              const isWE = (wday === 0 || wday === 6);
              return (
                <th
                  key={d}
                  style={{
                    ...S.th, textAlign: "center",
                    background: isWE ? "#0d1117" : "#0b0c10",
                    borderBottom: isWE ? "1px dashed #263142" : S.th.borderBottom
                  }}
                  title={formatDayLong(d)}
                >
                  {formatDayShort(d)}
                </th>
              );
            })}
            <th style={{ ...S.th, minWidth: 68 }}>Σ</th>
          </tr>
        </thead>
        <tbody>
          {stations.map(s => {
            const cap = toNumber(s.dailyCapacityHours, 8.0);
            const cells = indexByDate(s.days || []);
            let rowSum = 0;

            return (
              <tr key={s.station}>
                <td style={{ ...S.tdSticky, textAlign: "left" }}>{s.station || "nicht zugeordnet"}</td>
                {days.map((d, i) => {
                  const val = cells[d]?.hoursPlanned || 0;
                  rowSum += val;
                  dayTotals[i] += val;
                  const pct = cap > 0 ? (val / cap) : 0;
                  const bg = heatColor(pct);
                  const color = "#e5e7eb";
                  const label = val ? `${round1(val)}h · ${Math.round(pct*100)}%` : "";
                  const wday = new Date(d + "T00:00:00").getDay();
                  const isWE = (wday === 0 || wday === 6);
                  const isSel = selected && selected.station === (s.station || "nicht zugeordnet") && selected.day === d;

                  return (
                    <td
                      key={d}
                      style={{
                        ...S.td,
                        background: bg,
                        color,
                        outline: isWE ? "1px dashed rgba(255,255,255,0.08)" : "none",
                        cursor: "pointer",
                        boxShadow: isSel ? "inset 0 0 0 2px #93c5fd" : "none"
                      }}
                      title={`${formatISO(d)} · ${round2(val)}h / ${round2(cap)}h`}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect && onSelect(s.station || "nicht zugeordnet", d); }}
                      onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenBacklog && onOpenBacklog(s.station || "nicht zugeordnet", d); }}
                    >
                      {label}
                    </td>
                  );
                })}
                <td style={{ ...S.td, fontWeight: 700 }}>{rowSum ? round1(rowSum) : ""}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ ...S.tdSticky, fontWeight: 700, textAlign: "left", background: "#0b0c10" }}>Σ Tag</td>
            {days.map((d, i) => {
              const wday = new Date(d + "T00:00:00").getDay();
              const isWE = (wday === 0 || wday === 6);
              return (
                <td key={`sum-${d}`} style={{
                  ...S.td, fontWeight: 700,
                  background: isWE ? "#0d1117" : "#0b0c10"
                }}>
                  {dayTotals[i] ? round1(dayTotals[i]) : ""}
                </td>
              );
            })}
            <td style={{ ...S.td, fontWeight: 800 }}>
              {round1(dayTotals.reduce((a, b) => a + b, 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Loader() { return <div style={S.muted}>Lade…</div>; }

/* ----------------------------- Styles ----------------------------- */

const S = {
  wrap: { padding: 12 },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  h2: { margin: 0, color: "#e5e7eb", fontSize: 20 },
  h3: { margin: 0, color: "#e5e7eb", fontSize: 16 },
  toolbar: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  preset: { display: "flex", gap: 6, alignItems: "center" },
  btn: { padding: "6px 10px", borderRadius: 8, border: "1px solid #ffffff22", background: "#1a1d23", color: "#e5e7eb", cursor: "pointer" },
  datePick: { display: "flex", alignItems: "center", gap: 6 },
  lbl: { color: "#9ca3af", fontSize: 12 },
  input: { padding: "6px 8px", borderRadius: 8, border: "1px solid #2f3540", background: "#111318", color: "#e5e7eb", outline: "none" },
  row: { marginBottom: 12 },
  card: { background: "#0b0c10", border: "1px solid #1f2430", borderRadius: 12, padding: 12, boxShadow: "0 4px 16px rgba(0,0,0,.25)" },
  cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  muted: { color: "#9ca3af" },
  error: { margin: "8px 0 12px 0", padding: 10, borderRadius: 10, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.35)", color: "#fecaca" },
  summary: { padding: "4px 8px", borderRadius: 8, border: "1px solid", fontWeight: 700, background: "#15171b" },
  info: { display: "flex", alignItems: "center", gap: 8, margin: "-4px 0 12px", padding: "8px 10px", borderRadius: 10, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.35)", color: "#cbd5e1", fontSize: 13 },
  infoDot: { width: 8, height: 8, borderRadius: 9999, background: "#3b82f6", display: "inline-block" },
  barRow: { display: "grid", gridTemplateColumns: "220px 1fr 120px", alignItems: "center", gap: 10 },
  barLabel: { color: "#e5e7eb", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  barTrack: { position: "relative", height: 18, background: "#0f1116", borderRadius: 9, border: "1px solid #262b36", overflow: "hidden" },
  barCap: { position: "absolute", left: 0, top: 0, bottom: 0, background: "#1f2937" },
  barVal: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 0 },
  barValText: { color: "#9ca3af", fontFamily: "monospace", textAlign: "right" },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 2, tableLayout: "fixed" },
  th: { color: "#9ca3af", fontWeight: 600, fontSize: 12, padding: 6, position: "relative", top: 0, background: "#0b0c10", borderBottom: "1px solid #273042" },
  td: { color: "#e5e7eb", fontSize: 12, padding: 6, textAlign: "center", borderRadius: 6, border: "1px solid #0f1116", minWidth: 60 },
  tdSticky: { color: "#e5e7eb", fontSize: 13, padding: 6, position: "sticky", left: 0, zIndex: 1, background: "#0b0c10", borderRight: "1px solid #1f2430", whiteSpace: "nowrap" }
};

/* ----------------------------- Utils ----------------------------- */

function enumerateDays(from, to) { if (!from || !to) return []; const start = new Date(from + "T00:00:00"); const end = new Date(to + "T00:00:00"); const out = []; for (let d = start; d <= end; d.setDate(d.getDate() + 1)) out.push(formatISO(d)); return out; }
function formatISO(d) { if (typeof d === "string") return d; const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const dd = String(d.getDate()).padStart(2, "0"); return `${y}-${m}-${dd}`; }
function formatDayShort(dateStr) { const d = new Date(dateStr + "T00:00:00"); const wd = ["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()]; const day = String(d.getDate()).padStart(2, "0"); return `${wd} ${day}`; }
function formatDayLong(dateStr) { const d = new Date(dateStr + "T00:00:00"); return d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit" }); }
function round2(n){return Math.round((Number(n)||0)*100)/100} function round1(n){return Math.round((Number(n)||0)*10)/10}
function toNumber(v,def=0){const n=Number(v); return Number.isFinite(n)?n:def;}
function heatColor(pct){ if(!Number.isFinite(pct)) return "#111318"; if(pct<=0) return "#0f1116"; if(pct<0.6) return "#0ea5e9"; if(pct<0.8) return "#10b981"; if(pct<1.0) return "#f59e0b"; if(pct<1.5) return "#ef4444"; return "#991b1b"; }

/* ----------------------------- Presets ----------------------------- */

function presetThisWeek(){ const now=new Date(); const {from,to}=weekRangeFromDate(now); return {from,to}; }
function presetNextWeek(){ const now=new Date(); now.setDate(now.getDate()+7); const {from,to}=weekRangeFromDate(now); return {from,to}; }
function weekRangeFromDate(d){ const date=new Date(d); const day=(date.getDay()+6)%7; const start=new Date(date); start.setDate(date.getDate()-day); const end=new Date(start); end.setDate(start.getDate()+6); return {from:formatISO(start), to:formatISO(end)}; }
function presetThisMonth(){ const now=new Date(); const y=now.getFullYear(); const m=now.getMonth(); const from=new Date(y,m,1); const to=new Date(y,m+1,0); return {from:formatISO(from), to:formatISO(to)}; }
function presetNextMonth(){ const now=new Date(); const y=now.getFullYear(); const m=now.getMonth()+1; const from=new Date(y,m,1); const to=new Date(y,m+1,0); return {from:formatISO(from), to:formatISO(to)}; }

/* ----------------------------- Navigation ----------------------------- */
/** Öffnet eigenständiges Backlog-Fenster (API-basiert, ohne SPA-Routing) */
function openBacklogSafe(stationName, dayIso) {
  const qs = new URLSearchParams({
    from: dayIso,
    to: dayIso,
    station: stationName || "nicht zugeordnet",
    includeNoDate: "false"
  }).toString();

  const w = window.open("", "_blank", "noopener");
  if (!w) return;

  const html = `
<!doctype html><html lang="de"><head>
<meta charset="utf-8">
<title>Rückstandsliste – ${escapeHtml(stationName)} – ${escapeHtml(dayIso)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { --ink:#111; --muted:#4b5563; --line:#d1d5db; --bg:#fff; }
  *{box-sizing:border-box}
  body{font:11pt/1.35 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:var(--ink);background:var(--bg);margin:10mm;}
  header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6mm;}
  h1{margin:0;font-size:16pt}
  .meta{color:var(--muted);font-size:9pt}
  .total{margin:2mm 0 5mm;font-weight:700}
  .block{break-inside:avoid;page-break-inside:avoid;margin:0 0 6mm}
  .head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2mm}
  .head h2{margin:0;font-size:12pt}
  .sum{border:1px solid var(--line);padding:1.2mm 2mm;border-radius:4px;font-weight:700}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid var(--line);padding:1.8mm;vertical-align:top;font-size:9pt}
  th{background:#f3f4f6}
  td.tc{text-align:center}
  td.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;text-align:right}
  @page{size:A4 portrait;margin:10mm}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head>
<body>
<header>
  <h1>Rückstandsliste</h1>
  <div class="meta">Station: ${escapeHtml(stationName || "alle")} · Datum: <span id="d">${escapeHtml(dayIso)}</span></div>
</header>
<div id="root">Lade…</div>
<script>
  function esc(s){return (s||"").replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))}
  function fmtDate(s){try{const d=new Date(s+"T00:00:00");return d.toLocaleDateString("de-DE")}catch{return s}}
  function round1(n){n=Number(n)||0;return Math.round(n*10)/10}
  (function(){ var el=document.getElementById("d"); if(el) el.textContent = fmtDate(el.textContent); })();

  function build(rows){
    if(!Array.isArray(rows)||rows.length===0){return "<div>Keine Daten.</div>"}
    const groups=new Map();
    for(const r of rows){
      const k=r.station||"nicht zugeordnet";
      if(!groups.has(k)) groups.set(k,[]);
      groups.get(k).push(r);
    }
    let total=0;
    let html="";
    for(const [station,arr] of groups){
      const sum = arr.reduce((a,r)=>a+(Number(r.aufwandStunden)||0),0);
      total+=sum;
      html+=\`
      <section class="block">
        <div class="head">
          <h2>\${esc(station)}</h2>
          <div class="sum">Summe: \${round1(sum)} h</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Bezeichnung</th>
              <th>Kunde</th>
              <th>Teilenummer</th>
              <th>Fällig</th>
              <th>Aufw. (h)</th>
              <th>Stk.</th>
              <th>Status</th>
              <th>Zusatzarbeiten</th>
            </tr>
          </thead>
          <tbody>
            \${arr.map(r=>\`
              <tr>
                <td>\${esc(r.bezeichnung||"—")}</td>
                <td>\${esc(r.kunde||"—")}</td>
                <td>\${esc(r.teilenummer||"—")}</td>
                <td class="tc">\${esc(r.endDatum?fmtDate(r.endDatum):"—")}</td>
                <td class="mono">\${round1(r.aufwandStunden)}</td>
                <td class="tc">\${r.stueckzahl ?? "—"}</td>
                <td class="tc">\${esc(r.statusLabel || r.statusCode || "—")}</td>
                <td>\${esc(r.zusatzarbeiten || "")}</td>
              </tr>\`).join("")}
          </tbody>
        </table>
      </section>\`;
    }
    return \`<div class="total">Gesamtstunden: \${round1(total)} h</div>\` + html;
  }
  fetch("/api/dashboard/backlog?${qs}")
    .then(r=>r.ok?r.json():Promise.reject(r.status))
    .then(rows=>{ document.getElementById("root").innerHTML = build(rows); })
    .catch(_=>{ document.getElementById("root").innerHTML = "<div>Fehler beim Laden.</div>"; });
</script>
</body></html>`;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/* kleine Helper fürs HTML-Titel */
function escapeHtml(s){ return String(s ?? "").replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

/* ----------------------------- Export ----------------------------- */
export default UtilizationDashboard;
