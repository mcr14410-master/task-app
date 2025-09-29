// TaskEditModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/tasks';

// ======================================================================
// STYLES – identisch zur TaskCreationModal
// ======================================================================
const modalStyles = {
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#2e2e2e',
    color: '#f0f0f0',
    padding: '20px 30px',
    borderRadius: '10px',
    width: '500px',
    maxWidth: '600px',
    maxHeight: '85vh',
    overflowY: 'auto',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.6)',
    zIndex: 1001,
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: '10px', marginBottom: '15px',
  },
  title: { fontSize: '1.4rem', color: '#5865f2', margin: 0 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  closeButton: {
    background: 'none', border: 'none', fontSize: '1.4rem',
    color: '#b9bbbe', cursor: 'pointer', transition: 'color 0.2s', padding: '5px',
  },
  sectionContainer: {
    backgroundColor: '#383838', padding: '15px',
    borderRadius: '6px', marginBottom: '15px',
  },
  sectionTitle: {
    color: '#90a4ae', fontSize: '0.9em', fontWeight: 'normal',
    marginBottom: '10px', borderBottom: '1px solid #4f545c',
    paddingBottom: '5px', marginTop: 0, textTransform: 'uppercase',
  },
  formGroup: { marginBottom: '10px' },
  input: {
    width: '100%', padding: '10px',
    borderWidth: 1, borderStyle: 'solid', borderColor: '#5c626e',
    borderRadius: '4px', backgroundColor: '#3c3f46', color: '#dcddde',
    boxSizing: 'border-box', fontSize: '0.95em',
  },
  textarea: { minHeight: '80px', resize: 'vertical' },
  label: { display: 'block', marginBottom: '4px', fontWeight: 600, color: '#dcddde', fontSize: '0.9em' },
  buttonContainer: {
    marginTop: '10px', display: 'flex', justifyContent: 'space-between',
    gap: '8px', paddingTop: '10px', borderTop: '1px solid #4f545c',
  },
  buttonPrimary: {
    padding: '10px 20px', background: '#43b581', color: 'white', border: 'none',
    borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95em',
  },
  buttonSecondary: {
    padding: '10px 20px', background: '#4f545c', color: '#dcddde', border: 'none',
    borderRadius: '4px', cursor: 'pointer', fontSize: '0.95em',
  },
  buttonDanger: {
    padding: '10px 20px', background: '#f04747', color: 'white', border: 'none',
    borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95em',
  },
  // Status-Badges
  badgeRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 6 },
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

// ======================================================================
// Hilfsfunktionen
// ======================================================================
const STATUSES = ['NEU', 'TO_DO', 'DONE'];
const getStatusColor = (status) => {
  switch (status) {
    case 'NEU': return '#7289da';
    case 'TO_DO': return '#faa61a';
    case 'DONE': return '#43b581';
    default: return '#747f8d';
  }
};

// ======================================================================
// TaskEditModal
// ======================================================================
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

  const handleSave = async () => {
    if (!taskData.bezeichnung.trim()) {
      setSubmitError('Die Bezeichnung ist ein Pflichtfeld!');
      return;
    }
    setIsSaving(true);
    setSubmitError(null);
    try {
      const dataToSend = { ...taskData };
      await axios.patch(`${API_BASE_URL}/${task.id}`, dataToSend);
      onSave(dataToSend);
      onClose();
    } catch (err) {
      console.error('Fehler beim Speichern der Aufgabe:', err.response?.data || err.message);
      const serverMessage = err.response?.data?.message || 'Unbekannter Fehler beim Server.';
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
      console.error('Fehler beim Löschen der Aufgabe:', err.response?.data || err.message);
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
            <button onClick={onClose} style={modalStyles.closeButton}>&times;</button>
          </div>
        </div>

        {submitError && <p style={{ color: '#f04747' }}>{submitError}</p>}

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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
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
                    <option key={s.id} value={s.name}>{s.name}</option>
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
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" style={modalStyles.buttonSecondary} onClick={onClose} disabled={isSaving}>
                Abbrechen
              </button>
              <button type="submit" style={modalStyles.buttonPrimary} disabled={isSaving}>
                {isSaving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskEditModal;
