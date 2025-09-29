// TaskItem.jsx
import React, { useState } from 'react';
import { FaUser, FaClock, FaTag, FaCalendarAlt } from 'react-icons/fa';

const TaskItem = ({
  task,
  index,
  provided,
  snapshot,
  isHighlighted,
  isSearching,
  onDoubleClick
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // -------------------------------
  // Fälligkeit berechnen
  // -------------------------------
  let dueColor = '#b9bbbe';
  let borderColor = 'transparent';

  if (task.endDatum) {
    const dueDate = new Date(task.endDatum); dueDate.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    if (dueDate < today) {
      dueColor = '#f04747'; // rot
      borderColor = '#f04747';
    } else if (dueDate.getTime() === today.getTime()) {
      dueColor = '#ffa500'; // orange
      borderColor = '#ffa500';
    } else if (dueDate.getTime() === tomorrow.getTime()) {
      dueColor = '#ffff00'; // gelb
      borderColor = '#ffff00';
    }
  }

  // Status-Badge Farben
  const statusColors = {
    NEU: '#5865f2',
    TO_DO: '#faa61a',
    IN_PROGRESS: '#43b581',
    DONE: '#2ecc71',
  };
  const statusColor = statusColors[task.status] || '#4f545c';

  // -------------------------------
  // Hover/Drag Effekte
  // -------------------------------
  const dndStyle = provided.draggableProps.style || {};
  const baseTransform = dndStyle.transform || ''; // z. B. translate3d(...)
  const extraTransform = snapshot.isDragging
    ? ' rotate(2deg) scale(1.03)'
    : isHovered
    ? ' scale(1.02)'
    : '';
  const composedTransform = `${baseTransform || ''}${extraTransform}`;

  const boxShadow = snapshot.isDragging
    ? '0 10px 18px rgba(0,0,0,0.45)'
    : isHovered
    ? '0 6px 12px rgba(0,0,0,0.35)'
    : '0 2px 5px rgba(0,0,0,0.2)';

  // -------------------------------
  // Render
  // -------------------------------
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onDoubleClick={() => onDoubleClick(task)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        userSelect: 'none',
        padding: 15,
        margin: '0 0 10px 0',
        borderRadius: 8,
        background: isHighlighted ? '#7289da33' : '#2f3136',
        border: `2px solid ${borderColor}`,
        opacity: isSearching && !isHighlighted ? 0.4 : 1,
        transformOrigin: 'center',
        transition: 'transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease',
        willChange: 'transform, box-shadow',
        boxShadow,
        // zuerst alle DnD-Styles übernehmen ...
        ...dndStyle,
        // ... und DANN transform gezielt überschreiben, damit unser scale erhalten bleibt
        transform: composedTransform || dndStyle.transform,
      }}
    >
      {/* Titel */}
      <h4 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '1.05em', fontWeight: 600 }}>
        {task.bezeichnung || task.titel}
      </h4>

      {/* Meta Infos */}
      <div style={{ fontSize: '0.85em', color: '#b9bbbe', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Zeile 1: Teilenummer | Kunde */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FaTag /> {task.teilenummer || '-'}
          </span>
          <span>{task.kunde || '-'}</span>
        </div>

        {/* Zeile 2: Zuständigkeit | Aufwand */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FaUser /> {task.zuständig || 'offen'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FaClock /> {task.aufwandStunden ? `${task.aufwandStunden}h` : '0h'}
          </span>
        </div>

        {/* Zeile 3: Enddatum (links, wenn vorhanden) | Status (immer rechts) */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {task.endDatum && (
            <div style={{ fontSize: '0.85em', color: dueColor, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FaCalendarAlt style={{ color: dueColor }} />
              <span>{new Date(task.endDatum).toLocaleDateString()}</span>
            </div>
          )}

          {task.status && (
            <div
              style={{
                padding: '4px 10px',
                backgroundColor: statusColor,
                color: '#fff',
                borderRadius: 20,
                fontSize: '0.75em',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                marginLeft: 'auto', // immer rechts
              }}
            >
              {task.status}
            </div>
          )}
        </div>
      </div>

      {/* Beschreibung */}
      {task.zusätzlicheInfos && (
        <p
          style={{
            margin: '8px 0 0 0',
            fontSize: '0.85em',
            color: '#dcddde',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={task.zusätzlicheInfos}
        >
          {task.zusätzlicheInfos}
        </p>
      )}
    </div>
  );
};

export default TaskItem;
