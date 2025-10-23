import React, { useMemo } from "react";

const styles = {
  wrap: { background:"#0f172a", color:"#e5e7eb", border:"1px solid #1f2937", borderRadius:12, padding:16 },
  grid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 },
  card: { background:"#111827", border:"1px solid #1f2937", borderRadius:12, padding:14 },
  h: { margin:"0 0 10px 0", fontSize:14, color:"#93c5fd", letterSpacing:".04em", textTransform:"uppercase" },
  list: { display:"grid", gap:10 },
  item: { background:"#0b1220", border:"1px solid #1f2937", borderRadius:10, padding:12 },
  meta: { fontSize:12, color:"#93a0b0", display:"flex", gap:8, flexWrap:"wrap", marginBottom:6 },
  badge: (c="#374151") => ({ padding:"2px 8px", borderRadius:999, background:c, fontSize:11, border:"1px solid #ffffff22" }),
  title: { margin:"0 0 6px 0", fontWeight:700 },
  text: { margin:0, color:"#cfd7e3", lineHeight:1.5 },
  small: { fontSize:12, color:"#9ca3af", marginTop:8 }
};

/**
 * InfoTab – zeigt Changelog & News nebeneinander.
 * Optional können per Props eigene Einträge übergeben werden.
 */
export default function InfoTab({
  changelogEntries,
  newsItems
}) {
  const fallbackChangelog = useMemo(() => ([
    {
      version: "v0.12.0",
      date: "2025-10-23",
      changes: [
        { type: "feat", text: "Settings: Kunden & Zuständigkeiten mit Inline-CRUD" },
        { type: "feat", text: "TaskCreate/Edit: Hybridfelder (Dropdown + Freitext) für Kunde/Zuständigkeit" },
        { type: "fix",  text: "AdditionalWork.flags auf PostgreSQL jsonb gemappt" },
        { type: "ui",   text: "Status-Dropdown gruppiert (Aktiv/Inaktiv) + stabile Sortierung" }
      ]
    },
    {
      version: "v0.11.1",
      date: "2025-10-22",
      changes: [
        { type: "fix", text: "Anhänge werden beim Task-Löschen korrekt entfernt" }
      ]
    }
  ]), []);

  const fallbackNews = useMemo(() => ([
    {
      title: "Neuer Info-Tab",
      date: "2025-10-23",
      body: "Hier findest du ab sofort Changelog & Projekt-News zentral an einer Stelle.",
      tags: ["product"]
    },
    {
      title: "Nächste Schritte",
      date: "2025-10-24",
      body: "Import/Export (ERP) vorbereiten, DueDate-Regeln & Design-Tokens konsolidieren.",
      tags: ["roadmap"]
    }
  ]), []);

  const cl = Array.isArray(changelogEntries) && changelogEntries.length ? changelogEntries : fallbackChangelog;
  const nw = Array.isArray(newsItems) && newsItems.length ? newsItems : fallbackNews;

  return (
    <div style={styles.wrap}>
      <div style={styles.grid}>
        {/* Changelog */}
        <section style={styles.card} aria-labelledby="info-changelog">
          <h3 id="info-changelog" style={styles.h}>Changelog</h3>
          <div style={styles.list}>
            {cl.map((rel) => (
              <article key={rel.version} style={styles.item}>
                <div style={styles.meta}>
                  <span style={styles.badge("#1f3b63")}>{rel.version}</span>
                  <time dateTime={rel.date}>{rel.date}</time>
                </div>
                <ul style={{ margin:0, paddingLeft:18 }}>
                  {rel.changes.map((c, i) => (
                    <li key={i} style={{ marginBottom:4 }}>
                      <span style={styles.badge(colorForType(c.type))}>{c.type}</span>
                      <span style={{ marginLeft:8 }}>{c.text}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p style={styles.small}>
            Tipp: Halte Commit-Messages im Format <code>type(scope): message</code> – dann wird der Verlauf schön lesbar.
          </p>
        </section>

        {/* News */}
        <section style={styles.card} aria-labelledby="info-news">
          <h3 id="info-news" style={styles.h}>News</h3>
          <div style={styles.list}>
            {nw.map((n, idx) => (
              <article key={idx} style={styles.item}>
                <div style={styles.meta}>
                  {Array.isArray(n.tags) && n.tags.map((t, i) => (
                    <span key={i} style={styles.badge("#2b3b2a")}>{t}</span>
                  ))}
                  <time dateTime={n.date}>{n.date}</time>
                </div>
                <h4 style={styles.title}>{n.title}</h4>
                <p style={styles.text}>{n.body}</p>
              </article>
            ))}
          </div>
          <p style={styles.small}>
            Dies ist statischer Inhalt im Frontend. Später können wir auf <code>/api/info</code> oder eine <code>changelog.json</code> umstellen.
          </p>
        </section>
      </div>
    </div>
  );
}

function colorForType(t) {
  switch ((t||"").toLowerCase()) {
    case "feat": return "#1f3653";
    case "fix": return "#422929";
    case "ui": return "#1f2b3a";
    case "docs": return "#312b3a";
    case "refactor": return "#2c2c2c";
    default: return "#374151";
  }
}
