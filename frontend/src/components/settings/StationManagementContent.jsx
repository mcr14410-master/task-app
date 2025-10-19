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
        borderRadius: '4px', 
        backgroundColor: '#202225', 
        minHeight: '200px', 
        marginBottom: '10px',
    },
    stationItem: (isDragging) => ({
        userSelect: 'none',
        padding: '15px',
        margin: '0 0 8px 0',
        borderRadius: '6px',
        backgroundColor: isDragging ? '#5865f2' : '#40444b',
        color: isDragging ? 'white' : '#dcddde',
        border: isDragging ? '1px solid #5865f2' : '1px solid #4f545c',
        display: 'flex',
        alignItems: 'center',
        boxShadow: isDragging ? '0 2px 5px rgba(0,0,0,0.3)' : 'none',
        transition: 'background-color 0.2s',
        fontWeight: 'bold',
        opacity: isDragging ? 0.9 : 1,
    }),
    handle: {
        fontSize: '1.2rem',
        cursor: 'grab',
        color: '#b9bbbe',
        marginRight: '15px',
        opacity: 0.7,
        paddingRight: '10px',
        borderRight: '1px solid #5c626e',
    },
    deleteButton: {
        backgroundColor: 'transparent',
        color: '#f04747',
        border: 'none',
        padding: '5px 10px',
        marginLeft: '15px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '1.5em', 
        lineHeight: '1',
        borderRadius: '4px',
        transition: 'background-color 0.2s, color 0.2s',
    },
    buttonPrimary: {
        padding: '10px 20px', background: '#5865f2', color: 'white', border: 'none',
        borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95em',
        transition: 'background-color 0.2s',
    },
    inputField: {
        padding: '10px 15px', 
        border: '1px solid #4f545c',
        borderRadius: '6px 0 0 6px',
        backgroundColor: '#3c3f46',
        color: '#dcddde',
        flexGrow: 1, 
        fontSize: '1em',
        outline: 'none',
    },
    addButton: {
        padding: '10px 15px', 
        background: '#43b581', 
        color: 'white', 
        border: 'none',
        borderRadius: '0 6px 6px 0',
        cursor: 'pointer', 
        fontWeight: 'bold', 
        transition: 'background-color 0.2s',
    },
    addStationContainer: {
        display: 'flex', 
        marginBottom: '20px', 
        gap: 0,
    },
    buttonContainer: {
        marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px'
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
        if (!result.destination || isSaving) {
            return;
        }

        const items = reorder(
            localStations,
            result.source.index,
            result.destination.index
        );
        
        setLocalStations(items);
        setError(null); 
    };

    // ✅ ANPASSUNG: Erhält optional die zu speichernde Liste
    const handleSaveOrder = async (stationsToSave = localStations) => { 
        const isManualSave = stationsToSave === localStations;

        if (isManualSave) {
            setIsSaving(true);
            setError(null);
        }
        
        const stations = stationsToSave.map((station, index) => ({
            id: station.id, 
            sortOrder: index, 
            name: station.name, 
        }));
        
        try {
            await axios.patch(`${API_STATION_URL}/reorder`, stations);
            
            if (isManualSave) {
                onUpdate(); // Nur beim Klick auf "Reihenfolge speichern" Modal schließen
            }
            
        } catch (err) {
            console.error("Fehler beim Speichern der Stationsreihenfolge:", err);
            const errorMessage = "Fehler beim Speichern der Reihenfolge. Bitte versuchen Sie es erneut.";
            setError(errorMessage);
        } finally {
            if (isManualSave) {
                setIsSaving(false);
            }
        }
    };
    
    // ✅ ANPASSUNG: onUpdate() entfernt, damit das Modal geöffnet bleibt
    const handleAddStation = async () => {
        if (!newStationName.trim()) {
            setError("Der Stationsname darf nicht leer sein.");
            return;
        }

        setIsSaving(true);
        setError(null);
        
        const newSortOrder = localStations.length; 
        
        const stationData = {
            name: newStationName.trim(),
            sortOrder: newSortOrder,
        };

        try {
            const response = await axios.post(API_STATION_URL, stationData); 
            
            // Lokale Liste sofort mit der neuen Station (inkl. ID vom Backend) aktualisieren
            const newStation = response.data; // Annahme: Backend gibt die erstellte Station zurück
            
            // Lokalen State aktualisieren, um die neue Station anzuzeigen
            setLocalStations([...localStations, newStation]);
            
            setNewStationName('');
            setIsSaving(false);
            
            // ❌ onUpdate() entfernt: Fenster bleibt offen
            
        } catch (err) {
            console.error("Fehler beim Anlegen der Station:", err);
            const errorMessage = err.response && err.response.status >= 400
                                ? `Fehler beim Erstellen: ${err.response.data?.message || 'Prüfen Sie, ob der Name bereits existiert.'}`
                                : "Netzwerkfehler beim Erstellen der Station.";
            setError(errorMessage);
            setIsSaving(false);
        }
    };
    
    // ANPASSUNG: onUpdate() entfernt und handleSaveOrder mit der neuen Liste aufgerufen
    const handleDeleteStation = async (stationToDelete) => {
        if (!window.confirm(`Sind Sie sicher, dass Sie die Station "${stationToDelete.name}" löschen möchten? Alle zugeordneten Aufgaben werden möglicherweise ebenfalls gelöscht oder verschoben.`)) {
            return;
        }

        setIsSaving(true);
        setError(null);
        
        try {
            await axios.delete(`${API_STATION_URL}/${stationToDelete.id}`); 
            
            // 1. Lokale Liste bereinigen
            const updatedStations = localStations.filter(s => s.id !== stationToDelete.id);
            setLocalStations(updatedStations);
            
            // 2. Reihenfolge im Backend bereinigen, OHNE das Modal zu schließen
            await handleSaveOrder(updatedStations); 
            
            setIsSaving(false);
            setError(null);
            // ❌ onUpdate() entfernt: Fenster bleibt offen
            
        } catch (err) {
            console.error("Fehler beim Löschen der Station:", err);
            const errorMessage = err.response && err.response.status === 409
                                ? `Fehler: Die Station "${stationToDelete.name}" kann nicht gelöscht werden, solange noch Aufgaben zugewiesen sind. Löschvorgang wurde rückgängig gemacht.`
                                : "Fehler beim Löschen der Station. Bitte versuchen Sie es erneut.";
            setError(errorMessage);
            setIsSaving(false);
            // Wenn der DELETE-Request fehlschlägt, den lokalen State auf den alten zurücksetzen
            setLocalStations(initialStations);
        }
    };


    return (
        <div style={styles.content}>
            
            {/* Hinzufügen neuer Stationen */}
            <h3 style={{marginTop: 0, marginBottom: '10px', color: '#dcddde'}}>Neue Station hinzufügen</h3>
            <div style={styles.addStationContainer}>
                <input
                    type="text"
                    placeholder="Stationsname (z.B. 'Prüfung')"
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
            
            <hr style={{borderColor: '#4f545c', margin: '25px 0'}} />

            <h3 style={{marginTop: 0, marginBottom: '10px', color: '#dcddde'}}>Stationsreihenfolge anpassen & Stationen löschen</h3>
            <p style={{ color: '#b9bbbe', fontSize: '0.9em', marginBottom: '15px' }}>
                Ziehen Sie die Stationen, um die Reihenfolge festzulegen. Nutzen Sie das **rote X** zum Löschen.
            </p>
            
            {error && <p style={{ color: '#f04747', padding: '8px', backgroundColor: '#4f2b2b', borderRadius: '4px', fontSize: '0.9em' }}>
                🚨 {error}
            </p>}

            {/* Drag and Drop Liste */}
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="station-list">
                    {(provided) => (
                        <div 
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            style={styles.stationList}
                        >
                            {localStations.map((station, index) => (
                                <Draggable key={station.id} draggableId={String(station.id)} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            style={{
                                                ...styles.stationItem(snapshot.isDragging),
                                                ...provided.draggableProps.style 
                                            }}
                                        >
                                            {/* Drag Handle */}
                                            <div {...provided.dragHandleProps} style={styles.handle}>
                                                &#9776;
                                            </div>
                                            
                                            {/* Station Name */}
                                            <div style={{ flexGrow: 1 }}>
                                                {station.name}
                                            </div>
                                            
                                            {/* Aktuelle Position */}
                                            <span style={{ fontSize: '0.8em', color: '#b9bbbe' }}>
                                                Pos: {index + 1}
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
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            <div style={styles.buttonContainer}>
                <button 
                    onClick={() => handleSaveOrder(localStations)} 
                    style={styles.buttonPrimary} 
                    disabled={isSaving || initialStations.length === 0}
                >
                    {isSaving ? 'Speichere...' : 'Reihenfolge speichern'}
                </button>
            </div>
        </div>
    );
};

export default StationManagementContent;