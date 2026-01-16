// frontend/src/utils/pdfTaskParser.js
// Extrahiert Task-Daten aus Fertigungsauftrag-PDFs (ERP Auftragskarte)

import * as pdfjsLib from "pdfjs-dist";

// Worker von CDN laden
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

/**
 * Extrahiert Text aus der ersten Seite eines PDFs
 */
async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  
  // Text-Items zu einem String zusammenfügen
  const text = textContent.items.map(item => item.str).join(" ");
  return text;
}

/**
 * Parst den extrahierten Text und extrahiert die relevanten Felder
 */
function parseTaskData(text) {
  const data = {};

  // FA-Nummer: "Auftrag: 811295"
  const faMatch = text.match(/Auftrag:\s*(\d+)/i);
  if (faMatch) {
    data.fa = faMatch[1];
  }

  // Teilenummer: Steht vor "Index/Stand:" - Format wie "6234.850.119-"
  const teilenrMatch = text.match(/(\d{4}\.\d{3}\.\d{3}[\w\-]*)\s*Index\/Stand/i);
  if (teilenrMatch) {
    data.teilenummer = teilenrMatch[1];
  }

  // Kunde: "Kunde: 10023" - Zahl nach "Kunde:"
  const kundeMatch = text.match(/Kunde:\s*(\d+)/i);
  if (kundeMatch) {
    data.kunde = kundeMatch[1];
  }

  // Stückzahl: "Soll-Produktion: 12"
  const stkMatch = text.match(/Soll-Produktion:\s*(\d+)/i);
  if (stkMatch) {
    data.stk = parseInt(stkMatch[1], 10);
  }

  // Liefertermin: "Liefertermin:" gefolgt von Datum im Format "12.02.26"
  const terminMatch = text.match(/Liefertermin:\s*[\s\S]*?(\d{1,2})\.(\d{1,2})\.(\d{2,4})/i);
  if (terminMatch) {
    let [, day, month, year] = terminMatch;
    // 2-stelliges Jahr zu 4-stellig konvertieren
    if (year.length === 2) {
      year = parseInt(year, 10) > 50 ? `19${year}` : `20${year}`;
    }
    // ISO-Format für Input type="date"
    data.endDatum = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Bezeichnung: Steht zwischen "Artikel-Nr.:" und "ohne Oberfläche" oder "Soll-Produktion"
  // Im PDF ist das z.B. "Aufnahme"
  const bezeichnungMatch = text.match(/Artikel-Nr\.?:\s*([A-Za-zäöüÄÖÜß][A-Za-zäöüÄÖÜß\-\s]{2,30}?)(?=\s+(?:ohne|mit|Soll-Produktion))/i);
  if (bezeichnungMatch) {
    data.bezeichnung = bezeichnungMatch[1].trim();
  }

  return data;
}

/**
 * Hauptfunktion: PDF-File zu Task-Daten
 * @param {File} file - PDF-Datei
 * @returns {Promise<Object>} - Extrahierte Task-Daten
 */
export async function parsePdfToTask(file) {
  if (!file || file.type !== "application/pdf") {
    throw new Error("Bitte eine PDF-Datei auswählen");
  }

  const text = await extractTextFromPdf(file);
  const data = parseTaskData(text);

  return data;
}

/**
 * Debug-Funktion: Gibt den extrahierten Text zurück
 */
export async function extractRawText(file) {
  return await extractTextFromPdf(file);
}
