// Minimaler API-Client für Status (GET + CRUD).
// Nutzt den Dev-Proxy (/api → Backend:8080).

const BASE = '/api/statuses';

/**
 * Lädt die Statusliste vom Backend.
 * @param {boolean} activeOnly - true = nur aktive, false = alle
 */
export async function fetchStatuses(activeOnly = true) {
  const url = `${BASE}?activeOnly=${activeOnly ? 'true' : 'false'}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) {
    const text = await safeText(res);
    throw new Error(`Failed to fetch statuses (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * Neuen Status anlegen.
 * payload: { code, label, colorBg, colorFg, sortOrder, isFinal, active }
 */
export async function createStatus(payload) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await safeText(res);
    throw new Error(`Failed to create status (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * Status aktualisieren (auch Code-Umbenennung möglich).
 * currentCode = momentaner Code in der URL
 * payload: { code, label, colorBg, colorFg, sortOrder, isFinal, active }
 */
export async function updateStatus(currentCode, payload) {
  const res = await fetch(`${BASE}/${encodeURIComponent(currentCode)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await safeText(res);
    throw new Error(`Failed to update status (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * Status "löschen" = Soft-Delete (active=false auf Server-Seite).
 */
export async function deleteStatus(code) {
  const res = await fetch(`${BASE}/${encodeURIComponent(code)}`, { method: 'DELETE' });
  if (!res.ok) {
    const text = await safeText(res);
    throw new Error(`Failed to delete status (${res.status}): ${text}`);
  }
}

async function safeText(res) {
  try { return await res.text(); } catch { return res.statusText || ''; }
}
