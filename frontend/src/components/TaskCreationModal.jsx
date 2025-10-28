// frontend/src/components/TaskCreationModal.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { apiPost } from "@/config/apiClient";
import '../config/TaskStatusTheme.css';
import '../config/AdditionalWorkTheme.css';
import useToast from "@/components/ui/useToast";
import apiErrorMessage from "@/utils/apiErrorMessage";
import FolderPickerModal from "./FolderPickerModal";
import { fsExists, fsBaseLabel } from "@/api/fsApi";
import AttachmentTab from "./AttachmentTab";
import { fetchStatuses } from "@/api/statuses";
import { fetchCustomers } from "@/api/customers";
import { fetchAssignees } from "@/api/assignees";
import { fetchAdditionalWorks } from "@/api/additionalWorks";


/** Farb-Utils */
function hexToRgb(hex) {
  if (!hex) return null;
  const h = hex.replace('#','');
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  if (v.length !== 6) return null;
  const n = parseInt(v, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function toRgba(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(23,32,50,${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

const styles = {
  overlay: { position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 },
  modal: { backgroundColor:'#0f172a', color:'#e5e7eb', padding:'22px 24px', borderRadius:12, width:720, maxWidth:'96vw', maxHeight:'88vh', overflowY:'auto', border:'1px solid #1f2937', boxShadow:'0 24px 64px rgba(0,0,0,.5)' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, paddingBottom:10, borderBottom:'1px solid #1f2937' },
  title: { margin:0, fontSize:'1.1rem', color:'#3b82f6', fontWeight:700 },
  closeBtn: { background:'transparent', border:'1px solid #334155', color:'#cbd5e1', borderRadius:8, padding:'6px 10px', cursor:'pointer' },
  section: { backgroundColor:'#111827', padding:14, borderRadius:10, marginBottom:12, border:'1px solid #1f2937' },
  sectionTitle: { margin:'0 0 10px 0', fontSize:'0.82rem', color:'#94a3b8', borderBottom:'1px solid #1f2937', paddingBottom:6, textTransform:'uppercase', fontWeight:600, letterSpacing:'.04em' },
  label: { display:'block', marginBottom:6, fontWeight:600, color:'#e5e7eb', fontSize:'0.9rem' },
  input: { width:'100%', padding:'10px 12px', border:'1px solid #1f2937', borderRadius:10, backgroundColor:'#111827', color:'#e5e7eb', fontSize:'0.95rem', outline:'none', boxSizing:'border-box' },
  textarea: { minHeight:100, resize:'vertical' },
  grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 },
  footer: { marginTop:12, display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, paddingTop:12, borderTop:'1px solid #1f2937' },
  btnPrimary: { padding:'10px 16px', backgroundColor:'#3b82f6', color:'#fff', border:'1px solid #3b82f6', borderRadius:10, cursor:'pointer', fontWeight:700 },
  btnSecondary: { padding:'10px 16px', backgroundColor:'transparent', color:'#cbd5e1', border:'1px solid #334155', borderRadius:10, cursor:'pointer', fontWeight:600 },
  tabsRow: { display:'flex', gap:8, marginBottom:12 },
  tabBtn: (active, disabled=false) => ({ padding:'8px 12px', borderRadius:8, border:'1px solid #334155', backgroundColor: active ? '#1f2937' : 'transparent', color: disabled ? '#6b7280' : '#e5e7eb', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight:600 }),
  pillBase: { display:'inline-flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:999, border:'1px solid #ffffff22', cursor:'pointer', userSelect:'none' },
  menu: { position:'absolute', minWidth:220, maxHeight:260, overflowY:'auto', backgroundColor:'#0b1220', color:'#e5e7eb', border:'1px solid #1f2937', borderRadius:10, boxShadow:'0 20px 60px rgba(0,0,0,.45)', padding:6, zIndex:1200 },
  menuItem: (active, disabled, colors) => {
    const baseBg = colors?.bg ? toRgba(colors.bg, 0.14) : 'transparent';
    const activeBg = colors?.bg ? toRgba(colors.bg, 0.30) : '#172032';
    return {
      display:'flex', alignItems:'center', gap:8, width:'100%', padding:'8px 10px', borderRadius:8, textAlign:'left',
      backgroundColor: active ? activeBg : baseBg,
      opacity: disabled ? .45 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
      border:'1px solid ' + (active ? '#ffffff22' : 'transparent'),
      color: colors?.fg || undefined
    };
  },
  dot: (color) => ({ width:8, height:8, borderRadius:999, backgroundColor:color, boxShadow:'0 0 0 2px #000 inset' })
};

const DEFAULT_BASE_LABEL = "\\\\server\\share\\";

function joinBaseAndSub(base, sub) {
  if (!base) return sub || "";
  const hasBackslashBase = base.includes("\\") && !base.includes("/");
  const cleanBase = base.replace(/[/\\]+$/, "");
  if (!sub) return cleanBase;
  const sep = hasBackslashBase ? "\\" : "/";
  return `${cleanBase}${sep}${sub}`;
}

export default function TaskCreationModal({ stations = [], onTaskCreated, onClose }) {
  const toast = useToast();
  const defaultStationName = useMemo(() => (stations[0]?.name ?? ''), [stations]);

  // KEINE Umlaute in State-Keys
  const makeInitial = useCallback(() => ({
    bezeichnung: '', teilenummer: '', kunde: '', endDatum: '',
    aufwandStunden: 0, stk: 0, fa: "", dateipfad: "",
    zustaendig: '', zusaetzlicheInfos: '',
    arbeitsstation: defaultStationName, status: 'NEU',
    fai: false, qs: false, additionalWorks: [],
  }), [defaultStationName]);

  const [form, setForm] = useState(makeInitial());
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [visualActiveTab, setVisualActiveTab] = useState("details");
  const [shownTab, setShownTab] = useState("details");
  const [createdTaskId, setCreatedTaskId] = useState(null);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [baseLabel, setBaseLabel] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const label = await fsBaseLabel();
        if (!cancelled) setBaseLabel(label);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setForm(f => ({ ...f, arbeitsstation: f.arbeitsstation || defaultStationName }));
  }, [defaultStationName]);

  const setValue = (name, value) => setForm(prev => ({ ...prev, [name]: value }));

  const sanitize = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') {
      const t = value.trim();
      return t === '' ? null : t;
    }
    return value;
  };

  const buildPayload = () => {
    const payload = {
      bezeichnung: sanitize(form.bezeichnung),
      teilenummer: sanitize(form.teilenummer),
      kunde: sanitize(form.kunde),
      endDatum: sanitize(form.endDatum),
      aufwandStunden: Number.isFinite(Number(form.aufwandStunden)) ? Number(form.aufwandStunden) : 0,
      zuständig: sanitize(form.zustaendig),
      zusätzlicheInfos: sanitize(form.zusaetzlicheInfos),
      arbeitsstation: sanitize(form.arbeitsstation),
      statusCode: sanitize(form.status) ?? 'NEU', // WICHTIG: neues System
      fai: !!form.fai, qs: !!form.qs, prioritaet: 9999,
      stk: Number.isFinite(Number(form.stk)) ? Number(form.stk) : undefined,
      fa: sanitize(form.fa),
      dateipfad: sanitize(form.dateipfad),
	  additionalWorks: Array.isArray(form.additionalWorks) ? form.additionalWorks : [],

    };
    Object.keys(payload).forEach(k => { if (payload[k] == null) delete payload[k]; });
    return payload;
  };

  /** Status */
  const [statuses, setStatuses] = useState([]);
  const [statusErr, setStatusErr] = useState('');
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [openMenu, setOpenMenu] = useState(false);
  const [hi, setHi] = useState(-1);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // aktive + inaktive laden (für Gruppierung)
        const list = await fetchStatuses(false);
        if (!alive) return;
        const sorted = (list || []).slice().sort((a, b) => {
          if (a.active !== b.active) return a.active ? -1 : 1;
          return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
                 String(a.label).localeCompare(String(b.label));
        });
        setStatuses(sorted);
        setStatusErr('');
        if (sorted.length && !sorted.some(s => s.code === form.status)) {
          setForm(f => ({ ...f, status: sorted[0].code }));
        }
      } catch {
        if (alive) setStatusErr('Statusliste konnte nicht geladen werden.');
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleList = useMemo(() => (
    statuses.length ? statuses : [
      { code:'NEU', label:'Neu', colorBg:'#2e3847', colorFg:'#d7e3ff', sortOrder:0, isFinal:false, active:true },
      { code:'TO_DO', label:'To do', colorBg:'#374151', colorFg:'#e5e7eb', sortOrder:1, isFinal:false, active:true },
      { code:'IN_BEARBEITUNG', label:'In Bearbeitung', colorBg:'#1f4a3a', colorFg:'#b5f5d1', sortOrder:2, isFinal:false, active:true },
      { code:'FERTIG', label:'Fertig', colorBg:'#133b19', colorFg:'#b2fcb8', sortOrder:3, isFinal:true, active:true }
    ]
  ), [statuses]);

  const activeCount = useMemo(
    () => visibleList.reduce((n, s) => n + (s.active ? 1 : 0), 0),
    [visibleList]
  );

  const enabledIdxs = useMemo(
    () => visibleList.reduce((acc, s, idx) => (s.active ? (acc.push(idx), acc) : acc), []),
    [visibleList]
  );

  function openStatusMenu() {
    setOpenMenu(true);
    const curIdx = visibleList.findIndex(s => s.code === form.status && s.active);
    const start = curIdx >= 0 ? curIdx : (enabledIdxs[0] ?? -1);
    setHi(start);
    setTimeout(() => menuRef.current?.focus(), 0);
  }
  function closeStatusMenu() {
    setOpenMenu(false);
    setHi(-1);
    setTimeout(() => btnRef.current?.focus(), 0);
  }
  function move(delta) {
    if (!enabledIdxs.length) return;
    const pos = enabledIdxs.indexOf(hi);
    const next = pos < 0 ? enabledIdxs[0] : enabledIdxs[(pos + delta + enabledIdxs.length) % enabledIdxs.length];
    setHi(next);
  }
  function choose(idx) {
    const s = visibleList[idx];
    if (!s || !s.active) return;
    if (s.isFinal && s.code !== form.status) {
      const ok = confirm(`Status „${s.label}“ ist final. Trotzdem setzen?`);
      if (!ok) return;
    }
    setValue('status', s.code);
    closeStatusMenu();
  }

  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e) => {
      if (!menuRef.current || !btnRef.current) return;
      if (!menuRef.current.contains(e.target) && !btnRef.current.contains(e.target)) setOpenMenu(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openMenu]);

  /** Kunden (Hybrid) */
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [kundeMode, setKundeMode] = useState("select"); // 'select' | 'custom'
  const [kundeSelect, setKundeSelect] = useState("");

  useEffect(() => {
    let alive = true;
    setLoadingCustomers(true);
    fetchCustomers(true)
      .then(list => {
        if (!alive) return;
        const sorted = (list || []).slice().sort((a,b) => String(a.name).localeCompare(String(b.name)));
        setCustomers(sorted);
        if (form.kunde) {
          const hit = sorted.find(c => c.name === form.kunde);
          setKundeMode(hit ? "select" : "custom");
          setKundeSelect(hit ? hit.name : "");
        }
      })
      .finally(() => { if (alive) setLoadingCustomers(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Assignees (Hybrid) */
  const [assignees, setAssignees] = useState([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [assigneeMode, setAssigneeMode] = useState("select"); // 'select' | 'custom'
  const [assigneeSelect, setAssigneeSelect] = useState("");

  useEffect(() => {
    let alive = true;
    setLoadingAssignees(true);
    fetchAssignees(true)
      .then(list => {
        if (!alive) return;
        const sorted = (list || []).slice().sort((a,b) => String(a.name).localeCompare(String(b.name)));
        setAssignees(sorted);
        if (form.zustaendig) {
          const hit = sorted.find(a => a.name === form.zustaendig);
          setAssigneeMode(hit ? "select" : "custom");
          setAssigneeSelect(hit ? hit.name : "");
        }
      })
      .finally(() => { if (alive) setLoadingAssignees(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Zusatzarbeiten laden
  const [additionalWorks, setAdditionalWorks] = useState([]);
  const [loadingAW, setLoadingAW] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoadingAW(true);
    fetchAdditionalWorks()
      .then(list => {
        if (!alive) return;
        const active = (list || []).filter(w => w.active);
        const sorted = active.sort((a,b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          String(a.label).localeCompare(String(b.label))
        );
        setAdditionalWorks(sorted);
      })
      .finally(() => { if (alive) setLoadingAW(false); });
    return () => { alive = false; };
  }, []);
  
  
  
  

  const validate = () => {
    if (!form.bezeichnung?.trim()) return 'Bezeichnung ist ein Pflichtfeld.';
    if (!form.arbeitsstation?.trim()) return 'Bitte eine Arbeitsstation auswählen.';
    return null;
  };

  const doCreate = async () => {
    const payload = buildPayload();
    return apiPost("/tasks", payload);
  };

  const handleCreateClose = async () => {
    setErrorMsg(null);
    const v = validate(); if (v) { setErrorMsg(v); return; }
    setSubmitting(true);
    try {
      await doCreate();
      toast.success("Aufgabe erstellt");
      onTaskCreated?.();
      onClose?.();
    } catch (err) {
      const msg = apiErrorMessage(err);
      setErrorMsg(msg);
      toast.error("Erstellen fehlgeschlagen: " + msg);
    } finally { setSubmitting(false); }
  };

  const handleCreateStay = async () => {
    if (submitting) return;
    setErrorMsg(null);
    const v = validate(); if (v) { setErrorMsg(v); return; }
    setSubmitting(true);
    try {
      const created = await doCreate();
      const newId = created?.id ?? created?.taskId ?? null;
      if (newId != null) setCreatedTaskId(newId); else toast.error("Erstellt, aber keine ID erhalten");
      toast.success("Aufgabe erstellt — Anhänge-Tab jetzt verfügbar");
      setVisualActiveTab("attachments");
      setShownTab("details");
    } catch (err) {
      const msg = apiErrorMessage(err);
      setErrorMsg(msg);
      toast.error("Erstellen fehlgeschlagen: " + msg);
    } finally { setSubmitting(false); }
  };

  const handleCreateAndNew = async () => {
    if (submitting) return;
    setErrorMsg(null);
    const v = validate(); if (v) { setErrorMsg(v); return; }
    setSubmitting(true);
    try {
      await doCreate();
      toast.success("Aufgabe erstellt");
      // Reset
      setForm(makeInitial());
      setCreatedTaskId(null);
      setVisualActiveTab("details");
      setShownTab("details");
      setErrorMsg(null);
    } catch (err) {
      const msg = apiErrorMessage(err);
      setErrorMsg(msg);
      toast.error("Erstellen fehlgeschlagen: " + msg);
    } finally { setSubmitting(false); }
  };

  const DetailsForm = (
    <>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Basisdaten</h3>
        <label style={styles.label} htmlFor="bezeichnung">Bezeichnung *</label>
        <input id="bezeichnung" type="text" style={styles.input} value={form.bezeichnung} onChange={(e)=>setValue('bezeichnung', e.target.value)} disabled={submitting} required/>
        <div style={{ height: 10 }} />
        <div style={styles.grid2}>
          <div>
            <label style={styles.label} htmlFor="teilenummer">Teilenummer</label>
            <input id="teilenummer" type="text" style={styles.input} value={form.teilenummer} onChange={(e)=>setValue('teilenummer', e.target.value)} disabled={submitting}/>
          </div>

          {/* Kunde (Hybrid) */}
          <div>
            <label style={styles.label} htmlFor="kunde">Kunde</label>
            {kundeMode === "select" ? (
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  id="kunde"
                  style={{ ...styles.input, flex: 1 }}
                  value={kundeSelect}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__custom__") {
                      setKundeMode("custom");
                      return;
                    }
                    setKundeSelect(val);
                    setValue("kunde", val || "");
                  }}
                  disabled={submitting || loadingCustomers}
                >
                  <option value="">– bitte wählen –</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  <option value="__custom__">➕ Freitext…</option>
                </select>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  id="kunde"
                  type="text"
                  style={{ ...styles.input, flex: 1 }}
                  value={form.kunde || ""}
                  onChange={(e) => setValue("kunde", e.target.value)}
                  disabled={submitting}
                  placeholder="Kunde eingeben"
                />
                <button
                  type="button"
                  style={styles.btnSecondary}
                  onClick={() => {
                    if (!form.kunde && kundeSelect) setValue("kunde", kundeSelect);
                    setKundeMode("select");
                  }}
                >
                  Zur Auswahl
                </button>
              </div>
            )}
          </div>

          <div>
            <label style={styles.label} htmlFor="endDatum">Enddatum</label>
            <input id="endDatum" type="date" style={styles.input} value={form.endDatum ?? ''} onChange={(e)=>setValue('endDatum', e.target.value)} disabled={submitting}/>
          </div>
          <div>
            <label style={styles.label} htmlFor="aufwandStunden">Aufwand (Std.)</label>
            <input id="aufwandStunden" type="number" min="0" step="0.25" style={styles.input} value={form.aufwandStunden} onChange={(e)=>setValue('aufwandStunden', e.target.value)} disabled={submitting}/>
          </div>
          <div>
            <label style={styles.label} htmlFor="stk">Stk</label>
            <input id="stk" type="number" min="0" step="1" style={styles.input} value={form.stk} onChange={(e)=>setValue('stk', e.target.value)} disabled={submitting}/>
          </div>
          <div>
            <label style={styles.label} htmlFor="fa">FA (Fertigungsauftrag-Nr.)</label>
            <input id="fa" type="text" style={styles.input} value={form.fa} onChange={(e)=>setValue('fa', e.target.value)} disabled={submitting}/>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Zuweisung & Status</h3>

        {/* Zuständigkeit (Hybrid) */}
        <div style={styles.grid2}>
          <div>
            <label style={styles.label} htmlFor="zustaendig">Zuständigkeit</label>
            {assigneeMode === "select" ? (
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  id="zustaendig"
                  style={{ ...styles.input, flex: 1 }}
                  value={assigneeSelect}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__custom__") {
                      setAssigneeMode("custom");
                      return;
                    }
                    setAssigneeSelect(val);
                    setValue("zustaendig", val || "");
                  }}
                  disabled={submitting || loadingAssignees}
                >
                  <option value="">– bitte wählen –</option>
                  {assignees.map(a => (
                    <option key={a.id} value={a.name}>{a.name}{a.email ? ` (${a.email})` : ""}</option>
                  ))}
                  <option value="__custom__">➕ Freitext…</option>
                </select>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  id="zustaendig"
                  type="text"
                  style={{ ...styles.input, flex: 1 }}
                  value={form.zustaendig || ""}
                  onChange={(e) => setValue("zustaendig", e.target.value)}
                  disabled={submitting}
                  placeholder="Zuständigkeit eingeben"
                />
                <button
                  type="button"
                  style={styles.btnSecondary}
                  onClick={() => {
                    if (!form.zustaendig && assigneeSelect) setValue("zustaendig", assigneeSelect);
                    setAssigneeMode("select");
                  }}
                >
                  Zur Auswahl
                </button>
              </div>
            )}
          </div>

          {/* Arbeitsstation */}
          <div>
            <label style={styles.label} htmlFor="arbeitsstation">Arbeitsstation *</label>
            <select
              id="arbeitsstation"
              style={styles.input}
              value={form.arbeitsstation}
              onChange={(e) => setValue("arbeitsstation", e.target.value)}
              disabled={submitting}
              required
            >
              {stations.map((s) => (
                <option key={s.id ?? s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status (Pill + Menü, gruppiert) */}
        <div style={{ height: 10 }} />
        <div>
          <label style={styles.label}>Status</label>
          <div style={{ position:'relative', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <button
              ref={btnRef}
              type="button"
              onClick={() => (openMenu ? closeStatusMenu() : openStatusMenu())}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!openMenu) openStatusMenu();
                }
              }}
              className="pill"
              style={{
                ...styles.pillBase,
                backgroundColor: (visibleList.find(s => s.code === form.status)?.colorBg ?? '#26303f'),
                color: (visibleList.find(s => s.code === form.status)?.colorFg ?? '#e5e7eb'),
                border: '1px solid #ffffff22'
              }}
              disabled={submitting}
              aria-haspopup="menu"
              aria-expanded={openMenu}
              title={visibleList.find(s => s.code === form.status)?.label ?? form.status}
            >
              <span style={{ width:8, height:8, borderRadius:999, backgroundColor:'#8df58d' }} />
              <span>{visibleList.find(s => s.code === form.status)?.label ?? form.status}</span>
              <span style={{ opacity:.75 }}>▾</span>
            </button>

            {openMenu && (
              <div
                ref={menuRef}
                role="menu"
                tabIndex={-1}
                style={{ ...styles.menu, top: 'calc(100% + 6px)', left: 0 }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { e.preventDefault(); closeStatusMenu(); }
                  else if (e.key === 'ArrowDown') { e.preventDefault(); move(+1); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
                  else if (e.key === 'Enter') { e.preventDefault(); choose(hi); }
                }}
              >
                {visibleList.map((s, idx) => {
                  const active = hi === idx;
                  const disabled = !s.active;
                  return (
                    <React.Fragment key={s.code}>
                      {idx === activeCount && activeCount > 0 && activeCount < visibleList.length && (
                        <div role="separator" aria-hidden="true" style={{ padding: '6px 10px', opacity: .6, fontSize: 12 }}>
                          Inaktiv
                        </div>
                      )}
                      <button
                        role="menuitem"
                        onMouseEnter={() => setHi(idx)}
                        onClick={() => choose(idx)}
                        disabled={disabled}
                        className={active ? "active" : ""}
                        style={styles.menuItem(active, disabled, { bg: s.colorBg, fg: s.colorFg })}
                        title={s.isFinal ? "Finalstatus" : ""}
                      >
                        <span style={styles.dot(s.colorBg || "#2e3847")} />
                        {s.label ?? s.code}
                        {!s.active && <span style={{ marginLeft: 8, opacity: .6 }}>(inaktiv)</span>}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            )}

			<div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
			  <span style={{ fontSize: 12, color: "#94a3b8" }}>Zusatzarbeiten:</span>
			  {loadingAW && <span style={{ fontSize: 12, color: "#64748b" }}>Lade…</span>}
			  {!loadingAW && additionalWorks.map(w => {
			    const checked = form.additionalWorks.includes(w.code);
			    return (
			      <label key={w.code} style={{
			        display: "inline-flex",
			        alignItems: "center",
			        gap: 4,
			        background: checked ? (w.colorBg || "#374151") : "transparent",
			        color: checked ? (w.colorFg || "#e5e7eb") : "#e5e7eb",
			        border: "1px solid #334155",
			        borderRadius: 999,
			        padding: "3px 8px",
			        cursor: "pointer",
			        userSelect: "none",
			        fontSize: 12,
			        fontWeight: 600
			      }}>
			        <input
			          type="checkbox"
			          checked={checked}
			          disabled={submitting}
			          onChange={(e) => {
			            setForm(prev => {
			              const next = new Set(prev.additionalWorks);
			              if (e.target.checked) next.add(w.code);
			              else next.delete(w.code);
			              return { ...prev, additionalWorks: Array.from(next) };
			            });
			          }}
			          style={{ accentColor: w.colorBg || "#3b82f6" }}
			        />
			        {w.label || w.code.toUpperCase()}
			      </label>
			    );
			  })}
			</div>

          </div>
          {statusErr && <div style={{ marginTop:6, color:'#fecaca', fontSize:12 }}>{statusErr}</div>}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Beschreibung</h3>
        <label style={styles.label} htmlFor="zusaetzlicheInfos">Zusätzliche Infos</label>
        <textarea id="zusaetzlicheInfos" style={{ ...styles.input, ...styles.textarea }}
                  value={form.zusaetzlicheInfos || ''} onChange={(e)=>setValue('zusaetzlicheInfos', e.target.value)}
                  disabled={submitting} placeholder="Optional: Kurzbeschreibung" />
      </div>
    </>
  );

  const PathForm = (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>Dateipfad</h3>
      <label style={styles.label} htmlFor="dateipfad">Unterordner (relativ zur Basis)</label>
      <div style={{display:'flex', gap:8}}>
        <input
          id="dateipfad"
          type="text"
          style={{...styles.input, flex:1}}
          value={form.dateipfad || ''}
          onChange={(e)=>setValue('dateipfad', e.target.value.replaceAll("\\","/"))}
          disabled={submitting}
          placeholder="z. B. Kunde/Projekt/Teil"
        />
        <button type="button" style={styles.btnSecondary} onClick={()=>setShowFolderPicker(true)} disabled={submitting}>
          Ordner wählen…
        </button>
        <button
          type="button"
          style={styles.btnSecondary}
          onClick={async ()=>{
            try{
              const exists = await fsExists(form.dateipfad || "");
              if (exists) { toast.success("Pfad vorhanden"); } else { toast.error("Pfad existiert nicht"); }
            }catch{ toast.error("Prüfung fehlgeschlagen"); }
          }}
          disabled={submitting}
        >
          Prüfen
        </button>
      </div>

      {(baseLabel || DEFAULT_BASE_LABEL) && (
        <div style={{marginTop:8, color:'#9ca3af', fontSize:12}}>
          Voller Pfad (Info):{" "}
          <code>{joinBaseAndSub(baseLabel || DEFAULT_BASE_LABEL, (form.dateipfad || '').replaceAll("\\","/"))}</code>
        </div>
      )}
    </div>
  );

  const tabs = (
    <div style={styles.tabsRow}>
      <button type="button"
              style={styles.tabBtn(visualActiveTab==='details')}
              onClick={() => { setVisualActiveTab('details'); setShownTab('details'); }}>
        Details
      </button>

      <button type="button"
              style={styles.tabBtn(visualActiveTab==='path')}
              onClick={() => { setVisualActiveTab('path'); setShownTab('path'); }}>
        Pfad
      </button>

      <button type="button"
              style={styles.tabBtn(visualActiveTab==='attachments', !createdTaskId)}
              onClick={() => { if (!createdTaskId) return; setVisualActiveTab('attachments'); setShownTab('attachments'); }}
              disabled={!createdTaskId}
              title={!createdTaskId ? "Erst speichern, dann Anhänge verfügbar" : "Anhänge"}>
        Anhänge
      </button>
    </div>
  );

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e)=>e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Aufgabe erstellen</h2>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Schließen">✕</button>
        </div>

        {tabs}

        {shownTab === 'details' ? (
          DetailsForm
        ) : shownTab === 'path' ? (
          PathForm
        ) : (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Anhänge</h3>
            {createdTaskId ? (
              <AttachmentTab taskId={createdTaskId} />
            ) : (
              <div style={{color:'#9ca3af'}}>Bitte zuerst speichern, um Anhänge hochzuladen.</div>
            )}
          </div>
        )}

        {errorMsg ? (
          <div style={{marginTop:8, padding:10, border:'1px solid #7f1d1d', backgroundColor:'#1f2937', color:'#fecaca', borderRadius:8}}>
            {errorMsg}
          </div>
        ) : null}

        <div style={styles.footer}>
          <div>
            <button type="button" style={styles.btnSecondary} onClick={()=>{
              setForm(makeInitial());
              setCreatedTaskId(null);
              setVisualActiveTab("details");
              setShownTab("details");
              setErrorMsg(null);
            }} disabled={submitting}>
              Zurücksetzen
            </button>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button type="button" style={styles.btnSecondary} onClick={onClose} disabled={submitting}>
              Abbrechen
            </button>
            <button type="button" style={styles.btnSecondary} onClick={handleCreateAndNew} disabled={submitting}>
              {submitting ? '…' : 'Erstellen & Neu'}
            </button>
            <button type="button" style={styles.btnSecondary} onClick={handleCreateStay} disabled={submitting}>
              {submitting ? '…' : 'Erstellen'}
            </button>
            <button type="button" style={styles.btnPrimary} onClick={handleCreateClose} disabled={submitting}>
              {submitting ? 'Erstelle…' : 'Erstellen & Schließen'}
            </button>
          </div>
        </div>
      </div>

      {showFolderPicker && (
        <FolderPickerModal
          initialSub={form.dateipfad || ""}
          onSelect={(sub) => { setValue("dateipfad", (sub || "").replaceAll("\\","/")); setShowFolderPicker(false); }}
          onClose={() => setShowFolderPicker(false)}
          title="Unterordner wählen"
          baseLabel={baseLabel || DEFAULT_BASE_LABEL}
        />
      )}
    </div>
  );
}
