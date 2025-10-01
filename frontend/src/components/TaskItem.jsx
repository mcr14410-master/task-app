// frontend/src/components/TaskItem.jsx
import React from "react";

const Icon = ({ size = 16, stroke = "#9ca3af", path }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
       viewBox="0 0 24 24" fill="none" stroke={stroke}
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       style={{ flex: "0 0 auto" }}>
    {path}
  </svg>
);
const IconTag = (p) => (
  <Icon {...p} path={<g><path d="M20.59 13.41L11 3H4v7l9.59 9.59a2 2 0 0 0 2.82 0l4.18-4.18a2 2 0 0 0 0-2.82z"/><circle cx="6.5" cy="6.5" r="1.5"/></g>} />
);
const IconUser = (p) => (
  <Icon {...p} path={<g><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></g>} />
);
const IconClock = (p) => (
  <Icon {...p} path={<g><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></g>} />
);
const IconCalendar = (p) => (
  <Icon {...p} path={<g><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></g>} />
);
const IconBriefcase = (p) => (
  <Icon {...p} path={<path d="M20 7h-5V6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v1H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />} />
);

function formatDate(d) {
  if (!d) return null;
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, dd] = d.split("-");
      return `${dd}.${m}.${y}`;
    }
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return d;
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${dd}.${mm}.${yyyy}`;
  } catch {
    return d;
  }
}

/**
 * Nur der Karteninhalt. Rahmen/Glow wird im Board gesetzt.
 * statusTone: { label, bg, border }
 * dueColor: Textfarbe des Datums
 */
export default function TaskItem({ task, dueColor = "#94a3b8", statusTone = { label: "TO DO", bg: "#f59e0b", border: "#7a5d0a" } }) {
  const {
    bezeichnung, titel,
    teilenummer, kunde, zuständig,
    aufwandStunden, endDatum,
  } = task || {};

  return (
    <>
      {/* Titel */}
      <h4 className="title">{bezeichnung ?? titel ?? "(ohne Bezeichnung)"}</h4>

      {/* Zeile 1: Teilenummer | Kunde */}
      <div className="row" style={{ marginBottom: 6 }}>
        <div className="meta" title={teilenummer || "-"}>
          <IconTag />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {teilenummer || "-"}
          </span>
        </div>
        <div className="meta" title={kunde || "-"} style={{ justifyContent: "flex-end" }}>
          <IconBriefcase />
          <span className="meta-right">{kunde || "-"}</span>
        </div>
      </div>

      {/* Zeile 2: Zuständig | Aufwand */}
      <div className="row" style={{ marginBottom: 6 }}>
        <div className="meta" title={zuständig || "offen"}>
          <IconUser />
          <span>{zuständig || "offen"}</span>
        </div>
        <div className="meta" title={`${aufwandStunden || 0}h`}>
          <IconClock />
          <span>{aufwandStunden ? `${aufwandStunden}h` : "0h"}</span>
        </div>
      </div>

      {/* Zeile 3: Datum links | Status rechts */}
      <div className="row">
        {endDatum ? (
          <div className="meta" title={formatDate(endDatum)} style={{ color: dueColor }}>
            <IconCalendar />
            <span style={{ color: dueColor }}>{formatDate(endDatum)}</span>
          </div>
        ) : <div />}

        <span
          className="pill"
          title={`Status: ${statusTone.label}`}
          style={{
            background: statusTone.bg,
            borderColor: statusTone.border,
          }}
        >
          {statusTone.label}
        </span>
      </div>

      {/* Zusatzinfos */}
      {(task?.["zusätzlicheInfos"] ?? task?.zusatzlicheInfos) && (
        <p className="desc" title={task?.["zusätzlicheInfos"] ?? task?.zusatzlicheInfos}>
          {task?.["zusätzlicheInfos"] ?? task?.zusatzlicheInfos}
        </p>
      )}
    </>
  );
}
