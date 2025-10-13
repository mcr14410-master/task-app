import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { apiPost } from "@/config/apiClient";
import '../config/TaskStatusTheme.css';
import '../config/AdditionalWorkTheme.css';
import useToast from "@/components/ui/useToast";
import apiErrorMessage from "@/utils/apiErrorMessage";
import FolderPickerModal from "./FolderPickerModal";
import { fsExists } from "@/api/fsApi";
import AttachmentTab from "./AttachmentTab";

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
  tabBtn: (active, disabled=false) => ({ padding:'8px 12px', borderRadius:8, border:'1px solid #334155', background: active ? '#1f2937' : 'transparent', color: disabled ? '#6b7280' : '#e5e7eb', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight:600 }),
  pill: (selected, cls) => `pill ${cls ?? ''} ${selected ? 'is-selected' : ''}`
};

const STATUS_ORDER = ['NEU', 'TO_DO', 'IN_BEARBEITUNG', 'FERTIG'];

export default function TaskCreationModal({ stations = [], onTaskCreated, onClose }) {
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

  // Tabs: "visualActiveTab" = welcher Tab-Button aktiv; "shownTab" = welcher Inhalt angezeigt.
  const [visualActiveTab, setVisualActiveTab] = useState("details");
  const [shownTab, setShownTab] = useState("details");

  // Nach dem ersten Speichern (Erstellen) verfügbar
  const [createdTaskId, setCreatedTaskId] = useState(null);

  // Folder Picker
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  useEffect(() => {
    setForm(f => ({ ...f, arbeitsstation: f.arbeitsstation || defaultStationName }));
  }, [defaultStationName]);

  const resetForm = () => {
    setForm(makeInitial());
    setCreatedTaskId(null);
    setVisualActiveTab("details");
    setShownTab("details");
    setErrorMsg(null);
  };

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
    if (!STATUS_ORDER.includes(form.status)) return 'Ungültiger Status gewählt.';
    return null;
  };

  const doCreate = async () => {
    const payload = buildPayload();
    // Erwartet: Backend gibt das erstellte Task-DTO zurück
    return apiPost("/tasks", payload);
  };

  // Schließen-Variante (wie gehabt)
  const handleCreateClose = async () => {
    setErrorMsg(null);
    const v = validate(); if (v) { setErrorMsg(v); return; }
    setSubmitting(true);
    try {
      await doCreate();
      toast.success("Aufgabe erstellt");
      onTaskCreated?.();          // parent darf schließen/refreshen
      onClose?.();
    } catch (err) {
      const msg = apiErrorMessage(err);
      setErrorMsg(msg);
      toast.error("Erstellen fehlgeschlagen: " + msg);
    } finally { setSubmitting(false); }
  };

  // Bleibt offen: NICHT onClose, NICHT onTaskCreated (damit parent nichts schließt)
  // Markiert nur den Anhänge-Tab als aktivierbar + optisch aktiv, Inhalt bleibt „Details“.
  const handleCreateStay = async () => {
    if (submitting) return;
    setErrorMsg(null);
    const v = validate(); if (v) { setErrorMsg(v); return; }
    setSubmitting(true);
    try {
      const created = await doCreate();
      const newId = created?.id ?? created?.taskId ?? null;
      if (newId == null) {
        toast.error("Erstellt, aber keine ID erhalten");
      } else {
        setCreatedTaskId(newId);
      }
      toast.success("Aufgabe erstellt — Anhänge-Tab jetzt verfügbar");
      // Tab optisch auf "attachments" schalten, Inhalt bleibt Details
      setVisualActiveTab("attachments");
      setShownTab("details");
      // WICHTIG: KEIN onTaskCreated, KEIN onClose → Modal bleibt offen
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
      // Formular leeren & Tabs zurücksetzen, Modal bleibt offen
      resetForm();
      onTaskCreated?.(); // Liste im Hintergrund darf aktualisiert werden (optional)
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
          <div>
            <label style={styles.label} htmlFor="kunde">Kunde</label>
            <input id="kunde" type="text" style={styles.input} value={form.kunde} onChange={(e)=>setValue('kunde', e.target.value)} disabled={submitting}/>
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
        <div style={styles.grid2}>
          <div>
            <label style={styles.label} htmlFor="zuständig">Zuständigkeit</label>
            <input id="zuständig" type="text" style={styles.input} value={form.zuständig} onChange={(e)=>setValue('zuständig', e.target.value)} disabled={submitting}/>
          </div>
          <div>
            <label style={styles.label} htmlFor="arbeitsstation">Arbeitsstation *</label>
            <select id="arbeitsstation" style={styles.input} value={form.arbeitsstation} onChange={(e)=>setValue('arbeitsstation', e.target.value)} disabled={submitting} required>
              {stations.map(s => (<option key={s.id ?? s.name} value={s.name}>{s.name}</option>))}
            </select>
          </div>
        </div>
        <div style={{ height: 10 }} />
        <div>
          <label style={styles.label}>Status</label>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            {STATUS_ORDER.map(st => {
              const selected = form.status === st;
              const cls = `st-${st.toLowerCase().replace('_','-')}`;
              return (
                <button key={st} type="button" className={styles.pill(selected, cls)}
                        aria-pressed={selected} onClick={()=>setValue('status', st)} disabled={submitting} title={st}>
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
        <label style={styles.label} htmlFor="dateipfad">Dateipfad (Unterordner gegenüber Basis)</label>
        <div style={{display:'flex', gap:8}}>
          <input id="dateipfad" type="text" style={{...styles.input, flex:1}} value={form.dateipfad || ''} onChange={(e)=>setValue('dateipfad', e.target.value)} disabled={submitting}/>
          <button type="button" style={styles.btnSecondary} onClick={()=>setShowFolderPicker(true)} disabled={submitting}>Ordner wählen…</button>
          <button type="button" style={styles.btnSecondary} onClick={async ()=>{
            try{
              const r = await fsExists(form.dateipfad || "");
              if (r?.exists) { toast.success("Pfad vorhanden"); } else { toast.error("Pfad existiert nicht"); }
            }catch{ toast.error("Prüfung fehlgeschlagen"); }
          }} disabled={submitting}>Prüfen</button>
        </div>
        <div style={{ height: 10 }} />
        <label style={styles.label} htmlFor="zusätzlicheInfos">Zusätzliche Infos</label>
        <textarea id="zusätzlicheInfos" style={{ ...styles.input, ...styles.textarea }} value={form.zusätzlicheInfos || ''} onChange={(e)=>setValue('zusätzlicheInfos', e.target.value)} disabled={submitting} placeholder="Optional: Kurzbeschreibung" />
      </div>
    </>
  );

  const tabs = (
    <div style={styles.tabsRow}>
      <button type="button"
              style={styles.tabBtn(visualActiveTab==='details')}
              onClick={() => { setVisualActiveTab('details'); setShownTab('details'); }}>
        Details
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
          <div style={{marginTop:8, padding:10, border:'1px solid #7f1d1d', background:'#1f2937', color:'#fecaca', borderRadius:8}}>
            {errorMsg}
          </div>
        ) : null}

        <div style={styles.footer}>
          {/* Linksbündig: Zurücksetzen */}
          <div>
            <button type="button" style={styles.btnSecondary} onClick={resetForm} disabled={submitting}>
              Zurücksetzen
            </button>
          </div>

          {/* Rechts: Aktions-Buttons */}
          <div style={{ display:'flex', gap:8 }}>
            <button type="button" style={styles.btnSecondary} onClick={onClose} disabled={submitting}>Abbrechen</button>
            <button type="button" style={styles.btnSecondary} onClick={handleCreateAndNew} disabled={submitting}>
              {submitting ? '…' : 'Erstellen & Neu'}
            </button>
            {/* Umbenannt & bleibt offen */}
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
          onSelect={(sub) => { setValue("dateipfad", sub); setShowFolderPicker(false); }}
          onClose={() => setShowFolderPicker(false)}
          title="Unterordner wählen"
          baseLabel="\\\\server\\share\\"
        />
      )}
    </div>
  );
}
