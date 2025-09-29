// TaskBoard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import TaskItem from './TaskItem';
import TaskEditModal from './TaskEditModal';
import TaskCreationModal from './TaskCreationModal';
import StationManagementContent from './StationManagementContent';

const API_BASE_URL = 'http://localhost:8080/api/tasks';
const API_STATION_URL = 'http://localhost:8080/api/arbeitsstationen';

// ----------------------------------------
// Utils & Styles
// ----------------------------------------
const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list || []);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

const modalOverlayStyle = { 
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex',
  justifyContent: 'center', alignItems: 'center', zIndex: 1000
};
const modalContentStyle = { 
  backgroundColor: '#383838', color: '#fff', padding: '30px',
  borderRadius: '10px', width: '600px', maxHeight: '90vh',
  overflowY: 'hidden', boxShadow: '0 8px 25px rgba(0, 0, 0, 0.5)', zIndex: 1001
};

const loadingOverlayStyle = {
  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(32, 34, 37, 0.8)', display: 'flex',
  flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
  zIndex: 100, fontSize: '1.2em', color: '#dcddde', gap: 10
};

const errorOverlayStyle = {
  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(64, 0, 0, 0.65)', display: 'flex',
  flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
  zIndex: 110, color: '#ffdcdc', gap: 12, textAlign: 'center', padding: 16
};

const getColumnStyle = (isDraggingOver) => ({
  background: isDraggingOver ? '#4f545c' : '#3c3f46',
  padding: '12px', width: 300, borderRadius: 8,
  boxShadow: isDraggingOver ? '0 8px 15px rgba(0, 0, 0, 0.4)' : '0 2px 4px rgba(0,0,0,0.5)',
  minHeight: 500, height: '100%', display: 'flex', flexDirection: 'column', flexShrink: 0
});

const columnHeaderStyle = {
  fontSize: '1.2rem', fontWeight: 600, color: '#ffffff',
  marginBottom: 10, paddingBottom: 5, borderBottom: '1px solid #5c626e',
  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'
};

const headerMetricStyle = {
  fontSize: '0.9rem', fontWeight: 400, color: '#b9bbbe', marginLeft: 10,
  display: 'flex', alignItems: 'center', gap: 5
};

const headerStyle = {
  padding: '20px 30px', backgroundColor: '#292b2f', 
  borderBottom: '1px solid #1e2023', display: 'flex',
  justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
  height: 70
};

const buttonPrimaryStyle = {
  padding: '12px 25px', background: '#5865f2', color: 'white', border: 'none',
  borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.2s'
};

const buttonSecondaryStyle = {
  padding: '12px 25px', background: '#4f545c', color: '#dcddde', border: 'none',
  borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.2s'
};

const filterInputStyle = {
  padding: '10px 30px 10px 15px',
  border: '1px solid #4f545c',
  borderRadius: 6,
  backgroundColor: '#3c3f46',
  color: '#dcddde',
  width: 270,
  fontSize: '1rem',
  outline: 'none'
};

const clearSearchButtonStyle = {
  position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', color: '#b9bbbe', cursor: 'pointer',
  fontSize: '1.5em', padding: '0 5px', lineHeight: 1, zIndex: 2
};

// ----------------------------------------
// StationManager (Wrapper) 
// ----------------------------------------
const StationManager = ({ stations, onClose, loadStationsAndTasks }) => {
  const handleUpdateAndClose = async () => {
    await loadStationsAndTasks();
    onClose();
  };
  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div
        style={{ ...modalContentStyle, width: '600px', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, color: '#5865f2' }}>Arbeitsstationen verwalten ⚙️</h2>
        <p style={{ color: '#b9bbbe', fontSize: '0.9em' }}>
          Passen Sie die Reihenfolge der Stationen an. Die Änderungen werden erst nach dem Speichern wirksam.
        </p>

        <StationManagementContent stations={stations} onUpdate={handleUpdateAndClose} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 15 }}>
          <button onClick={onClose} style={buttonSecondaryStyle}>Abbrechen & Schließen</button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------
