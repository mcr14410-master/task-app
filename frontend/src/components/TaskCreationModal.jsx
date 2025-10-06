// TaskCreationModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/tasks';

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,.5)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: '#0f172a', color: '#e5e7eb',
    padding: '22px 24px', borderRadius: 12,
    width: 680, maxWidth: '96vw',
    maxHeight: '88vh', overflowY: 'auto',
    border: '1px solid #1f2937',
    boxShadow: '0 24px 64px rgba(0,0,0,.5)'
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, paddingBottom: 10,
    borderBottom: '1px solid #1f2937'
  },
  title: { margin: 0, fontSize: '1.1rem', color: '#3b82f6', fontWeight: 700 },
  closeBtn: { background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' },

  section: { backgroundColor: '#111827', padding: 14, borderRadius: 10, marginBottom: 12, border: '1px solid #1f2937' },
  sectionTitle: {
    margin: '0 0 10px 0', fontSize: '0.82rem', color: '#94a3b8',
    borderBottom: '1px solid #1f2937', paddingBottom: 6,
    textTransform: 'uppercase', fontWeight: 600, letterSpacing: '.04em'
  },

  label: { display: 'block', marginBottom: 6, fontWeight: 600, color: '#e5e7eb', fontSize: '0.9rem' },
  input: {
    width: '100%', padding: '10px 12px',
    border: '1px solid #1f2937',
    borderRadius: 10, backgroundColor: '#111827', color: '#e5e7eb',
    fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box'
  },
  textarea: { minHeight: 100, resize: 'vertical' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },

  footer: {
    marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 8, paddingTop: 12, borderTop: '1px solid #1f2937'
  },
  btnPrimary: {
    padding: '10px 16px', backgroundColor: '#3b82f6', color: '#fff',
    border: '1px solid #3b82f6', borderRadius: 10, cursor: 'pointer', fontWeight: 700
  },
  btnSecondary: {
    padding: '10px 16px', backgroundColor: 'transparent', color: '#cbd5e1',
    border: '1px solid #334155', borderRadius: 10, cursor: 'pointer', fontWeight: 600
  },

  statusRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  pill: (active, color) => ({
    padding: '6px 10px',
    borderRadius: 14,
    fontSize: '0.78rem',
    fontWeight: 700,
    cursor: 'pointer',
    userSelect: 'none',
    backgroundColor: active ? color : '#4f545c',
    color: '#fff',
    transition: 'transform .08s ease',
    transform: active ? 'scale(1.02)' : 'scale(1.0)'
  }),

  errorBox: {
    marginBottom: 10, padding: '10px 12px',
    backgroundColor: '#4f2b2b', color: '#ffdcdc',
    borderRadius: 10, fontSize: '0.92rem', border: '1px solid #1f2937'
  }
};

const STATUS_COLORS = {
  NEU: '#5865f2',
  TO_DO: '#faa61a',
  IN_PROGRESS: '#43b581',
  DONE: '#2ecc71'
};
const STATUS_ORDER = ['NEU', 'TO_DO', 'IN_PROGRESS', 'DONE'];

