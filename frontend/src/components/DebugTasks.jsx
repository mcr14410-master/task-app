import React, { useEffect, useState } from "react";

export default function DebugTasks() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/tasks", { headers: { Accept: "application/json" } });
        const text = await res.text();

        try {
          const json = JSON.parse(text);
          console.log("GET /api/tasks JSON:", json);
          setData(json);
        } catch (e) {
          console.error("GET /api/tasks returned non-JSON:", text);
          setErr("Antwort ist kein JSON. Proxy/Backend prüfen. Details in der Konsole.");
        }
      } catch (e) {
        console.error("Fetch error:", e);
        setErr(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p>lade…</p>;
  if (err) return <pre style={{ whiteSpace: "pre-wrap", color: "red" }}>Fehler: {err}</pre>;

  // Array aus typischen Formen herausziehen
  const arr = Array.isArray(data) ? data
            : Array.isArray(data?.content) ? data.content
            : Array.isArray(data?.items) ? data.items
            : [];

  if (!Array.isArray(arr)) {
    return <pre>Unerwartetes Format:\n{JSON.stringify(data, null, 2)}</pre>;
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Debug Tasks</h1>
      <p>{arr.length} Tasks geladen</p>
      <ul>
        {arr.map((t) => (
          <li key={t.id}>
            #{t.id} {t.bezeichnung ?? "(ohne Bezeichnung)"} — {t.arbeitsstation ?? "—"}
          </li>
        ))}
      </ul>
    </div>
  );
}
