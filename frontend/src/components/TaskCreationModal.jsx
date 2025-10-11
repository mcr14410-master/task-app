// frontend/src/components/TaskCreationModal.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { apiPost } from "../config/apiClient";
import '../config/TaskStatusTheme.css';
import '../config/AdditionalWorkTheme.css';
import useToast from "@/components/ui/useToast";
import apiErrorMessage from "@/utils/apiErrorMessage";
import AttachmentTab from "./AttachmentTab"; // Re-Use, aber hier disabled bis Task existiert

const styles = {
  overlay: { position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 },
  modal: { backgroundColor:'#0f172a', color:'#e5e7eb', padding:'22px 24px', borderRadius:12, width:680, maxWidth:'96vw', maxHeight:'88vh', overflowY:'auto', border:'1px solid #1f2937', boxShadow:'0 24px 64px rgba(0,0,0,.5)' },
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
  tabBtn: (active, disabled=false) => ({ padding:'8px 12px', borderRadius:8, border:'1px solid #334155', background: active ? '#1f2937' : 'transparent', color: disabled ? '#6b7280' : '#e5e7eb', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight:600 })
};

const STATUS_ORDER = ['NEU', 'TO_DO', 'IN_BEARBEITUNG', 'FERTIG'];

function statusKey(raw) {
  const s = String(raw || '').toUpperCase().replaceAll('-', '_').replaceAll(' ', '_');
  switch (s) {
    case 'NEU': return 'NEU';
    case 'TO_DO':
    case 'TODO': return 'TO_DO';
    case 'IN_BEARBEITUNG':
    case 'IN_PROGRESS': return 'IN_BEARBEITUNG';
    case 'FERTIG':
    case 'DONE': return 'FERTIG';
    default: return 'NEU';
  }
}

