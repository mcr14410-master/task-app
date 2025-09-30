import React, { useMemo } from "react";
import { useTasks } from "@/hooks/useTasks";

export default function BoardLite() {
  const { tasks, loading } = useTasks();

  if (loading) return <p style={{ padding: 16 }}>lade…</p>;

  const list = Array.isArray(tasks) ? tasks : [];

  const { grouped, stations } = useMemo(() => {
    const g = list.reduce((acc, t) => {
      const key = t?.arbeitsstation ?? "Unassigned";
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    }, {});
    // simple Sortierung: prioritaet, dann id
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
  }, [list]);

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Board (Hook, ohne DnD)</h1>
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
