// frontend/src/components/TaskEditModal.jsx
// Clean version: saves the edited task via PATCH with canonical statuses (NEU, TO_DO, IN_BEARBEITUNG, FERTIG).
// No UI<->API mapping or fallback variants.
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/tasks';

const modalStyles = {
  modalOverlay: {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,.5)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#0f172a', color: '#e5e7eb',
    padding: '20px 24px',
    borderRadius: 12,
    width: 720, maxWidth: '96vw',
    maxHeight: '88vh', overflowY: 'auto',
    border: '1px solid #1f2937',
    boxShadow: '0 24px 64px rgba(0,0,0,.5)',
    zIndex: 1001,
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 10, marginBottom: 16, borderBottom: '1px solid #1f2937',
  },
  title: { fontSize: '1.1rem', color: '#3b82f6', margin: 0, fontWeight: 700 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  closeButton: {
    background: 'transparent', border: '1px solid #334155',
    color: '#cbd5e1', borderRadius: 8,
    fontSize: '1rem', padding: '6px 10px', cursor: 'pointer',
  },

  sectionContainer: {
    backgroundColor: '#111827', padding: 14,
    borderRadius: 10, marginBottom: 14, border: '1px solid #1f2937',
  },
  sectionTitle: {
    color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600,
    margin: '0 0 10px 0', borderBottom: '1px solid #1f2937',
    paddingBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em',
  },
  formGroup: { marginBottom: 10 },
  input: {
    width: '100%', padding: '10px 12px',
    border: '1px solid #1f2937',
    borderRadius: 10, backgroundColor: '#111827', color: '#e5e7eb',
    boxSizing: 'border-box', fontSize: '0.95rem',
  },
  textarea: { minHeight: 100, resize: 'vertical' },
  label: { display: 'block', marginBottom: 6, fontWeight: 600, color: '#e5e7eb', fontSize: '0.9rem' },

  buttonContainer: {
    marginTop: 12, display: 'flex', justifyContent: 'space-between',
    gap: 8, paddingTop: 12, borderTop: '1px solid #1f2937',
  },
  buttonPrimary: {
    padding: '10px 16px', background: '#3b82f6', color: '#fff',
    border: '1px solid #3b82f6', borderRadius: 10, cursor: 'pointer', fontWeight: 700
  },
  buttonSecondary: {
    padding: '10px 16px', background: 'transparent', color: '#cbd5e1',
    border: '1px solid #334155', borderRadius: 10, cursor: 'pointer', fontWeight: 600
  },
  buttonDanger: {
    padding: '10px 16px', background: '#ef4444', color: '#fff',
    border: '1px solid #ef4444', borderRadius: 10, cursor: 'pointer', fontWeight: 700
  },

  badgeRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  badgeBase: (bg, selected) => ({
    backgroundColor: bg,
    color: '#fff',
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: '0.8em',
    fontWeight: 700,
    cursor: 'pointer',
    outline: 'none',
    userSelect: 'none',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: selected ? '#ffffff' : 'transparent',
  }),
};

const STATUSES = ['NEU', 'TO_DO', 'IN_BEARBEITUNG', 'FERTIG'];
const getStatusColor = (status) => {
  switch (status) {
    case 'NEU': return '#3b82f6';
    case 'TO_DO': return '#f59e0b';
    case 'IN_BEARBEITUNG': return '#0ea5e9';
    case 'FERTIG': return '#22c55e';
    default: return '#747f8d';
  }
};

