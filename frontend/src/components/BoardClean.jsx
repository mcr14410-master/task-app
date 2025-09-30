import React, { useEffect, useMemo, useState } from "react";

export default function BoardClean() {
  const [data, setData] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/tasks", { headers: { Accept: "application/json" } });
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          const arr = Array.isArray(json)
            ? json
            : Array.isArray(json?.content)
            ? json.content
            : Array.isArray(json?.items)
            ? json.items
            : [];
          if (alive) setData(arr);
        } catch {
          if (alive) setErr("Antwort ist kein JSON (Proxy/Backend prüfen).");
        }
      } catch (e) {
        if (alive) setErr(String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const { grouped, stations } = useMemo(() => {
    const g = (Array.isArray(data) ? data : []).reduce((acc, t) => {
      const key = t?.arbeitsstation ?? "Unassigned";
      (acc[key] ||= []).push(t);
      return acc;
    }, {});
    Object.keys(g).forEach((k) => {
      g[k].sort((a, b) => {
        const pa = Number.isFinite(a?.prioritaet) ? a.prioritaet : 999999;
        const pb = Number.isFinite(b?.prioritaet) ? b.prioritaet : 999999;
        if (pa !== pb) return pa - pb;
        return (a?.id ?? 0) - (b?.id ?? 0);
      });
    });
    const keys = Object.keys(g).length ? Object.keys(g) : ["Unassigned"];
    return { grouped: g, stations: keys };
  }, [data]);

  if (loading) return <p style={{ padding: 16 }}>lade…</p>;
  if (err) return <pre style={{ whiteSpace: "pre-wrap", color: "red", padding: 16 }}>Fehler: {err}</pre>;

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Board (Clean, nur Anzeige)</h1>
      <div style={{ display: "flex", gap: 16, overflowX: "auto" }}>
        {stations.map((station) => (
          <div key={station} style={{ minWidth: 260, background: "#f3f4f6", padding: 12, borderRadius: 8 }}>
            <h2 style={{ margin: "0 0 8px 0" }}>{station}</h2>

            {(grouped[station] ?? []).map((t) => (
              <div
                key={t.id}
                style={{
                  background: "white",
                  borderRadius: 8,
                  padding: 8,
                  marginBottom: 8,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.06)"
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
            ))}

            {(!grouped[station] || grouped[station].length === 0) && (
              <div style={{ fontSize: 12, color: "#6b7280" }}>keine Tasks</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
