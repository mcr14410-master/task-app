// Abteilungs-Helfer für die Abteilungsansicht (?abteilung=...)

/**
 * Normalisiert einen Abteilungsnamen für den Vergleich:
 * Groß-/Kleinschreibung egal, Umlaute wie in URLs üblich ("Fräsen" == "fraesen").
 */
export function normalizeAbteilung(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

/** Liest ?abteilung=... aus der aktuellen URL; null, wenn nicht gesetzt oder leer. */
export function getAbteilungFromUrl() {
  try {
    const v = new URLSearchParams(window.location.search).get("abteilung");
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}
