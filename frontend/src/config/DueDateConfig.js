// frontend/src/config/DueDateConfig.js
// Zentrale Steuerung der Fälligkeits-Logik und -Schwellen.
// Passe nur diese Datei an, um Buckets/Schwellen zu ändern.

export const DUE_BUCKETS = [
  // Reihenfolge ist wichtig (vom strengsten zum lockersten Match)
  { key: 'overdue', label: 'Überfällig', maxDaysDiff: -1 }, // < 0 Tage (in der Vergangenheit)
  { key: 'today',   label: 'Heute',      maxDaysDiff: 0  }, // genau heute
  { key: 'soon',    label: 'Bald',       maxDaysDiff: 3  }, // <= 3 Tage
  { key: 'week',    label: 'Diese Woche',maxDaysDiff: 7  }, // <= 7 Tage
  { key: 'future',  label: 'Später',     maxDaysDiff: Infinity }, // > 7 Tage
];

/**
 * Ermittelt den Bucket (overdue, today, soon, week, future) für ein gegebenes Datum (yyyy-MM-dd oder ISO).
 * @param {string|Date} dateInput
 * @returns {{key:string,label:string,daysDiff:number}}
 */
export function dueBucket(dateInput) {
  if (!dateInput) return { key: 'future', label: 'Später', daysDiff: Infinity };
  const today = new Date(); today.setHours(0,0,0,0);

  let d;
  if (typeof dateInput === 'string') {
    // yyyy-MM-dd oder ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [y,m,dd] = dateInput.split('-').map(Number);
      d = new Date(y, m-1, dd);
    } else {
      d = new Date(dateInput);
    }
  } else if (dateInput instanceof Date) {
    d = new Date(dateInput);
  } else {
    return { key: 'future', label: 'Später', daysDiff: Infinity };
  }
  if (Number.isNaN(d.getTime())) return { key: 'future', label: 'Später', daysDiff: Infinity };
  d.setHours(0,0,0,0);

  const msPerDay = 24*60*60*1000;
  const daysDiff = Math.floor((d.getTime() - today.getTime())/msPerDay);

  // Match: erst overdue/today, dann aufsteigend
  if (daysDiff < 0) return { key: 'overdue', label: 'Überfällig', daysDiff };
  if (daysDiff === 0) return { key: 'today', label: 'Heute', daysDiff };
  if (daysDiff <= 3) return { key: 'soon', label: 'Bald', daysDiff };
  if (daysDiff <= 7) return { key: 'week', label: 'Diese Woche', daysDiff };
  return { key: 'future', label: 'Später', daysDiff };
}

/** Liefert die CSS-Klasse für den Bucket (z. B. "due-today") */
export function dueClassForDate(dateInput) {
  const b = dueBucket(dateInput);
  return `due-${b.key}`;
}
