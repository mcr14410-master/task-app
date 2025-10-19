// Minimaler API-Client für Status (nur Lesen).
// Nutzt den Dev-Proxy (/api → Backend:8080).

const BASE = '/api/statuses';

/**
 * Lädt die Statusliste vom Backend.
 * @param {boolean} activeOnly - true = nur aktive, false = alle
 * @returns {Promise<Array<{code:string,label:string,colorBg:string,colorFg:string,sortOrder:number,isFinal:boolean,active:boolean}>>}
 */
export async function fetchStatuses(activeOnly = true) {
  const url = `${BASE}?activeOnly=${activeOnly ? 'true' : 'false'}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch statuses (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}
