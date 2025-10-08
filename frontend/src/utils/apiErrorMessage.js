// frontend/src/utils/apiErrorMessage.js
export default function apiErrorMessage(err) {
  if (!err) return 'Unbekannter Fehler';
  if (err.response && (err.response.data?.message || err.response.data?.error)) {
    return err.response.data.message || err.response.data.error;
  }
  if (err.body && (err.body.message || err.body.error)) {
    return err.body.message || err.body.error;
  }
  if (err.body && Array.isArray(err.body.fieldErrors) && err.body.fieldErrors.length) {
    return err.body.fieldErrors.map(f => `${f.field}: ${f.message}`).join(', ');
  }
  return err.message || String(err);
}