const TaskEditModal = ({ task, stations, onSave, onClose }) => {
  const [taskData, setTaskData] = useState({
    bezeichnung: '', teilenummer: '', kunde: '', endDatum: '',
    zuständig: '', aufwandStunden: 0, zusätzlicheInfos: '',
    arbeitsstation: '', id: null, status: 'NEU',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (task) {
      setTaskData({
        bezeichnung: task.bezeichnung || '',
        teilenummer: task.teilenummer || '',
        kunde: task.kunde || '',
        zusätzlicheInfos: task.zusätzlicheInfos || '',
        aufwandStunden: task.aufwandStunden ?? 0,
        zuständig: task.zuständig || '',
        endDatum: task.endDatum ? task.endDatum.split('T')[0] : '',
        arbeitsstation: task.arbeitsstation || (stations.length > 0 ? stations[0].name : ''),
        id: task.id,
        status: task.status || 'NEU',
      });
    }
  }, [task, stations]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const newValue = type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value;
    setTaskData((prev) => ({ ...prev, [name]: newValue }));
  };

  const setStatus = (status) => setTaskData((p) => ({ ...p, status }));

  const buildPayload = () => {
    const p = { ...taskData };
    if (!p.endDatum) delete p.endDatum;
    return p;
  };

  const handleSave = async () => {
    if (!taskData.bezeichnung.trim()) {
      setSubmitError('Die Bezeichnung ist ein Pflichtfeld!');
      return;
    }
    setIsSaving(true);
    setSubmitError(null);
    try {
      const dataToSend = buildPayload();
      await axios.patch(`${API_BASE_URL}/${task.id}`, dataToSend, {
        headers: { 'Content-Type': 'application/json' }
      });
      onSave?.(dataToSend);
      onClose();
    } catch (err) {
      console.error('Fehler beim Speichern der Aufgabe:', err?.response?.data || err?.message);
      const serverMessage = err?.response?.data?.message || 'Unbekannter Fehler beim Server.';
      setSubmitError(`Fehler beim Speichern: ${serverMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Möchten Sie diese Aufgabe wirklich löschen?')) return;
    setIsSaving(true);
    try {
      await axios.delete(`${API_BASE_URL}/${task.id}`);
      onClose();
    } catch (err) {
      console.error('Fehler beim Löschen der Aufgabe:', err?.response?.data || err?.message);
      setSubmitError('Fehler beim Löschen der Aufgabe.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!task || !task.id) return null;

  return (
    <div style={modalStyles.modalOverlay} onClick={onClose}>
      <div style={modalStyles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>Aufgabe bearbeiten ✏️ (#ID {task.id})</h2>
          <div style={modalStyles.headerRight}>
            <button onClick={onClose} style={modalStyles.closeButton}>✕</button>
          </div>
        </div>

        {submitError && <p style={{ color: '#ef4444' }}>{submitError}</p>}

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          {/* Basisdaten & Zuweisung */}
          <div style={modalStyles.sectionContainer}>
            <h3 style={modalStyles.sectionTitle}>Basisdaten & Zuweisung</h3>

            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label} htmlFor="bezeichnung">Bezeichnung *</label>
              <input
                style={modalStyles.input}
                type="text" id="bezeichnung" name="bezeichnung"
                value={taskData.bezeichnung} onChange={handleChange}
                required disabled={isSaving}
              />
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label} htmlFor="teilenummer">Teilenummer</label>
                <input
                  style={modalStyles.input}
                  type="text" id="teilenummer" name="teilenummer"
                  value={taskData.teilenummer} onChange={handleChange}
                  disabled={isSaving}
                />
              </div>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label} htmlFor="kunde">Kunde</label>
                <input
                  style={modalStyles.input}
                  type="text" id="kunde" name="kunde"
                  value={taskData.kunde} onChange={handleChange}
                  disabled={isSaving}
                />
              </div>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label} htmlFor="endDatum">Enddatum</label>
                <input
                  style={modalStyles.input}
                  type="date" id="endDatum" name="endDatum"
                  value={taskData.endDatum} onChange={handleChange}
                  disabled={isSaving}
                />
              </div>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label} htmlFor="aufwandStunden">Aufwand (Std.)</label>
                <input
                  style={modalStyles.input}
                  type="number" id="aufwandStunden" name="aufwandStunden"
                  value={taskData.aufwandStunden} onChange={handleChange}
                  disabled={isSaving}
                />
              </div>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label} htmlFor="zuständig">Zuständigkeit</label>
                <input
                  style={modalStyles.input}
                  type="text" id="zuständig" name="zuständig"
                  value={taskData.zuständig} onChange={handleChange}
                  disabled={isSaving}
                />
              </div>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label} htmlFor="arbeitsstation">Station</label>
                <select
                  style={modalStyles.input}
                  id="arbeitsstation" name="arbeitsstation"
                  value={taskData.arbeitsstation} onChange={handleChange}
                  disabled={isSaving}
                >
                  {stations.map((s) => (
                    <option key={s.id ?? s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status-Badges */}
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Status</label>
              <div style={modalStyles.badgeRow}>
                {STATUSES.map((s) => {
                  const selected = taskData.status === s;
                  return (
                    <span
                      key={s}
                      role="button"
                      tabIndex={0}
                      aria-pressed={selected}
                      onClick={() => setStatus(s)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setStatus(s)}
                      style={modalStyles.badgeBase(getStatusColor(s), selected)}
                    >
                      {s}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Infos */}
          <div style={modalStyles.sectionContainer}>
            <h3 style={modalStyles.sectionTitle}>Infos</h3>
            <textarea
              style={{ ...modalStyles.input, ...modalStyles.textarea }}
              id="zusätzlicheInfos" name="zusätzlicheInfos"
              value={taskData.zusätzlicheInfos} onChange={handleChange}
              disabled={isSaving}
            />
          </div>

          {/* Footer */}
          <div style={modalStyles.buttonContainer}>
            <button type="button" style={modalStyles.buttonDanger} onClick={handleDelete} disabled={isSaving}>
              🗑 Löschen
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={modalStyles.buttonSecondary} onClick={onClose} disabled={isSaving}>
                Abbrechen
              </button>
              <button type="submit" style={modalStyles.buttonPrimary} disabled={isSaving}>
                {isSaving ? 'Speichern…' : 'Speichern'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskEditModal;
