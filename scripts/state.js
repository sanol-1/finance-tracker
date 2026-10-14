// state.js: the single source of truth for records. (Persistence is added in M6.)

let records = [];

export const getRecords = () => records;
export const setRecords = (list) => { records = list; };

const nextId = () => {
  const max = records.reduce((n, r) => Math.max(n, Number(r.id.split('_')[1]) || 0), 0);
  return `txn_${String(max + 1).padStart(4, '0')}`;
};

export function addRecord({ description, amount, category, date }) {
  const now = new Date().toISOString();
  const rec = {
    id: nextId(), description, amount: Number(amount), category, date,
    createdAt: now, updatedAt: now,
  };
  records = [...records, rec];
  return rec;
}

export function updateRecord(id, { description, amount, category, date }) {
  records = records.map((r) => r.id === id
    ? { ...r, description, amount: Number(amount), category, date, updatedAt: new Date().toISOString() }
    : r);
  return records.find((r) => r.id === id);
}

export function deleteRecord(id) {
  records = records.filter((r) => r.id !== id);
}

const SORTERS = {
  'date-desc': (a, b) => b.date.localeCompare(a.date),
  'date-asc': (a, b) => a.date.localeCompare(b.date),
  'desc-asc': (a, b) => a.description.localeCompare(b.description, undefined, { sensitivity: 'base' }),
  'desc-desc': (a, b) => b.description.localeCompare(a.description, undefined, { sensitivity: 'base' }),
  'amount-asc': (a, b) => a.amount - b.amount,
  'amount-desc': (a, b) => b.amount - a.amount,
};

export const sortRecords = (list, key) => [...list].sort(SORTERS[key] || SORTERS['date-desc']);

// ---------- settings (persistence added in M6) ----------
let settings = { cap: null };
export const getSettings = () => settings;
export const setCap = (value) => { settings = { ...settings, cap: value === '' ? null : Number(value) }; };
