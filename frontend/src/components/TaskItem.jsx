// frontend/src/components/TaskItem.jsx
import React from "react";
import "@/config/TaskStatusTheme.css"; // zentrale Status-Pill-Farben
import "@/config/DueDateTheme.css";    // zentrale Fälligkeits-Farben
import "@/config/AdditionalWorkTheme.css"; // Zusatzarbeiten (FAI/QS)
import { dueClassForDate } from "@/config/DueDateConfig"; // zentrale Schwellen-Logik

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
const IconPaperclip = (p) => (
  <Icon {...p} path={<g><path d="M21.44 11.05l-8.49 8.49a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a4 4 0 1 1 5.66 5.66l-9.19 9.19a2.5 2.5 0 0 1-3.54-3.54l8.49-8.49"/></g>} />
);
const IconBriefcase = (p) => (
  <Icon {...p} path={<path d="M20 7h-5V6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v1H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />} />
);
// Ordner-Icon (lokalen Pfad kopieren/öffnen)
const IconFolderOpen = (p) => (
  <Icon {...p} path={<g><path d="M3 7h5l2 2h11v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7v10"/><path d="M21 9H10L8 7H3"/></g>} />
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

function statusKey(raw) {
  const s = String(raw || "").toUpperCase().replaceAll("-", "_").replaceAll(" ", "_");
  switch (s) {
    case "NEU": return "NEU";
    case "TO_DO":
    case "TODO": return "TO_DO";
    case "IN_BEARBEITUNG":
    case "IN_PROGRESS": return "IN_BEARBEITUNG";
    case "FERTIG":
    case "DONE": return "FERTIG";
    default: return "NEU";
  }
}

/** Zusatzarbeiten-Pills (nur sichtbar, wenn aktiv) */
function AddPills({ task }) {
  const pills = [];
  if (task?.fai) pills.push(<span key="fai" className="pill-add add-fai is-active">FAI</span>);
  if (task?.qs)  pills.push(<span key="qs"  className="pill-add add-qs  is-active">QS</span>);
  return pills.length ? (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>{pills}</span>
  ) : null;
}

export default function TaskItem({ task, openAttachmentsModal }) {
  const {
    bezeichnung, titel,
    teilenummer, kunde, zuständig,
    aufwandStunden, endDatum,
  } = task || {};

  const key = statusKey(task?.status);
  const pillClass = `pill st-${key.toLowerCase()}`;

  // Fälligkeitsklasse anhand zentraler Logik
  const dueCls = endDatum ? dueClassForDate(endDatum) : "due-future";

  // robust: singular & plural unterstützen (attachmentCount vs attachmentsCount)
  const attachCount = Number.isFinite(task?.attachmentCount)
    ? task.attachmentCount
    : (Number.isFinite(task?.attachmentsCount) ? task.attachmentsCount : 0);
  const hasAttachments = attachCount > 0;
  const hasPath = typeof task?.dateipfad === "string" && task.dateipfad.trim().length > 0;

  const iconBtnStyle = { border: "none", background: "transparent", padding: 4, cursor: "pointer", opacity: 0.85 };

  return (
    <>
      {/* Titel-Zeile mit Icons rechts */}
      <h4 className="title" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
        <span>{bezeichnung ?? titel ?? "(ohne Bezeichnung)"}</span>

        <span style={{display:"inline-flex",gap:8,alignItems:"center"}}>
          {hasAttachments ? (
            <button
              className="icon-btn"
              style={iconBtnStyle}
              title={`${attachCount} Anhang${attachCount === 1 ? "" : "e"} anzeigen`}
              onClick={(e) => {
                e.stopPropagation();
                if (typeof openAttachmentsModal === "function") {
                  openAttachmentsModal(task);
                } else {
                  window.open(`/api/tasks/${task.id}/attachments`, "_blank", "noopener");
                }
              }}
            >
              <IconPaperclip />
              <span style={{fontSize:12, marginLeft:4}}>{attachCount}</span>
            </button>
          ) : null}

          {hasPath ? (
            <button
              className="icon-btn"
              style={iconBtnStyle}
              title={`Dateipfad kopieren: ${task.dateipfad}`}
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await navigator.clipboard.writeText(task.dateipfad);
                } catch {
                  try { window.open(task.dateipfad, "_blank", "noopener"); } catch {}
                }
              }}
            >
              <IconFolderOpen />
            </button>
          ) : null}
        </span>
      </h4>

      {/* Zeile 1: Teilenummer | Kunde */}
      <div className="row" style={{ marginBottom: 6 }}>
        <div className="meta" title={teilenummer || "-"}>
          <IconTag />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {teilenummer || "-"}
            {task?.fa ? <span className="badge" style={{ marginLeft: 8 }}>FA: {task.fa}</span> : null}
            {(Number.isFinite(task?.stk) && task.stk > 0) ? <span className="badge" style={{ marginLeft: 8 }}>Stk × {task.stk}</span> : null}
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

      {/* Zeile 3: Datum links (mit Due-Klasse) | Zusatzarbeiten + Status rechts */}
      <div className="row">
        {endDatum ? (
          <div className={`meta date ${dueCls}`} title={formatDate(endDatum)}>
            <IconCalendar />
            <span className="date-text">{formatDate(endDatum)}</span>
          </div>
        ) : <div />}

        <div style={{ marginLeft: "auto", display: "inline-flex", gap: 6, alignItems: "center" }}>
          <AddPills task={task} />
          <span className={pillClass} data-status={key} title={`Status: ${key}`}>
            {key}
          </span>
        </div>
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
