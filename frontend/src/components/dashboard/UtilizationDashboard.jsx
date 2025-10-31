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
