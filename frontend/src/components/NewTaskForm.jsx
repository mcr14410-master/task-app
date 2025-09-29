import React, { useState } from 'react';
import axios from 'axios';

// Beispiel-Daten für Dropdowns (Muss durch echte Daten aus dem Backend ersetzt werden!)
const kundenListe = ['Firma A', 'Kunde B', 'Projekt C', 'Internes Projekt'];
const mitarbeiterListe = ['Anna Müller', 'Ben Schulze', 'Chris Wagner', 'Deine Person'];

const API_BASE_URL = 'http://localhost:8080/api/tasks';

// Styles (aus TaskEditModal übernommen)
const formStyles = {
    formGroup: { marginBottom: '15px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: '600', color: '#b9bbbe', fontSize: '0.95rem' },
    input: {
        width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #4f545c',
        backgroundColor: '#40444b', color: '#dcddde', fontSize: '1rem', boxSizing: 'border-box',
    },
    textarea: { minHeight: '100px', resize: 'vertical' },
    buttonContainer: { marginTop: '25px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    primaryButton: {
        padding: '10px 20px', borderRadius: '4px', border: 'none', backgroundColor: '#5865f2',
        color: 'white', fontWeight: 'bold', cursor: 'pointer',
    },
    secondaryButton: {
        padding: '10px 20px', borderRadius: '4px', border: '1px solid #72767d',
        backgroundColor: 'transparent', color: '#dcddde', cursor: 'pointer',
    },
};

const NewTaskForm = ({ stations, onTaskCreated, onCancel }) => {
    
    // Initialer Zustand für eine neue Aufgabe
    const [taskData, setTaskData] = useState({
        bezeichnung: '', 
        teilenummer: '', 
        kunde: kundenListe[0] || '', 
        zusätzlicheInfos: '', 
        aufwandStunden: 0,
        zuständig: mitarbeiterListe[0] || '',
        endDatum: '',
        // Standardmäßig die erste Station oder 'TODO' zuweisen
        arbeitsstation: stations.length > 0 ? stations[0].name : 'TODO', 
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setTaskData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value
        }));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        
        // Fügt Status und Prio als initiale Werte hinzu (kann vom Backend ignoriert werden)
        const taskToSubmit = { 
            ...taskData, 
            status: 'TODO', 
            prioritaet: 9999,
        };

        try {
            await axios.post(API_BASE_URL, taskToSubmit);
            onTaskCreated(); // Ruft die Success-Callback im TaskBoard auf (lädt Tasks neu)
        } catch (err) {
            console.error("Fehler beim Erstellen der Aufgabe:", err);
            setError("Fehler beim Erstellen der Aufgabe. Bitte versuchen Sie es erneut.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Dropdown-Optionen für die Stationen
    const renderStationOptions = () => (
        stations.map(s => (
            <option key={s.name} value={s.name}>{s.name}</option>
        ))
    );
    
    // Hilfsfunktion, um Dropdown-Optionen zu rendern (Kunde/Zuständige Person)
    const renderDropdownOptions = (list) => (
        list.map(item => (
            <option key={item} value={item}>{item}</option>
        ))
    );

    return (
        <form onSubmit={handleSubmit}>
            
            {/* GEÄNDERTES FELD: Bezeichnung */}
            <div style={formStyles.formGroup}>
                <label style={formStyles.label} htmlFor="bezeichnung">Bezeichnung</label>
                <input
                    style={formStyles.input} type="text" id="bezeichnung" name="bezeichnung"
                    value={taskData.bezeichnung} onChange={handleChange} required
                />
            </div>
            
            {/* NEUES FELD: Teilenummer */}
            <div style={formStyles.formGroup}>
                <label style={formStyles.label} htmlFor="teilenummer">Teilenummer</label>
                <input
                    style={formStyles.input} type="text" id="teilenummer" name="teilenummer"
                    value={taskData.teilenummer} onChange={handleChange}
                />
            </div>

            {/* NEUES FELD (DROPDOWN): Kunde */}
            <div style={formStyles.formGroup}>
                <label style={formStyles.label} htmlFor="kunde">Kunde</label>
                <select
                    style={formStyles.input} id="kunde" name="kunde"
                    value={taskData.kunde} onChange={handleChange} required
                >
                    {renderDropdownOptions(kundenListe)}
                </select>
            </div>

            {/* NEUES FELD (DROPDOWN): Zuständige Person */}
            <div style={formStyles.formGroup}>
                <label style={formStyles.label} htmlFor="zuständig">Zuständige Person</label>
                <select
                    style={formStyles.input} id="zuständig" name="zuständig"
                    value={taskData.zuständig} onChange={handleChange} required
                >
                    {renderDropdownOptions(mitarbeiterListe)}
                </select>
            </div>
            
            {/* UNVERÄNDERT: Enddatum */}
            <div style={formStyles.formGroup}>
                <label style={formStyles.label} htmlFor="endDatum">Enddatum</label>
                <input
                    style={formStyles.input} type="date" id="endDatum" name="endDatum"
                    value={taskData.endDatum} onChange={handleChange}
                />
            </div>

            {/* NEUES FELD: Geschätzter Aufwand (Stunden) */}
            <div style={formStyles.formGroup}>
                <label style={formStyles.label} htmlFor="aufwandStunden">Geschätzter Aufwand (Stunden)</label>
                <input
                    style={formStyles.input} type="number" id="aufwandStunden" name="aufwandStunden"
                    value={taskData.aufwandStunden} onChange={handleChange} min="0"
                />
            </div>

            {/* UNVERÄNDERT: Arbeitsstation (Startstation) */}
            <div style={formStyles.formGroup}>
                <label style={formStyles.label} htmlFor="arbeitsstation">Start-Arbeitsstation</label>
                <select
                    style={formStyles.input} id="arbeitsstation" name="arbeitsstation"
                    value={taskData.arbeitsstation} onChange={handleChange} required
                >
                    {renderStationOptions()}
                </select>
            </div>

            {/* GEÄNDERTES FELD: Zusätzliche Infos (Textarea) */}
            <div style={formStyles.formGroup}>
                <label style={formStyles.label} htmlFor="zusätzlicheInfos">Zusätzliche Infos</label>
                <textarea
                    style={{ ...formStyles.input, ...formStyles.textarea }} id="zusätzlicheInfos" name="zusätzlicheInfos"
                    value={taskData.zusätzlicheInfos} onChange={handleChange}
                ></textarea>
            </div>
            
            {error && <p style={{ color: '#f44336' }}>{error}</p>}

            <div style={formStyles.buttonContainer}>
                <button type="button" onClick={onCancel} style={formStyles.secondaryButton} disabled={isSubmitting}>Abbrechen</button>
                <button type="submit" style={formStyles.primaryButton} disabled={isSubmitting}>
                    {isSubmitting ? 'Speichere...' : 'Aufgabe erstellen'}
                </button>
            </div>
        </form>
    );
};

export default NewTaskForm;