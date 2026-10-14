import {
  validateDescription, validateAmount, validateCategory, validateDate, validateRecord,
  collapseSpaces, validateSettingsForm, validateImportData, validateSettingsObject, parseCategories,
} from './validators.js';
import {
  announce, showFieldError, clearErrors, fillCategories, renderRecords, setSearchError,
  fillForm, renderStats, renderCap, renderConversions,
} from './ui.js';
import {
  getRecords, setRecords, addRecord, updateRecord, deleteRecord, sortRecords,
  getSettings, setSettings, setCap,
} from './state.js';
import { computeStats, last7Days, capStatus, convertTotals } from './stats.js';
import { compileRegex, filterRecords } from './search.js';
import { loadRecords, saveRecords, loadSettings, saveSettings, exportJSON } from './storage.js';

const $ = (id) => document.getElementById(id);
const FIELDS = ['description', 'amount', 'category', 'date'];
const SETTING_FIELDS = ['base-currency', 'cur2', 'rate2', 'cur3', 'rate3', 'categories'];
const checkers = { description: validateDescription, amount: validateAmount, category: validateCategory, date: validateDate };
const form = $('record-form');
let lastChangedId = null;

// ---------- Persistence: auto-save after every change ----------
function persist() {
  return saveRecords(getRecords()) && saveSettings(getSettings());
}
function saved(message) {
  if (persist()) announce(message);
  else announce(`${message} Warning: this browser blocked saving, so changes will be lost on refresh.`, true);
}

// ---------- Render pipeline ----------
function refresh() {
  const { re, error } = compileRegex($('search').value, $('case-toggle').checked);
  setSearchError(error);
  const visible = sortRecords(filterRecords(getRecords(), re), $('sort').value);
  renderRecords(visible, re, lastChangedId);
  lastChangedId = null;
}

// Stats always cover ALL records (not just the filtered ones).
function refreshStats() {
  const all = getRecords();
  const { baseCurrency, currencies, cap } = getSettings();
  const stats = computeStats(all);
  renderStats(stats, last7Days(all), baseCurrency);
  renderConversions(convertTotals(stats.sum, currencies));
  renderCap(capStatus(stats.sum, cap), baseCurrency);
}

function refreshAll() {
  fillCategories(getSettings().categories);
  refresh();
  refreshStats();
}

// ---------- Settings form ----------
function fillSettingsForm() {
  const s = getSettings();
  $('base-currency').value = s.baseCurrency;
  $('cur2').value = s.currencies[0].code;
  $('rate2').value = String(s.currencies[0].rate);
  $('cur3').value = s.currencies[1].code;
  $('rate3').value = String(s.currencies[1].rate);
  $('categories').value = s.categories.join(', ');
  $('cap').value = s.cap === null ? '' : String(s.cap);
}

function applySettingsForm() {
  const values = {
    baseCurrency: $('base-currency').value.trim().toUpperCase(),
    cur2: $('cur2').value.trim().toUpperCase(),
    rate2: $('rate2').value.trim(),
    cur3: $('cur3').value.trim().toUpperCase(),
    rate3: $('rate3').value.trim(),
    categories: $('categories').value,
  };
  const errors = validateSettingsForm(values);
  SETTING_FIELDS.forEach((f) => showFieldError(f, errors[f] || ''));
  if (Object.keys(errors).length) {
    announce('Settings not saved. Please fix the highlighted fields.', true);
    return;
  }
  setSettings({
    baseCurrency: values.baseCurrency,
    currencies: [
      { code: values.cur2, rate: Number(values.rate2) },
      { code: values.cur3, rate: Number(values.rate3) },
    ],
    categories: parseCategories(values.categories),
  });
  fillSettingsForm();
  refreshAll();
  saved('Settings saved.');
}

$('settings').addEventListener('change', (event) => {
  if (SETTING_FIELDS.includes(event.target.id)) applySettingsForm();
});

$('cap').addEventListener('input', () => {
  const v = $('cap').value.trim();
  const err = v === '' ? '' : validateAmount(v);
  showFieldError('cap', err);
  if (!err) { setCap(v); refreshStats(); persist(); }
});

// ---------- Record form ----------
FIELDS.forEach((name) => {
  $(name).addEventListener('blur', () => {
    const el = $(name);
    if (name === 'description') el.value = collapseSpaces(el.value);
    if (el.value === '') return;
    showFieldError(name, checkers[name](el.value));
  });
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const values = Object.fromEntries(FIELDS.map((f) => [f, $(f).value]));
  values.description = collapseSpaces(values.description);
  $('description').value = values.description;

  const errors = validateRecord(values);
  FIELDS.forEach((f) => showFieldError(f, errors[f] || ''));
  const firstBad = FIELDS.find((f) => errors[f]);
  if (firstBad) {
    $(firstBad).focus();
    announce(`Please fix ${Object.keys(errors).length} field(s) before saving.`, true);
    return;
  }

  const id = $('rec-id').value;
  const rec = id ? updateRecord(id, values) : addRecord(values);
  lastChangedId = rec.id;
  form.reset();
  $('rec-id').value = '';
  refresh();
  refreshStats();
  saved(id ? 'Record updated.' : 'Record added.');
});

form.addEventListener('reset', () => { clearErrors(FIELDS); $('rec-id').value = ''; });

// ---------- Table actions (event delegation) ----------
$('records-body').addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.closest('tr').dataset.id;
  const rec = getRecords().find((r) => r.id === id);
  if (btn.dataset.action === 'edit') {
    fillForm(rec);
    announce(`Editing "${rec.description}". Change the fields and save.`);
  } else if (confirm(`Delete "${rec.description}"?`)) {
    deleteRecord(id);
    refresh();
    refreshStats();
    saved('Record deleted.');
  }
});

// ---------- Search + sort ----------
['input', 'change'].forEach((evt) => {
  $('search').addEventListener(evt, refresh);
  $('case-toggle').addEventListener(evt, refresh);
  $('sort').addEventListener(evt, refresh);
});

// ---------- Import / export ----------
$('export-btn').addEventListener('click', () => {
  exportJSON(getRecords(), getSettings());
  announce(`Exported ${getRecords().length} records.`);
});

$('import-file').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const result = validateImportData(JSON.parse(await file.text()));
    if (!result.ok) {
      announce(`Import failed: ${result.error} Nothing was changed.`, true);
      return;
    }
    setRecords(result.records);
    if (result.settings) setSettings(result.settings);
    fillSettingsForm();
    refreshAll();
    saved(`Imported ${result.records.length} records.`);
  } catch {
    announce('Import failed: that file is not valid JSON. Nothing was changed.', true);
  } finally {
    event.target.value = ''; // allow re-importing the same file
  }
});

// ---------- Startup: saved data first, seed.json only on the very first visit ----------
async function start() {
  const storedSettings = loadSettings();
  if (storedSettings) {
    const s = validateSettingsObject(storedSettings);
    if (s.ok) setSettings(s.settings);
  }

  let records = null;
  const stored = loadRecords();
  if (stored) {
    const v = validateImportData(stored);
    if (v.ok) records = v.records;
  }
  if (!records) {
    try {
      const seed = validateImportData(await (await fetch('seed.json')).json());
      records = seed.ok ? seed.records : [];
    } catch {
      records = [];
      announce('Could not load the sample data.', true);
    }
    setRecords(records);
    persist();
  }
  setRecords(records);
  fillSettingsForm();
  refreshAll();
}
start();