// Hauptkomponente
// ----------------------------------------
const TaskBoard = () => {
  const [tasksByStation, setTasksByStation] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [isManagingStations, setIsManagingStations] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [stations, setStations] = useState([]);
  const [filterText, setFilterText] = useState('');

  const [loadError, setLoadError] = useState(null);

  // 🔎 Search input ref + hotkeys
  const searchInputRef = useRef(null);
  useEffect(() => {
    const onKeyDown = (e) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (!isCmdOrCtrl && e.key === '/') {
        const t = e.target;
        const isTyping = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
        if (!isTyping) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
        return;
      }

      if (isCmdOrCtrl && (e.key.toLowerCase?.() === 'k' || e.key.toLowerCase?.() === 'f')) {
        e.preventDefault();
        const el = searchInputRef.current;
        el?.focus();
        if (el && typeof el.select === 'function') el.select();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // ---- Load Stations & Tasks
  const loadStations = useCallback(async () => {
    try {
      const response = await axios.get(API_STATION_URL);
      const sorted = (response.data || []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setStations(sorted);
      return sorted;
    } catch (error) {
      console.error('Fehler beim Laden der Stationen:', error);
      setStations([]);
      throw error;
    }
  }, []);

  const loadTasks = useCallback(async (currentStations) => {
    if (!currentStations || currentStations.length === 0) {
      setTasksByStation({});
      setIsLoading(false);
      return;
    }

    if (Object.keys(tasksByStation).length === 0 && !isLoading) setIsLoading(true);

    const allTasks = {};
    const stationNames = currentStations.map(s => s.name).filter(Boolean);
    const promises = [];

    for (const stationName of stationNames) {
      const url = `${API_BASE_URL}/by-station/${encodeURIComponent(stationName)}`;
      const p = axios.get(url)
        .then(res => {
          const arr = Array.isArray(res.data) ? res.data : [];
          allTasks[stationName] = arr
            .slice()
            .sort((a, b) => (a.prioritaet ?? 0) - (b.prioritaet ?? 0));
        })
        .catch(err => {
          console.error(`Fehler beim Laden der Tasks für "${stationName}":`, err);
          allTasks[stationName] = [];
        });
      promises.push(p);
    }

    await Promise.all(promises);
    setTasksByStation(allTasks);
    setIsLoading(false);
  }, [isLoading, tasksByStation]);

  const loadStationsAndTasks = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const sts = await loadStations();
      if (sts && sts.length > 0) {
        await loadTasks(sts);
      } else {
        setIsLoading(false);
      }
    } catch (e) {
      setLoadError('Fehler beim Laden der Board-Daten.');
      setIsLoading(false);
    }
  }, [loadStations, loadTasks]);

  useEffect(() => {
    loadStationsAndTasks();
  }, []); // eslint-disable-line

  const handleTaskCreated = () => {
    loadTasks(stations);
    setIsCreatingTask(false);
  };

  // ---- Edit Modal
  const handleOpenEditModal = (task) => setTaskToEdit(task);

  const handleSaveEditedTask = async (updatedTask) => {
    setTaskToEdit(null);
    setIsSaving(true);
    try {
      await axios.put(`${API_BASE_URL}/${updatedTask.id}`, updatedTask);
      loadTasks(stations);
    } catch (error) {
      console.error('Fehler beim Speichern der Aufgabe:', error);
      loadTasks(stations);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseEditModal = () => {
    setTaskToEdit(null);
    loadTasks(stations);
  };

  // ---- DnD + Backend Update
  const updateBackend = (taskList, stationName) => {
    if (!taskList || taskList.length === 0) return;
    setIsSaving(true);

    const tasksToUpdate = taskList.map((task, index) => ({
      ...task,
      prioritaet: index,
      arbeitsstation: stationName
    }));

    axios.put(`${API_BASE_URL}/sort`, tasksToUpdate)
      .catch(() => {
        loadTasks(stations); // Rollback
      })
      .finally(() => setIsSaving(false));
  };

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (taskToEdit || !destination || isSaving) return;

    const sourceStation = source.droppableId;
    const destinationStation = destination.droppableId;

    setTasksByStation(prevTasks => {
      const prevSourceList = Array.from(prevTasks[sourceStation] || []);
      const prevDestList = Array.from(prevTasks[destinationStation] || []);

      if (sourceStation === destinationStation) {
        const reordered = reorder(prevSourceList, source.index, destination.index);
        const newState = { ...prevTasks, [sourceStation]: reordered };
        updateBackend(newState[sourceStation], sourceStation);
        return newState;
      } else {
        const [movedTask] = prevSourceList.splice(source.index, 1);
        prevDestList.splice(destination.index, 0, { ...movedTask, arbeitsstation: destinationStation });

        const newState = {
          ...prevTasks,
          [sourceStation]: prevSourceList,
          [destinationStation]: prevDestList
        };

        updateBackend(newState[sourceStation], sourceStation);
        updateBackend(newState[destinationStation], destinationStation);

        return newState;
      }
    });
  };

  // ---- Search / Highlight / Overdue
  const getHighlightStatus = (task) => {
    if (!filterText) return false;
    const lower = filterText.toLowerCase();
    const fields = [
      task.bezeichnung, task.teilenummer, task.kunde,
      task.zusätzlicheInfos, task.zuständig, task.arbeitsstation,
      task.titel, task.beschreibung, task.id != null ? String(task.id) : null
    ].filter(Boolean);
    return fields.some(f => String(f).toLowerCase().includes(lower));
  };

  const getIsOverdue = (task) => {
    if (!task.endDatum) return false;
    const due = new Date(task.endDatum);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  // ---- Render
  if (stations.length === 0 && isLoading) {
    return <div style={{ padding: 20, color: '#fff', backgroundColor: '#2f3136' }}>Lade Board-Konfiguration...</div>;
  }

  return (
    <React.Fragment>
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', backgroundColor: '#202225', color: '#fff' }}>
          {/* Header */}
          <div style={headerStyle}>
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#dcddde' }}>Übersicht</h1>

            <div style={{ padding: '0 40px', display: 'flex', alignItems: 'center', gap: 20 }}>
              {/* Search */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Aufgaben suchen (Hervorheben)"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setFilterText('');
                      e.currentTarget.blur();
                    }
                  }}
                  style={filterInputStyle}
                />
                {filterText && (
                  <button
                    onClick={() => setFilterText('')}
                    style={clearSearchButtonStyle}
                    title="Suche löschen"
                  >
                    &times;
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 15 }}>
                <button
                  onClick={() => setIsManagingStations(true)}
                  style={buttonSecondaryStyle}
                  disabled={isSaving || isLoading || !!taskToEdit}
                >
                  Stationen verwalten ⚙️
                </button>

                <button
                  onClick={() => setIsCreatingTask(true)}
                  style={buttonPrimaryStyle}
                  disabled={isSaving || isLoading || !!taskToEdit}
                >
                  + Neue Aufgabe erstellen
                </button>
              </div>
            </div>
          </div>

          {/* Overlays */}
          {(isLoading || isSaving) && (
            <div style={loadingOverlayStyle}>
              <p>{isLoading ? 'Lade Board-Daten...' : 'Speichere Änderungen...'}</p>
              {isLoading && (
                <button
                  onClick={loadStationsAndTasks}
                  style={{ ...buttonSecondaryStyle, padding: '8px 14px' }}
                >
                  Neu laden
                </button>
              )}
            </div>
          )}
          {loadError && !isLoading && (
            <div style={errorOverlayStyle}>
              <div style={{ fontSize: '1.1em' }}>🚨 {loadError}</div>
              <button onClick={loadStationsAndTasks} style={buttonPrimaryStyle}>Erneut laden</button>
            </div>
          )}

          {/* Board */}
          <div
            style={{
              display: 'flex', gap: 25, padding: 20, alignItems: 'flex-start',
              overflowX: 'auto', overflowY: 'hidden', height: 'calc(100% - 70px)',
              justifyContent: 'center'
            }}
          >
            {stations.map(station => {
              const currentTasks = tasksByStation[station.name] || [];
              const taskCount = currentTasks.length;
              const totalEffort = currentTasks.reduce((sum, t) => {
                const v = Number(t.aufwandStunden);
                return sum + (Number.isFinite(v) ? v : 0);
              }, 0);
              const formattedEffort = Math.round(totalEffort);

              return (
                <Droppable droppableId={station.name} key={station.name}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={getColumnStyle(snapshot.isDraggingOver)}
                    >
                      <h2 style={columnHeaderStyle}>
                        {station.name}
                        <span style={headerMetricStyle}>
                          ({taskCount})
                          <span style={{ opacity: 0.6 }}>|</span>
                          <span title="Gesamtaufwand in Stunden">{formattedEffort} h</span>
                        </span>
                      </h2>

                      <div
                        style={{ flexGrow: 1, overflowY: 'auto', overflowX: 'visible', paddingRight: 8, minHeight: 100 }}
                        className="scrollableList"
                      >
                        {currentTasks.map((task, index) => {
                          const uniqueId = String(task.id);
                          if (!task.bezeichnung && !task.titel) return null;

                          const isHighlighted = getHighlightStatus(task);
                          const isSearching = !!filterText;
                          const isOverdue = getIsOverdue(task);
                          const isDimmed = isSearching && !isHighlighted; // ✅ NEU

                          return (
                            <Draggable
                              key={uniqueId}
                              draggableId={uniqueId}
                              index={index}
                              isDragDisabled={!!taskToEdit || isSaving || isLoading}
                            >
                              {(providedDraggable, snapshotDraggable) => (
                                <TaskItem
                                  task={task}
                                  index={index}
                                  provided={providedDraggable}
                                  snapshot={snapshotDraggable}
                                  isHighlighted={isHighlighted}
                                  isSearching={isSearching}
                                  isOverdue={isOverdue}
                                  isDimmed={isDimmed}            // ✅ NEU: an Karte weitergeben
                                  onDoubleClick={handleOpenEditModal}
                                />
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </div>
      </DragDropContext>

      {/* Modals */}
      {isCreatingTask && (
        <TaskCreationModal
          stations={stations}
          onTaskCreated={handleTaskCreated}
          onClose={() => setIsCreatingTask(false)}
        />
      )}

      {isManagingStations && (
        <StationManager
          stations={stations}
          onClose={() => setIsManagingStations(false)}
          loadStationsAndTasks={loadStationsAndTasks}
        />
      )}

      {taskToEdit && (
        <TaskEditModal
          task={taskToEdit}
          stations={stations}
          onSave={handleSaveEditedTask}
          onClose={handleCloseEditModal}
        />
      )}
    </React.Fragment>
  );
};

export default TaskBoard;
