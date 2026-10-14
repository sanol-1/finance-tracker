// storage.js: localStorage + JSON export. Every call is wrapped: storage can be blocked or full.

const DATA_KEY = 'app:data';
const SETTINGS_KEY = 'app:settings';

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const loadRecords = () => read(DATA_KEY);      // null when nothing saved yet
export const saveRecords = (list) => write(DATA_KEY, list);
export const loadSettings = () => read(SETTINGS_KEY);
export const saveSettings = (s) => write(SETTINGS_KEY, s);

export function exportJSON(records, settings) {
  const payload = { version: 1, exportedAt: new Date().toISOString(), settings, records };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finance-tracker-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