const TaskCreationModal = ({ stations = [], onTaskCreated, onClose }) => {
  const defaultStationName = useMemo(() => (stations[0]?.name ?? ''), [stations]);

  const initialForm = React.useCallback(() => ({
    bezeichnung: '',
    teilenummer: '',
    kunde: '',
    endDatum: '',
    aufwandStunden: 0,
    zuständig: '',
    zusätzlicheInfos: '',
    arbeitsstation: defaultStationName,
    status: 'NEU'
  }), [defaultStationName]);

  const [form, setForm] = useState(initialForm());
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    // falls beim Öffnen noch keine Station drin war, auf Default setzen
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
      prioritaet: 9999
    };
    Object.keys(payload).forEach(k => { if (payload[k] === null) delete payload[k]; });
    return payload;
  };

  const validate = () => {
    if (!form.bezeichnung?.trim()) return 'Bezeichnung ist ein Pflichtfeld.';
    if (!form.arbeitsstation?.trim()) return 'Bitte eine Arbeitsstation auswählen.';
    if (form.status && !STATUS_ORDER.includes(form.status)) return 'Ungültiger Status gewählt.';
    return null;
  };

  // Standard-Speichern (schließt wie gehabt via onTaskCreated in TaskBoard)
  const handleCreate = async (e) => {
    e?.preventDefault?.();
    setErrorMsg(null);

    const v = validate();
    if (v) { setErrorMsg(v); return; }

    setSubmitting(true);
    try {
      await axios.post(API_BASE_URL, buildPayload());
      onTaskCreated?.(); // TaskBoard schließt Modal & refresht
    } catch (err) {
      const status = err?.response?.status;
      const srvMsg = err?.response?.data?.message;
      const detail = err?.response?.data?.detail;
      if (status === 409)      setErrorMsg(srvMsg || 'Datenintegritätsfehler. Bitte Eingaben prüfen.');
      else if (status === 400) setErrorMsg(srvMsg || 'Ungültige Eingabe.');
      else                     setErrorMsg(srvMsg || 'Unbekannter Fehler beim Erstellen der Aufgabe.');
      if (detail) console.warn('Server detail:', detail);
    } finally {
      setSubmitting(false);
    }
  };

  // Speichern & Neu (Modal bleibt offen, Formular wird geleert)
  const handleCreateAndNew = async () => {
    if (submitting) return;
    setErrorMsg(null);

    const v = validate();
    if (v) { setErrorMsg(v); return; }

    setSubmitting(true);
    try {
		 await axios.post(API_BASE_URL, buildPayload());
		 // Board informieren: refresh, aber Modal offen lassen
		 onTaskCreated?.({ keepOpen: true });
		 // Formular auf Defaults zurücksetzen
      setForm(initialForm());
    } catch (err) {
      const status = err?.response?.status;
      const srvMsg = err?.response?.data?.message;
      const detail = err?.response?.data?.detail;
      if (status === 409)      setErrorMsg(srvMsg || 'Datenintegritätsfehler. Bitte Eingaben prüfen.');
      else if (status === 400) setErrorMsg(srvMsg || 'Ungültige Eingabe.');
      else                     setErrorMsg(srvMsg || 'Unbekannter Fehler beim Erstellen der Aufgabe.');
      if (detail) console.warn('Server detail:', detail);
    } finally {
      setSubmitting(false);
    }
  };

  // Formular zurücksetzen (ohne Speichern)
  const handleReset = () => {
    if (submitting) return;
    setErrorMsg(null);
    setForm(initialForm());
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Neue Aufgabe erstellen</h2>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Schließen">✕</button>
        </div>

        {errorMsg && <div style={styles.errorBox}>🚨 {errorMsg}</div>}

        <form onSubmit={handleCreate}>
          {/* Basisdaten */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Basisdaten</h3>

            <label style={styles.label} htmlFor="bezeichnung">Bezeichnung *</label>
            <input
              id="bezeichnung" type="text" style={styles.input}
              value={form.bezeichnung} onChange={(e) => setValue('bezeichnung', e.target.value)}
              disabled={submitting} required
            />

            <div style={{ height: 10 }} />

            <div style={styles.grid2}>
              <div>
                <label style={styles.label} htmlFor="teilenummer">Teilenummer</label>
                <input
                  id="teilenummer" type="text" style={styles.input}
                  value={form.teilenummer} onChange={(e) => setValue('teilenummer', e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div>
                <label style={styles.label} htmlFor="kunde">Kunde</label>
                <input
                  id="kunde" type="text" style={styles.input}
                  value={form.kunde} onChange={(e) => setValue('kunde', e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div>
                <label style={styles.label} htmlFor="endDatum">Enddatum</label>
                <input
                  id="endDatum" type="date" style={styles.input}
                  value={form.endDatum} onChange={(e) => setValue('endDatum', e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div>
                <label style={styles.label} htmlFor="aufwandStunden">Aufwand (Std.)</label>
                <input
                  id="aufwandStunden" type="number" min="0" step="0.25" style={styles.input}
                  value={form.aufwandStunden} onChange={(e) => setValue('aufwandStunden', e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          {/* Zuweisung & Status */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Zuweisung & Status</h3>

            <div style={styles.grid2}>
              <div>
                <label style={styles.label} htmlFor="zuständig">Zuständigkeit</label>
                <input
                  id="zuständig" type="text" style={styles.input}
                  value={form.zuständig} onChange={(e) => setValue('zuständig', e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div>
                <label style={styles.label} htmlFor="arbeitsstation">Arbeitsstation *</label>
                <select
                  id="arbeitsstation" style={styles.input}
                  value={form.arbeitsstation} onChange={(e) => setValue('arbeitsstation', e.target.value)}
                  disabled={submitting} required
                >
                  {stations.map(s => (
                    <option key={s.id ?? s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ height: 10 }} />

            <div>
              <label style={styles.label}>Status</label>
              <div style={styles.statusRow}>
                {['NEU','TO_DO','IN_PROGRESS','DONE'].map(key => (
                  <button
                    key={key} type="button" title={key}
                    onClick={() => setValue('status', key)}
                    style={styles.pill(form.status === key, STATUS_COLORS[key])}
                    disabled={submitting}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Beschreibung */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Beschreibung</h3>
            <label style={styles.label} htmlFor="zusätzlicheInfos">Zusätzliche Infos</label>
            <textarea
              id="zusätzlicheInfos"
              style={{ ...styles.input, ...styles.textarea }}
              value={form.zusätzlicheInfos}
              onChange={(e) => setValue('zusätzlicheInfos', e.target.value)}
              disabled={submitting}
              placeholder="Optional: Kurzbeschreibung"
            />
          </div>

          {/* Footer: links Reset, rechts Abbrechen | Speichern & Neu | Erstellen */}
          <div style={styles.footer}>
            <button type="button" style={styles.btnSecondary} onClick={handleReset} disabled={submitting}>
              Zurücksetzen
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={styles.btnSecondary} onClick={onClose} disabled={submitting}>
                Abbrechen
              </button>
              <button type="button" style={styles.btnPrimary} onClick={handleCreateAndNew} disabled={submitting}>
                Speichern &amp; Neu
              </button>
              <button type="submit" style={styles.btnPrimary} disabled={submitting}>
                {submitting ? 'Erstelle…' : 'Erstellen'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskCreationModal;