const TaskCreationModal = ({ stations = [], onTaskCreated, onClose }) => {
  const toast = useToast();
  const defaultStationName = useMemo(() => (stations[0]?.name ?? ''), [stations]);

  const makeInitial = useCallback(() => ({
    bezeichnung: '', teilenummer: '', kunde: '', endDatum: '',
    aufwandStunden: 0, stk: 0, fa: "", dateipfad: "",
    zuständig: '', zusätzlicheInfos: '',
    arbeitsstation: defaultStationName, status: 'NEU',
    fai: false, qs: false
  }), [defaultStationName]);

  const [form, setForm] = useState(makeInitial());
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Tabs: Details (default) + Anhänge (deaktiviert bis Task existiert)
  const [activeTab, setActiveTab] = useState("details");
  const taskExists = false; // im Create gibt's noch keine ID — Tab bleibt deaktiviert

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
      zuständig: sanitize(form.zuständig),
      zusätzlicheInfos: sanitize(form.zusätzlicheInfos),
      arbeitsstation: sanitize(form.arbeitsstation),
      status: sanitize(form.status) ?? 'NEU',
      fai: !!form.fai, qs: !!form.qs, prioritaet: 9999,
      stk: Number.isFinite(Number(form.stk)) ? Number(form.stk) : undefined,
      fa: sanitize(form.fa), dateipfad: sanitize(form.dateipfad)
    };
    Object.keys(payload).forEach(k => { if (payload[k] == null) delete payload[k]; });
    return payload;
  };

  const validate = () => {
    if (!form.bezeichnung?.trim()) return 'Bezeichnung ist ein Pflichtfeld.';
    if (!form.arbeitsstation?.trim()) return 'Bitte eine Arbeitsstation auswählen.';
    if (form.status && !STATUS_ORDER.includes(form.status)) return 'Ungültiger Status gewählt.';
    return null;
  };

  const doCreate = async () => {
    try {
      await apiPost("/tasks", buildPayload());
      toast.success("Aufgabe erstellt");
      onTaskCreated?.();
    } catch (err) {
      const msg = apiErrorMessage(err);
      setErrorMsg(msg);
      toast.error("Erstellen fehlgeschlagen: " + msg);
      throw err;
    }
  };

  const handleCreate = async (e) => {
    e?.preventDefault?.();
    setErrorMsg(null);
    const v = validate();
    if (v) { setErrorMsg(v); return; }
    setSubmitting(true);
    try {
      await doCreate();
      onClose?.();
    } finally { setSubmitting(false); }
  };

  const handleCreateAndNew = async () => {
    if (submitting) return;
    setErrorMsg(null);
    const v = validate();
    if (v) { setErrorMsg(v); return; }
    setSubmitting(true);
    try {
      await doCreate();
      setForm(makeInitial());
      setActiveTab("details");
    } finally { setSubmitting(false); }
  };

  const handleReset = () => {
    if (submitting) return;
    setErrorMsg(null);
    setForm(makeInitial());
    setActiveTab("details");
  };

  const DetailsForm = (
    <>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Basisdaten</h3>
        <label style={styles.label} htmlFor="bezeichnung">Bezeichnung *</label>
        <input id="bezeichnung" type="text" style={styles.input} value={form.bezeichnung} onChange={(e) => setValue('bezeichnung', e.target.value)} disabled={submitting} required />
        <div style={{ height: 10 }} />
        <div style={styles.grid2}>
          <div>
            <label style={styles.label} htmlFor="teilenummer">Teilenummer</label>
            <input id="teilenummer" type="text" style={styles.input} value={form.teilenummer} onChange={(e) => setValue('teilenummer', e.target.value)} disabled={submitting} />
          </div>
          <div>
            <label style={styles.label} htmlFor="kunde">Kunde</label>
            <input id="kunde" type="text" style={styles.input} value={form.kunde} onChange={(e) => setValue('kunde', e.target.value)} disabled={submitting} />
          </div>
          <div>
            <label style={styles.label} htmlFor="endDatum">Enddatum</label>
            <input id="endDatum" type="date" style={styles.input} value={form.endDatum ?? ''} onChange={(e) => setValue('endDatum', e.target.value)} disabled={submitting} />
          </div>
          <div>
            <label style={styles.label} htmlFor="aufwandStunden">Aufwand (Std.)</label>
            <input id="aufwandStunden" type="number" min="0" step="0.25" style={styles.input} value={form.aufwandStunden} onChange={(e) => setValue('aufwandStunden', e.target.value)} disabled={submitting} />
          </div>
          <div>
            <label style={styles.label} htmlFor="stk">Stk</label>
            <input id="stk" type="number" min="0" step="1" style={styles.input} value={form.stk} onChange={(e) => setValue('stk', e.target.value)} disabled={submitting} />
          </div>
          <div>
            <label style={styles.label} htmlFor="fa">FA (Fertigungsauftrag-Nr.)</label>
            <input id="fa" type="text" style={styles.input} value={form.fa} onChange={(e) => setValue('fa', e.target.value)} disabled={submitting} />
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Zuweisung & Status</h3>
        <div style={styles.grid2}>
          <div>
            <label style={styles.label} htmlFor="zuständig">Zuständigkeit</label>
            <input id="zuständig" type="text" style={styles.input} value={form.zuständig} onChange={(e) => setValue('zuständig', e.target.value)} disabled={submitting} />
          </div>
          <div>
            <label style={styles.label} htmlFor="arbeitsstation">Arbeitsstation *</label>
            <select id="arbeitsstation" style={styles.input} value={form.arbeitsstation} onChange={(e) => setValue('arbeitsstation', e.target.value)} disabled={submitting} required>
              {stations.map(s => (<option key={s.id ?? s.name} value={s.name}>{s.name}</option>))}
            </select>
          </div>
        </div>
        <div style={{ height: 10 }} />
        <div>
          <label style={styles.label}>Status</label>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            {STATUS_ORDER.map(st => {
              const key = statusKey(st);
              const selected = form.status === st;
              return (
                <button key={st} type="button" className={`pill st-${key.toLowerCase()} ${selected ? 'is-selected' : ''}`}
                        aria-pressed={selected} onClick={() => setValue('status', st)} disabled={submitting} title={st}>
                  {st}
                </button>
              );
            })}
            <div style={{marginLeft:'auto', display:'inline-flex', gap:8, alignItems:'center'}}>
              <span style={{fontSize:12, color:'#94a3b8'}}>Zusatzarbeiten:</span>
              <button type="button" className={`pill-add add-fai ${form.fai ? 'is-active' : ''} is-clickable`}
                      onClick={() => setForm(prev => ({...prev, fai: !prev.fai}))} disabled={submitting} title="FAI">
                FAI
              </button>
              <button type="button" className={`pill-add add-qs ${form.qs ? 'is-active' : ''} is-clickable`}
                      onClick={() => setForm(prev => ({...prev, qs: !prev.qs}))} disabled={submitting} title="QS">
                QS
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Beschreibung</h3>
        <label style={styles.label} htmlFor="dateipfad">Dateipfad</label>
        <input id="dateipfad" type="text" style={styles.input} value={form.dateipfad} onChange={(e) => setValue('dateipfad', e.target.value)} disabled={submitting} />
        <div style={{ height: 10 }} />
        <label style={styles.label} htmlFor="zusätzlicheInfos">Zusätzliche Infos</label>
        <textarea id="zusätzlicheInfos" style={{ ...styles.input, ...styles.textarea }} value={form.zusätzlicheInfos} onChange={(e) => setValue('zusätzlicheInfos', e.target.value)} disabled={submitting} placeholder="Optional: Kurzbeschreibung" />
      </div>
    </>
  );

  const AttachmentsTab = (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>Anhänge</h3>
      <div style={{ padding:'8px 0', color:'#9ca3af' }}>
        🔒 Diese Aufgabe existiert noch nicht. Bitte zuerst speichern, dann können Anhänge hinzugefügt werden.
      </div>
      {/* Wenn du in Zukunft Pre-Uploads erlauben willst, kann hier eine temp-ID-Logik hin. */}
      <AttachmentTab taskId={null} disabled />
    </div>
  );

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Neue Aufgabe erstellen</h2>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Schließen">✕</button>
        </div>

        {errorMsg && <div style={{ marginBottom: 10, padding: '10px 12px', backgroundColor: '#4f2b2b', color: '#ffdcdc', borderRadius: 10, border: '1px solid #1f2937' }}>🚨 {errorMsg}</div>}

        {/* Tabs */}
        <div style={styles.tabsRow}>
          <button type="button" style={styles.tabBtn(activeTab==='details')} onClick={() => setActiveTab('details')}>Details</button>
          <button type="button" style={styles.tabBtn(activeTab==='attachments', true)} disabled>Anhänge</button>
        </div>

        {activeTab === 'details' ? DetailsForm : AttachmentsTab}

        <form onSubmit={handleCreate}>
          <div style={styles.footer}>
            <button type="button" style={styles.btnSecondary} onClick={handleReset} disabled={submitting}>Zurücksetzen</button>
            <div style={{ display:'flex', gap:8 }}>
              <button type="button" style={styles.btnSecondary} onClick={onClose} disabled={submitting}>Abbrechen</button>
              <button type="button" style={styles.btnPrimary} onClick={handleCreateAndNew} disabled={submitting}>Speichern & Neu</button>
              <button type="submit" style={styles.btnPrimary} disabled={submitting}>{submitting ? 'Erstelle…' : 'Erstellen'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskCreationModal;
