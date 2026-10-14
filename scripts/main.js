import {
  validateDescription, validateAmount, validateCategory, validateDate, validateRecord,
  collapseSpaces, validateSettingsForm, validateImportData, validateSettingsObject, parseCategories,
} from './validators.js';
import {
  announce, showFieldError, clearErrors, fillCategories, renderRecords, setSearchError,
  renderStats, renderCap, renderConversions,
} from './ui.js';
import {
  getRecords, setRecords, addRecord, updateRecord, deleteRecord, sortRecords,
  getSettings, setSettings, setCap,
} from './state.js';
import { computeStats, last7Days, capStatus, convertTotals } from './stats.js';
import { compileRegex, filterRecords } from './search.js';
import { initTheme } from './theme.js';
import { loadRecords, saveRecords, loadSettings, saveSettings, exportJSON } from './storage.js';

const $ = (id) => document.getElementById(id);
const FIELDS = ['description', 'amount', 'category', 'date'];
const SETTING_FIELDS = ['base-currency', 'cur2', 'rate2', 'cur3', 'rate3', 'categories'];
const checkers = { description: validateDescription, amount: validateAmount, category: validateCategory, date: validateDate };
const form = $('record-form');
let lastChangedId = null;
let editingId = null;

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
  if (editingId && !visible.some((r) => r.id === editingId)) editingId = null; // row filtered out
  renderRecords(visible, re, lastChangedId, editingId);
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

  const rec = addRecord(values);
  lastChangedId = rec.id;
  form.reset();
  refresh();
  refreshStats();
  saved('Record added.');
  $('description').focus(); // ready for the next entry
});

form.addEventListener('reset', () => clearErrors(FIELDS));

// ---------- Table actions (event delegation) ----------
const rowOf = (id) => $('records-body').querySelector(`tr[data-id="${id}"]`);
const focusRowButton = (id, action) => rowOf(id)?.querySelector(`button[data-action="${action}"]`)?.focus();

function startEdit(id) {
  const rec = getRecords().find((r) => r.id === id);
  editingId = id;
  refresh();
  rowOf(id).querySelector('input').focus();
  announce(`Editing "${rec.description}". Press Enter to save or Escape to cancel.`);
}

function cancelEdit() {
  const id = editingId;
  editingId = null;
  refresh();
  focusRowButton(id, 'edit');
  announce('Edit cancelled.');
}

function saveEdit() {
  const row = rowOf(editingId);
  const inputs = [...row.querySelectorAll('input.cell')];
  const values = Object.fromEntries(inputs.map((i) => [i.dataset.field, i.value]));
  values.description = collapseSpaces(values.description);
  const errors = validateRecord(values);
  inputs.forEach((i) => {
    if (errors[i.dataset.field]) i.setAttribute('aria-invalid', 'true');
    else i.removeAttribute('aria-invalid');
  });
  const firstBad = inputs.find((i) => errors[i.dataset.field]);
  if (firstBad) {
    firstBad.focus();
    announce(`${firstBad.getAttribute('aria-label')}: ${errors[firstBad.dataset.field]}`, true);
    return;
  }
  const id = editingId;
  updateRecord(id, values);
  editingId = null;
  lastChangedId = id;
  refresh();
  refreshStats();
  focusRowButton(id, 'edit');
  saved('Record updated.');
}

$('records-body').addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.closest('tr').dataset.id;
  const action = btn.dataset.action;
  if (action === 'edit') startEdit(id);
  else if (action === 'save') saveEdit();
  else if (action === 'cancel') cancelEdit();
  else {
    const rec = getRecords().find((r) => r.id === id);
    if (!confirm(`Delete "${rec.description}"?`)) return;
    const rows = [...$('records-body').querySelectorAll('tr')];
    const index = rows.findIndex((tr) => tr.dataset.id === id);
    deleteRecord(id);
    if (editingId === id) editingId = null;
    refresh();
    refreshStats();
    saved('Record deleted.');
    // Keep keyboard focus useful: move to the neighbouring row, or to search when empty.
    const next = $('records-body').querySelectorAll('tr')[Math.min(index, rows.length - 2)];
    if (next) next.querySelector('button[data-action="edit"]').focus();
    else $('search').focus();
  }
});

$('records-body').addEventListener('keydown', (event) => {
  if (!event.target.matches('input.cell')) return;
  if (event.key === 'Enter') { event.preventDefault(); saveEdit(); }
  else if (event.key === 'Escape') { event.preventDefault(); cancelEdit(); }
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
initTheme($('theme-toggle'));
start();
