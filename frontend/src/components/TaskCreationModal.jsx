// TaskCreationModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/tasks';

// -------------------------------------
// Styles (ohne border/borderColor-Konflikte)
// -------------------------------------
const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: '#2e2e2e', color: '#f0f0f0',
    padding: '22px 26px', borderRadius: 10, width: 560,
    maxHeight: '85vh', overflowY: 'auto',
    boxShadow: '0 8px 20px rgba(0,0,0,0.6)'
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10, paddingBottom: 8,
    borderBottomStyle: 'solid', borderBottomWidth: 1, borderBottomColor: '#4f545c'
  },
  title: { margin: 0, fontSize: '1.25rem', color: '#5865f2' },
  closeBtn: { background: 'none', border: 'none', color: '#b9bbbe', fontSize: '1.4rem', cursor: 'pointer' },

  section: { backgroundColor: '#383838', padding: 14, borderRadius: 8, marginBottom: 12 },
  sectionTitle: {
    margin: '0 0 10px 0', fontSize: '0.82rem', color: '#90a4ae',
    borderBottomStyle: 'solid', borderBottomWidth: 1, borderBottomColor: '#4f545c', paddingBottom: 6,
    textTransform: 'uppercase', fontWeight: 600
  },

  label: { display: 'block', marginBottom: 6, fontWeight: 600, color: '#dcddde', fontSize: '0.9rem' },
  input: {
    width: '100%', padding: '10px 12px',
    borderStyle: 'solid', borderWidth: 1, borderColor: '#5c626e',
    borderRadius: 6, backgroundColor: '#3c3f46', color: '#dcddde',
    fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box'
  },
  textarea: { minHeight: 90, resize: 'vertical' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },

  // Buttons
  footer: { marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 10,
            borderTopStyle: 'solid', borderTopWidth: 1, borderTopColor: '#4f545c' },
  btnPrimary: {
    padding: '10px 18px', backgroundColor: '#5865f2', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700
  },
  btnSecondary: {
    padding: '10px 18px', backgroundColor: '#4f545c', color: '#dcddde',
    border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600
  },

  // Status Pills
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

  // Fehlerhinweis
  errorBox: {
    marginBottom: 10, padding: '10px 12px', backgroundColor: '#4f2b2b', color: '#ffdcdc',
    borderRadius: 6, fontSize: '0.92rem'
  }
};

// Map der erlaubten Statuswerte -> Farben (muss zu deinem Backend-Enum passen)
const STATUS_COLORS = {
  NEU:       '#5865f2',
  TO_DO:     '#faa61a',
  IN_PROGRESS: '#43b581',
  DONE:      '#2ecc71'
};

// Reihenfolge der Status-Pills
const STATUS_ORDER = ['NEU', 'TO_DO', 'IN_PROGRESS', 'DONE'];

