import {
  validateDescription, validateAmount, validateCategory, validateDate,
  validateRecord, collapseSpaces,
} from './validators.js';
import { announce, showFieldError, clearErrors, fillCategories, renderRecords, setSearchError, fillForm } from './ui.js';
import { getRecords, setRecords, addRecord, updateRecord, deleteRecord, sortRecords } from './state.js';
import { compileRegex, filterRecords } from './search.js';

const DEFAULT_CATEGORIES = ['Food', 'Books', 'Transport', 'Entertainment', 'Fees', 'Other'];
const FIELDS = ['description', 'amount', 'category', 'date'];
const checkers = { description: validateDescription, amount: validateAmount, category: validateCategory, date: validateDate };

const $ = (id) => document.getElementById(id);
const form = $('record-form');
let lastChangedId = null;

// ---------- Render pipeline: search -> sort -> draw ----------
function refresh() {
  const { re, error } = compileRegex($('search').value, $('case-toggle').checked);
  setSearchError(error);
  const visible = sortRecords(filterRecords(getRecords(), re), $('sort').value);
  renderRecords(visible, re, lastChangedId);
  lastChangedId = null;
}

// ---------- Form ----------
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
    announce(`Please fix ${Object.keys(errors).length} field(s) before saving.`);
    return;
  }

  const id = $('rec-id').value;
  const rec = id ? updateRecord(id, values) : addRecord(values);
  lastChangedId = rec.id;
  announce(id ? 'Record updated.' : 'Record added.');
  form.reset();
  $('rec-id').value = '';
  refresh();
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
    announce('Record deleted.');
    refresh();
  }
});

// ---------- Search + sort ----------
['input', 'change'].forEach((evt) => {
  $('search').addEventListener(evt, refresh);
  $('case-toggle').addEventListener(evt, refresh);
  $('sort').addEventListener(evt, refresh);
});

// ---------- Startup (localStorage replaces this in M6) ----------
fillCategories(DEFAULT_CATEGORIES);
fetch('seed.json')
  .then((r) => r.json())
  .then(setRecords)
  .catch(() => announce('Could not load sample data.'))
  .finally(refresh);
