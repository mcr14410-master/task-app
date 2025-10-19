// frontend/src/components/TaskItem.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "@/config/TaskStatusTheme.css";
import "@/config/DueDateTheme.css";
import "@/config/AdditionalWorkTheme.css";
import { dueClassForDate } from "@/config/DueDateConfig";
import { fetchStatuses } from "@/api/statuses";

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

function AddPills({ task }) {
  const pills = [];
  if (task?.fai) pills.push(<span key="fai" className="pill-add add-fai is-active">FAI</span>);
  if (task?.qs)  pills.push(<span key="qs"  className="pill-add add-qs  is-active">QS</span>);
  return pills.length ? (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>{pills}</span>
  ) : null;
}

export default function TaskItem({ task, openAttachmentsModal }) {
  const { bezeichnung, titel, teilenummer, kunde, zuständig, aufwandStunden, endDatum } = task || {};

  // --- Statusliste + aktueller Status ---
  const [statusOptions, setStatusOptions] = useState([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  // Navigation/Highlight
  const [focusIndex, setFocusIndex] = useState(-1);

  // Feature-Flag: Punkt in der Pill (kann später aktiviert werden)
  const SHOW_STATUS_DOT = false;

  const [currentStatus, setCurrentStatus] = useState(() => {
    if (task?.statusCode) {
      return { code: task.statusCode, label: task.statusCode, colorBg: "#374151", colorFg: "#e5e7eb" };
    }
    if (task?.status) {
      const k = statusKey(task.status);
      return { code: k, label: k, colorBg: undefined, colorFg: undefined };
    }
    return null;
  });

  // Menü-UI
  const [pickerOpen, setPickerOpen] = useState(false);
  const pillRef = useRef(null);
  const menuRef = useRef(null);

  // Status laden (aktive + inaktive)
  useEffect(() => {
    let alive = true;
    setLoadingStatuses(true);
    fetchStatuses(false)
      .then((list) => {
        if (!alive) return;
        setStatusOptions(list || []);
        const code = task?.statusCode;
        if (code && Array.isArray(list)) {
          const s = list.find(x => x.code === code);
          if (s) {
            setCurrentStatus({
              code: s.code, label: s.label,
              colorBg: s.colorBg, colorFg: s.colorFg,
              sortOrder: s.sortOrder, isFinal: s.isFinal
            });
          }
        }
      })
      .finally(() => { if (alive) setLoadingStatuses(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.statusCode]);

  // Gruppierung + stabile Sortierung
  const activeItems = useMemo(() => {
    const list = (statusOptions || []).filter(s => s.active);
    return list.sort((a,b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.label).localeCompare(String(b.label)));
  }, [statusOptions]);

  const inactiveItems = useMemo(() => {
    const list = (statusOptions || []).filter(s => !s.active);
    return list.sort((a,b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.label).localeCompare(String(b.label)));
  }, [statusOptions]);

  // Flache Liste für Navigation/Selektion
  const flatItems = useMemo(() => [...activeItems, ...inactiveItems], [activeItems, inactiveItems]);

  // Hilfsfunktionen: nächsten/vorherigen **aktiven** Index finden (wrap-around)
  const findNextActive = (from) => {
    if (!flatItems.length) return -1;
    for (let i = 1; i <= flatItems.length; i++) {
      const idx = (from + i) % flatItems.length;
      if (flatItems[idx]?.active) return idx;
    }
    return from;
  };
  const findPrevActive = (from) => {
    if (!flatItems.length) return -1;
    for (let i = 1; i <= flatItems.length; i++) {
      const idx = (from - i + flatItems.length) % flatItems.length;
      if (flatItems[idx]?.active) return idx;
    }
    return from;
  };

  // Outside-Klick schließt
  useEffect(() => {
    if (!pickerOpen) return;
    const onClick = (e) => {
      if (!menuRef.current || !pillRef.current) return;
      if (!menuRef.current.contains(e.target) && !pillRef.current.contains(e.target)) {
        setPickerOpen(false);
        setFocusIndex(-1);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [pickerOpen]);

  // Menü fokussieren sobald offen
  useEffect(() => {
    if (pickerOpen && menuRef.current) {
      setTimeout(() => menuRef.current && menuRef.current.focus(), 0);
    }
  }, [pickerOpen]);

  // Fokus-Index initialisieren (beim Öffnen / wenn Liste kommt)
  useEffect(() => {
    if (pickerOpen && flatItems.length) {
      const activeCode = currentStatus?.code || task?.statusCode;
      let idx = flatItems.findIndex(x => x.code === activeCode);
      if (idx < 0) idx = 0;
      // Wenn Start auf inaktiv landet, zum nächsten aktiven springen
      if (!flatItems[idx]?.active) idx = findNextActive(idx);
      setFocusIndex(idx);
    }
  }, [pickerOpen, flatItems, currentStatus?.code, task?.statusCode]);

  async function changeStatus(code) {
    if (!code || savingStatus) return;
    const target = flatItems.find(x => x.code === code);
    if (!target?.active) return; // UI-Schutz: niemals inaktiven wählen
    try {
      // Final-Guard
      if (target.isFinal && target.code !== currentStatus?.code) {
        const ok = window.confirm(`Status „${target.label}“ ist final. Wirklich setzen?`);
        if (!ok) return;
      }

      setSavingStatus(true);
      const res = await fetch(`/api/tasks/${task.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusCode: code })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `PATCH failed (${res.status})`);
      }
      if (target) {
        setCurrentStatus({
          code: target.code, label: target.label,
          colorBg: target.colorBg, colorFg: target.colorFg,
          sortOrder: target.sortOrder, isFinal: target.isFinal
        });
      } else {
        setCurrentStatus({ code, label: code, colorBg: "#374151", colorFg: "#e5e7eb" });
      }
      setPickerOpen(false);
      setFocusIndex(-1);
    } catch (e) {
      alert(`Statuswechsel fehlgeschlagen: ${e?.message || e}`);
    } finally {
      setSavingStatus(false);
    }
  }

  const key = statusKey(task?.status);
  const pillClass = `pill st-${key.toLowerCase()}`;
  const dueCls = endDatum ? dueClassForDate(endDatum) : "due-future";

  const attachCount = Number.isFinite(task?.attachmentCount)
    ? task.attachmentCount
    : (Number.isFinite(task?.attachmentsCount) ? task.attachmentsCount : 0);
  const hasAttachments = attachCount > 0;
  const hasPath = typeof task?.dateipfad === "string" && task.dateipfad.trim().length > 0;

  const iconBtnStyle = { border: "none", background: "transparent", padding: 4, cursor: "pointer", opacity: 0.85 };
  const rightZoneStyle = { position: "relative", marginLeft: "auto", display: "inline-flex", gap: 6, alignItems: "center" };

  return (
    <>
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

      {/* Datum links | rechts Zusatz + Status */}
      <div className="row">
        {endDatum ? (
          <div className={`meta date ${dueCls}`} title={formatDate(endDatum)}>
            <IconCalendar />
            <span className="date-text">{formatDate(endDatum)}</span>
          </div>
        ) : <div />}

        <div style={rightZoneStyle}>
          <AddPills task={task} />

          {/* Klickbare Status-Pill (öffnet Menü) */}
          {currentStatus?.colorBg && currentStatus?.colorFg ? (
            <button
              ref={pillRef}
              type="button"
              className="pill"
              onClick={() => {
                setPickerOpen(v => {
                  const next = !v;
                  if (next) {
                    let idx = flatItems.findIndex(x => x.code === (currentStatus?.code || task?.statusCode));
                    if (idx < 0) idx = 0;
                    if (!flatItems[idx]?.active) idx = findNextActive(idx);
                    setFocusIndex(idx);
                  }
                  return next;
                });
              }}
              disabled={loadingStatuses || savingStatus}
              aria-haspopup="menu"
              aria-expanded={pickerOpen}
              title={`Status: ${currentStatus.label} (klicken zum Ändern)`}
              style={{
                display:'inline-flex', alignItems:'center', gap:6,
                padding:'2px 8px', borderRadius:999,
                background: currentStatus.colorBg, color: currentStatus.colorFg,
                border:'1px solid #ffffff22', cursor:'pointer'
              }}
            >
              {/* optionaler Punkt (Feature-Flag oben) */}
              {/* {SHOW_STATUS_DOT && (
                <span aria-hidden style={{ width:6, height:6, borderRadius:999, background:'currentColor', opacity:.9 }} />
              )} */}
              <span>{currentStatus.label}</span>
            </button>
          ) : (
            <button
              ref={pillRef}
              type="button"
              className={pillClass}
              data-status={key}
              onClick={() => setPickerOpen(v => !v)}
              disabled={loadingStatuses || savingStatus}
              aria-haspopup="menu"
              aria-expanded={pickerOpen}
              title={`Status: ${key} (klicken zum Ändern)`}
              style={{ cursor:'pointer' }}
            >
              {key}
            </button>
          )}

          {/* Kontextmenü */}
          {pickerOpen && (
            <div
              ref={menuRef}
              role="menu"
              aria-label="Status auswählen"
              tabIndex={-1}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setPickerOpen(false);
                  setFocusIndex(-1);
                  return;
                }
                if (!flatItems.length) return;

                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setFocusIndex(i => {
                    const base = i >= 0 ? i : 0;
                    return findNextActive(base);
                  });
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setFocusIndex(i => {
                    const base = i >= 0 ? i : 0;
                    return findPrevActive(base);
                  });
                } else if (e.key === 'Enter' || e.key === 'NumpadEnter') {
                  e.preventDefault();
                  const idx = focusIndex >= 0 ? focusIndex : 0;
                  const item = flatItems[idx];
                  if (item?.active && !savingStatus) changeStatus(item.code);
                }
              }}
              style={{
                position:'absolute', top:'calc(100% + 6px)', right:0,
                minWidth: 260, maxHeight: '50vh', overflowY: 'auto',
                background:'var(--color-surface, #111827)', color:'var(--color-text, #e5e7eb)',
                border:'1px solid #ffffff22', borderRadius:12, boxShadow:'0 10px 30px rgba(0,0,0,0.45)',
                padding:6, zIndex: 50
              }}
            >
              {/* Abschnitt: Aktiv */}
              <div style={{ padding: '6px 10px', fontSize: 12, opacity:.8 }}>Aktiv</div>
              {activeItems.map((s, aIdx) => {
                const idx = aIdx; // Position im flatItems
                const isActiveSel = s.code === currentStatus?.code || s.code === task?.statusCode;
                return (
                  <button
                    key={s.code}
                    role="menuitemradio"
                    aria-checked={isActiveSel}
                    onClick={() => changeStatus(s.code)}
                    onMouseEnter={() => setFocusIndex(idx)}
                    disabled={savingStatus}
                    title={s.label}
                    ref={el => { if (el && focusIndex === idx) el.scrollIntoView({ block:'nearest' }); }}
                    style={{
                      width:'100%', textAlign:'left',
                      display:'flex', alignItems:'center', gap:8,
                      padding:'8px 10px', borderRadius:8, border:'none',
                      background: (isActiveSel ? '#ffffff14' : (focusIndex === idx ? '#ffffff10' : 'transparent')),
                      outline: (focusIndex === idx ? '1px solid #ffffff33' : 'none'),
                      color:'inherit', cursor:'pointer'
                    }}
                  >
                    <span style={{ width:12, height:12, borderRadius:999, border:'1px solid #00000033', background: s.colorBg }} />
                    <span style={{ flex: 1 }}>{s.label}</span>
                    {isActiveSel && <span aria-hidden>✓</span>}
                  </button>
                );
              })}

              {/* Abschnitt: Inaktiv */}
              {inactiveItems.length > 0 && (
                <>
                  <div style={{ height:8 }} />
                  <div style={{ padding: '6px 10px', fontSize: 12, opacity:.6 }}>Inaktiv</div>
                  {inactiveItems.map((s, iIdx) => {
                    const idx = activeItems.length + iIdx; // Position im flatItems
                    const isActiveSel = s.code === currentStatus?.code || s.code === task?.statusCode;
                    return (
                      <button
                        key={s.code}
                        role="menuitemradio"
                        aria-checked={isActiveSel}
                        aria-disabled="true"
                        disabled
                        onMouseEnter={() => setFocusIndex(idx)}
                        title="Inaktiv – nicht wählbar"
                        ref={el => { if (el && focusIndex === idx) el.scrollIntoView({ block:'nearest' }); }}
                        style={{
                          width:'100%', textAlign:'left',
                          display:'flex', alignItems:'center', gap:8,
                          padding:'8px 10px', borderRadius:8, border:'none',
                          background: (isActiveSel ? '#ffffff14' : (focusIndex === idx ? '#ffffff10' : 'transparent')),
                          outline: (focusIndex === idx ? '1px solid #ffffff33' : 'none'),
                          color:'inherit', cursor:'not-allowed', opacity:.5
                        }}
                      >
                        <span style={{ width:12, height:12, borderRadius:999, border:'1px solid #00000033', background: s.colorBg }} />
                        <span style={{ flex: 1 }}>{s.label}</span>
                        {isActiveSel && <span aria-hidden>✓</span>}
                      </button>
                    );
                  })}
                </>
              )}
              {!flatItems.length && (
                <div style={{ padding:'10px 12px', opacity:.8 }}>
                  {loadingStatuses ? 'Lade Status…' : 'Keine Status gefunden.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {(task?.["zusätzlicheInfos"] ?? task?.zusatzlicheInfos) && (
        <p className="desc" title={task?.["zusätzlicheInfos"] ?? task?.zusatzlicheInfos}>
          {task?.["zusätzlicheInfos"] ?? task?.zusatzlicheInfos}
        </p>
      )}
    </>
  );
}
