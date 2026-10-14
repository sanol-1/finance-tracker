// ui.js: DOM helpers. (Table rendering and stats are added in later milestones.)

const $ = (id) => document.getElementById(id);

// Announce a message in the global role="status" region.
export function announce(message) {
  const el = $('status');
  el.textContent = '';
  // Tiny delay so screen readers re-announce identical messages.
  setTimeout(() => { el.textContent = message; }, 30);
}

export function showFieldError(field, message) {
  const input = $(field);
  const err = $(`${field}-err`);
  err.textContent = message;
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

export function clearErrors(fields) {
  fields.forEach((f) => showFieldError(f, ''));
}

export function fillCategories(categories) {
  $('category-list').innerHTML = categories
    .map((c) => `<option value="${c}"></option>`)
    .join('');
}

// ---------- M4: rendering ----------
import { highlight } from './search.js';

export function renderRecords(list, re, flashId = null) {
  const body = $('records-body');
  $('empty-msg').hidden = list.length > 0;
  $('empty-msg').textContent = re
    ? 'No records match that pattern.'
    : 'No records yet. Add your first transaction in the form below.';
  body.innerHTML = list.map((r) => `
    <tr data-id="${r.id}"${r.id === flashId ? ' class="flash"' : ''}>
      <td data-label="Date">${highlight(r.date, re)}</td>
      <td data-label="Description">${highlight(r.description, re)}</td>
      <td data-label="Category">${highlight(r.category, re)}</td>
      <td data-label="Amount" class="num">${highlight(r.amount.toFixed(2), re)}</td>
      <td data-label="Actions" class="row-actions">
        <button type="button" class="btn" data-action="edit" aria-label="Edit ${escapeAttr(r.description)}">Edit</button>
        <button type="button" class="btn danger" data-action="delete" aria-label="Delete ${escapeAttr(r.description)}">Delete</button>
      </td>
    </tr>`).join('');
  if (flashId) setTimeout(() => body.querySelector('.flash')?.classList.remove('flash'), 50);
}

const escapeAttr = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function setSearchError(message) {
  $('search-error').textContent = message;
  if (message) $('search').setAttribute('aria-invalid', 'true');
  else $('search').removeAttribute('aria-invalid');
}

export function fillForm(r) {
  $('rec-id').value = r.id;
  ['description', 'category', 'date'].forEach((f) => { $(f).value = r[f]; });
  $('amount').value = String(r.amount);
  $('description').focus();
}
