// frontend/src/components/TaskItem.jsx
import React from "react";

export default function TaskItem({ task, onEdit, dimmed = false, highlightText = "" }) {
  if (!task) return null;

  const {
    id,
    bezeichnung = "",
    zusätzlicheInfos,
    endDatum,
  } = task;

  const formatDate = (d) => {
    if (!d) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      // optional: nach DD.MM.YYYY umstellen
      const [y, m, day] = d.split("-");
      return `${day}.${m}.${y}`;
    }
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${day}.${m}.${y}`;
  };

  const wrap = {
    background: "linear-gradient(180deg,#0b1220,#0f172a)",
    border: "1px solid #1f2937",
    borderRadius: 12,
    padding: 12,
    color: "#e5e7eb",
    boxShadow: "0 4px 16px rgba(0,0,0,.35)",
    transition: "transform .12s ease, box-shadow .12s ease, opacity .18s ease, filter .18s ease",
    opacity: dimmed ? 0.45 : 1,
    filter: dimmed ? "grayscale(.5) blur(.2px)" : "none",
    userSelect: "none",
    cursor: "default",
  };

  const titleWithHighlight = (txt, q) => {
    if (!q) return <span>{txt || "(ohne Bezeichnung)"}</span>;
    const i = String(txt).toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return <span>{txt}</span>;
    const a = txt.slice(0, i);
    const b = txt.slice(i, i + q.length);
    const c = txt.slice(i + q.length);
    return (
      <span>
        {a}
        <mark style={{ background: "rgba(59,130,246,.2)", color: "#e5e7eb", padding: "0 2px", borderRadius: 4 }}>{b}</mark>
        {c}
      </span>
    );
  };

  return (
    <article
      className="task-card"
      onDoubleClick={() => onEdit?.(task)}            // ⬅️ nur Doppelklick öffnet Edit
      style={wrap}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onEdit?.(task);
      }}
    >
      <h3
        style={{
          margin: 0, fontSize: 14, fontWeight: 800, color: "#dbeafe",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
        }}
        title={bezeichnung}
      >
        {titleWithHighlight(bezeichnung, highlightText)}
      </h3>

      {zusätzlicheInfos && (
        <p
          style={{ margin: "8px 0 0", fontSize: 12.5, color: "#cbd5e1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
          title={zusätzlicheInfos}
        >
          {zusätzlicheInfos}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
        <span>#{id}</span>
        {endDatum ? <span>{formatDate(endDatum)}</span> : <span />}
      </div>
    </article>
  );
}