// -------------------------------------
// Component
// -------------------------------------
const TaskCreationModal = ({ stations = [], onTaskCreated, onClose }) => {
  const defaultStationName = useMemo(() => (stations[0]?.name ?? ''), [stations]);

  const [form, setForm] = useState({
    bezeichnung: '',
    teilenummer: '',
    kunde: '',
    endDatum: '',
    aufwandStunden: 0,
    zuständig: '',
    zusätzlicheInfos: '',
    arbeitsstation: defaultStationName,
    status: 'NEU'
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Station default nachladen, wenn Stations kommen
  useEffect(() => {
    setForm(f => ({ ...f, arbeitsstation: f.arbeitsstation || defaultStationName }));
  }, [defaultStationName]);

  // -------- Helpers ----------
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
      endDatum: sanitize(form.endDatum), // "YYYY-MM-DD" → passt zu LocalDate/String
      aufwandStunden: Number.isFinite(Number(form.aufwandStunden)) ? Number(form.aufwandStunden) : 0,
      zuständig: sanitize(form.zuständig),
      zusätzlicheInfos: sanitize(form.zusätzlicheInfos),
      arbeitsstation: sanitize(form.arbeitsstation),
      status: sanitize(form.status) ?? 'NEU',
      prioritaet: 9999 // neu erstellte ganz unten
    };

    // Entferne null-Felder ganz (schönerer JSON-Body)
    Object.keys(payload).forEach(k => {
      if (payload[k] === null) delete payload[k];
    });

    return payload;
  };

  const validate = () => {
    if (!form.bezeichnung || form.bezeichnung.trim().length === 0) {
      return 'Bezeichnung ist ein Pflichtfeld.';
    }
    if (!form.arbeitsstation || form.arbeitsstation.trim().length === 0) {
      return 'Bitte eine Arbeitsstation auswählen.';
    }
    if (form.status && !STATUS_ORDER.includes(form.status)) {
      return 'Ungültiger Status gewählt.';
    }
    return null;
  };

  // -------- Submit ----------
  const handleCreate = async (e) => {
    e?.preventDefault?.();
    setErrorMsg(null);

    const v = validate();
    if (v) {
      setErrorMsg(v);
      return;
    }

    const payload = buildPayload();
    setSubmitting(true);
    try {
      await axios.post(API_BASE_URL, payload);
      onTaskCreated?.();
    } catch (err) {
      // 409-Handling + Root cause, falls vom Server geliefert
      const status = err?.response?.status;
      const srvMsg = err?.response?.data?.message;
      const detail = err?.response?.data?.detail;

      if (status === 409) {
        setErrorMsg(
          srvMsg
            || 'Datenintegritätsfehler (z. B. Verletzung einer DB-Constraint). Bitte Eingaben prüfen.'
        );
      } else if (status === 400) {
        setErrorMsg(srvMsg || 'Ungültige Eingabe.');
      } else {
        setErrorMsg(srvMsg || 'Unbekannter Fehler beim Erstellen der Aufgabe.');
      }

      if (detail) {
        // Für Debug-Zwecke in der Konsole lassen
        // eslint-disable-next-line no-console
        console.warn('Server detail:', detail);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // -------- UI ----------
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Neue Aufgabe erstellen</h2>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Schließen">×</button>
        </div>

        {errorMsg && <div style={styles.errorBox}>🚨 {errorMsg}</div>}

        <form onSubmit={handleCreate}>
          {/* Basisdaten */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Basisdaten</h3>

            <label style={styles.label} htmlFor="bezeichnung">Bezeichnung *</label>
            <input
              id="bezeichnung"
              type="text"
              style={styles.input}
              value={form.bezeichnung}
              onChange={(e) => setValue('bezeichnung', e.target.value)}
              disabled={submitting}
              required
            />

            <div style={{ height: 10 }} />

            <div style={styles.grid2}>
              <div>
                <label style={styles.label} htmlFor="teilenummer">Teilenummer</label>
                <input
                  id="teilenummer"
                  type="text"
                  style={styles.input}
                  value={form.teilenummer}
                  onChange={(e) => setValue('teilenummer', e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div>
                <label style={styles.label} htmlFor="kunde">Kunde</label>
                <input
                  id="kunde"
                  type="text"
                  style={styles.input}
                  value={form.kunde}
                  onChange={(e) => setValue('kunde', e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div>
                <label style={styles.label} htmlFor="endDatum">Enddatum</label>
                <input
                  id="endDatum"
                  type="date"
                  style={styles.input}
                  value={form.endDatum}
                  onChange={(e) => setValue('endDatum', e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div>
                <label style={styles.label} htmlFor="aufwandStunden">Aufwand (Std.)</label>
                <input
                  id="aufwandStunden"
                  type="number"
                  min="0"
                  step="0.25"
                  style={styles.input}
                  value={form.aufwandStunden}
                  onChange={(e) => setValue('aufwandStunden', e.target.value)}
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
                  id="zuständig"
                  type="text"
                  style={styles.input}
                  value={form.zuständig}
                  onChange={(e) => setValue('zuständig', e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div>
                <label style={styles.label} htmlFor="arbeitsstation">Arbeitsstation *</label>
                <select
                  id="arbeitsstation"
                  style={styles.input}
                  value={form.arbeitsstation}
                  onChange={(e) => setValue('arbeitsstation', e.target.value)}
                  disabled={submitting}
                  required
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
                {STATUS_ORDER.map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setValue('status', key)}
                    style={styles.pill(form.status === key, STATUS_COLORS[key])}
                    disabled={submitting}
                    title={key}
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

          <div style={styles.footer}>
            <button type="button" style={styles.btnSecondary} onClick={onClose} disabled={submitting}>
              Abbrechen
            </button>
            <button type="submit" style={styles.btnPrimary} disabled={submitting}>
              {submitting ? 'Erstelle…' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskCreationModal;
