// StationManagementContent.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const API_STATION_URL = '/api/arbeitsstationen';

// Hilfsfunktion zum Neuanordnen der Liste
const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

// Utils
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const toNumberOrNull = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// ======================================================================
// STYLES
// ======================================================================
const styles = {
  content: {
    padding: '10px 0',
    maxHeight: 'calc(80vh - 100px)',
    overflowY: 'auto',
  },
  stationList: {
    padding: '10px',
    borderRadius: '8px',
    backgroundColor: '#202225',
    minHeight: '200px',
    marginBottom: '10px',
    border: '1px solid #2a2d33',
  },
  stationItem: (isDragging, hasError) => ({
    userSelect: 'none',
    padding: '14px 12px',
    margin: '0 0 8px 0',
    borderRadius: '10px',
    backgroundColor: isDragging ? '#2a2f3a' : '#1f2329',
    color: '#e5e7eb',
    border: `1px solid ${hasError ? '#b91c1c' : (isDragging ? '#364152' : '#2f3540')}`,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.25)',
    transition: 'background-color 0.2s, border 0.2s, box-shadow 0.2s',
    opacity: isDragging ? 0.98 : 1,
  }),
  handle: {
    fontSize: '1.1rem',
    cursor: 'grab',
    color: '#9aa3b2',
    marginRight: '6px',
    paddingRight: '10px',
    borderRight: '1px solid #3b3f46',
    userSelect: 'none',
  },
  name: {
    flexGrow: 1,
    fontWeight: 600,
    letterSpacing: 0.2,
  },
  capWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  capInput: (invalid) => ({
    width: 88,
    padding: '8px 10px',
    borderRadius: 8,
    border: `1px solid ${invalid ? '#b91c1c' : '#444'}`,
    backgroundColor: '#15171b',
    color: '#e5e7eb',
    outline: 'none',
    textAlign: 'right',
  }),
  capSuffix: { fontSize: 12, color: '#9aa3af' },
  posBadge: {
    fontSize: '0.75rem',
    color: '#9aa3af',
    background: '#121418',
    border: '1px solid #2b2f36',
    borderRadius: 8,
    padding: '4px 8px',
  },
  deleteButton: {
    backgroundColor: 'transparent',
    color: '#f87171',
    border: '1px solid #ef444422',
    padding: '6px 10px',
    marginLeft: '6px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.95rem',
    lineHeight: 1,
    borderRadius: '8px',
    transition: 'background-color 0.2s, color 0.2s, border 0.2s',
  },
  buttonPrimary: {
    padding: '10px 16px',
    background: '#3b82f6',
    color: 'white',
    border: '1px solid #2563eb',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.95em',
    transition: 'background-color 0.2s, border 0.2s',
  },
  inputField: {
    padding: '10px 14px',
    border: '1px solid #2f3540',
    borderRadius: '10px 0 0 10px',
    backgroundColor: '#15171b',
    color: '#e5e7eb',
    flexGrow: 1,
    fontSize: '1em',
    outline: 'none',
  },
  addButton: {
    padding: '10px 14px',
    background: '#10b981',
    color: 'white',
    border: '1px solid #0ea47a',
    borderRadius: '0 10px 10px 0',
    cursor: 'pointer',
    fontWeight: 700,
  },
  addStationContainer: {
    display: 'flex',
    marginBottom: '16px',
    gap: 0,
  },
  buttonContainer: {
    marginTop: '16px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  errorBox: {
    color: '#fecaca',
    padding: '10px',
    backgroundColor: 'rgba(239,68,68,0.10)',
    border: '1px solid rgba(239,68,68,0.35)',
    borderRadius: '10px',
    fontSize: '0.95em',
    margin: '10px 0 14px',
  },
};

// ======================================================================
// STATION MANAGEMENT KOMPONENTE
// ======================================================================

const StationManagementContent = ({ stations: initialStations, onUpdate }) => {
  const [localStations, setLocalStations] = useState(initialStations);
  const [newStationName, setNewStationName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLocalStations(initialStations);
  }, [initialStations]);

  const onDragEnd = (result) => {
    if (!result.destination || isSaving) return;
    const items = reorder(localStations, result.source.index, result.destination.index);
    setLocalStations(items);
    setError(null);
  };

  // Reihenfolge + Kapazität speichern (PATCH /reorder), prepared für Backend-Erweiterung
  const handleSaveOrder = async (stationsToSave = localStations) => {
    const isManualSave = stationsToSave === localStations;

    if (isManualSave) {
      setIsSaving(true);
      setError(null);
    }

    const stations = stationsToSave.map((s, index) => ({
      id: s.id,
      sortOrder: index,
      name: s.name,
      // NEU: Kapazität mitsenden (Backend wird im nächsten Step erweitert)
      dailyCapacityHours: s.dailyCapacityHours ?? 8.0,
    }));

    try {
      await axios.patch(`${API_STATION_URL}/reorder`, stations);
      if (isManualSave) onUpdate?.();
    } catch (err) {
      console.error('Fehler beim Speichern der Stationsreihenfolge:', err);
      const errorMessage = 'Fehler beim Speichern. Bitte erneut versuchen.';
      setError(errorMessage);
    } finally {
      if (isManualSave) setIsSaving(false);
    }
  };

  const handleAddStation = async () => {
    if (!newStationName.trim()) {
      setError('Der Stationsname darf nicht leer sein.');
      return;
    }
    setIsSaving(true);
    setError(null);

    const stationData = {
      name: newStationName.trim(),
      sortOrder: localStations.length,
      // NEU: Default-Kapazität 8.00
      dailyCapacityHours: 8.0,
    };

    try {
      const response = await axios.post(API_STATION_URL, stationData);
      const newStation = response.data;
      setLocalStations([...localStations, newStation]);
      setNewStationName('');
      setIsSaving(false);
    } catch (err) {
      console.error('Fehler beim Anlegen der Station:', err);
      const errorMessage =
        err.response && err.response.status >= 400
          ? `Fehler beim Erstellen: ${err.response.data?.message || 'Prüfen Sie, ob der Name bereits existiert.'}`
          : 'Netzwerkfehler beim Erstellen der Station.';
      setError(errorMessage);
      setIsSaving(false);
    }
  };

  const handleDeleteStation = async (stationToDelete) => {
    if (!window.confirm(`Station "${stationToDelete.name}" löschen?`)) return;

    setIsSaving(true);
    setError(null);

    try {
      await axios.delete(`${API_STATION_URL}/${stationToDelete.id}`);
      const updatedStations = localStations.filter((s) => s.id !== stationToDelete.id);
      setLocalStations(updatedStations);
      await handleSaveOrder(updatedStations); // Reihenfolge & Kapazitäten neu persistieren
      setIsSaving(false);
      setError(null);
    } catch (err) {
      console.error('Fehler beim Löschen der Station:', err);
      const errorMessage =
        err.response && err.response.status === 409
          ? `Fehler: Die Station "${stationToDelete.name}" kann nicht gelöscht werden, solange noch Aufgaben zugewiesen sind.`
          : 'Fehler beim Löschen der Station. Bitte erneut versuchen.';
      setError(errorMessage);
      setIsSaving(false);
      setLocalStations(initialStations);
    }
  };

  // Inline-Change für Kapazität (nur State + Validierung; Persistenz beim Speichern)
  const handleCapacityChange = (idx, value) => {
    const num = toNumberOrNull(value);
    setLocalStations((prev) => {
      const next = [...prev];
      const old = next[idx] || {};
      // weiche Validierung: null erlaubt im UI, harte Kappung beim Speichern
      next[idx] = { ...old, dailyCapacityHours: num };
      return next;
    });
    setError(null);
  };

  // einfache Validierung pro Zeile (rot markiert)
  const isRowInvalid = (s) => {
    const v = toNumberOrNull(s?.dailyCapacityHours);
    if (v === null) return true;
    return v < 0 || v > 24;
  };

  return (
    <div style={styles.content}>
      {/* Hinzufügen neuer Stationen */}
      <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#e5e7eb' }}>Neue Station hinzufügen</h3>
      <div style={styles.addStationContainer}>
        <input
          type="text"
          placeholder="Stationsname (z. B. 'Prüfung')"
          value={newStationName}
          onChange={(e) => setNewStationName(e.target.value)}
          style={styles.inputField}
          disabled={isSaving}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddStation();
          }}
        />
        <button
          onClick={handleAddStation}
          style={styles.addButton}
          disabled={isSaving || !newStationName.trim()}
        >
          + Hinzufügen
        </button>
      </div>

      <hr style={{ borderColor: '#2b2f36', margin: '18px 0' }} />

      <h3 style={{ marginTop: 0, marginBottom: '8px', color: '#e5e7eb' }}>Stationen verwalten</h3>
      <p style={{ color: '#9aa3af', fontSize: '0.9em', marginBottom: '14px' }}>
        Ziehen Sie die Stationen über <span style={{ opacity: 0.8 }}>⠿</span>, um die Reihenfolge zu ändern.
        Passen Sie pro Station die <strong>Tageskapazität</strong> an.
      </p>

      {error && (
        <div style={styles.errorBox}>
          🚨 {error}
        </div>
      )}

      {/* Drag and Drop Liste */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="station-list">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} style={styles.stationList}>
              {localStations.map((station, index) => {
                const invalid = isRowInvalid(station);
                const capVal = station?.dailyCapacityHours;

                return (
                  <Draggable key={station.id} draggableId={String(station.id)} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={{
                          ...styles.stationItem(snapshot.isDragging, invalid),
                          ...provided.draggableProps.style,
                        }}
                      >
                        {/* Drag Handle */}
                        <div {...provided.dragHandleProps} style={styles.handle} title="Ziehen zum Sortieren">
                          ⠿
                        </div>

                        {/* Station Name */}
                        <div style={styles.name}>{station.name}</div>

                        {/* Tageskapazität (h) */}
                        <div style={styles.capWrap} title="Kapazität pro Tag">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            value={capVal ?? ''}
                            onChange={(e) => handleCapacityChange(index, e.target.value)}
                            onBlur={(e) => {
                              // harte Kappung beim Verlassen
                              const n = toNumberOrNull(e.target.value);
                              const c = n === null ? 8 : clamp(n, 0, 24);
                              handleCapacityChange(index, c);
                            }}
                            style={styles.capInput(invalid)}
                            placeholder="8.0"
                          />
                          <span style={styles.capSuffix}>h/Tag</span>
                        </div>

                        {/* Aktuelle Position */}
                        <span style={styles.posBadge} title="Position">
                          Pos&nbsp;{index + 1}
                        </span>

                        {/* Lösch-Button */}
                        <button
                          onClick={() => handleDeleteStation(station)}
                          style={styles.deleteButton}
                          disabled={isSaving}
                          title={`Station "${station.name}" löschen`}
                        >
                          &times;
                        </button>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div style={styles.buttonContainer}>
        <button
          onClick={() => handleSaveOrder(localStations)}
          style={styles.buttonPrimary}
          disabled={isSaving || localStations.length === 0}
          title="Reihenfolge und Kapazitäten speichern"
        >
          {isSaving ? 'Speichere…' : 'Speichern'}
        </button>
      </div>
    </div>
  );
};

export default StationManagementContent;
