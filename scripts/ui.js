// ui.js: DOM helpers. (Table rendering and stats are added in later milestones.)

const $ = (id) => document.getElementById(id);

// Announce a message in the global role="status" region.
// urgent=true uses the assertive role="alert" region (for failures).
export function announce(message, urgent = false) {
  const polite = $('status');
  const alert = $('alert');
  polite.textContent = '';
  alert.textContent = '';
  const el = urgent ? alert : polite;
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

export function renderRecords(list, re, flashId = null, editingId = null) {
  const body = $('records-body');
  $('empty-msg').hidden = list.length > 0;
  $('empty-msg').textContent = re
    ? 'No records match that pattern.'
    : 'No records yet. Add your first transaction in the form above.';
  body.innerHTML = list.map((r) => (r.id === editingId ? editRow(r) : viewRow(r, re, flashId))).join('');
  if (flashId) setTimeout(() => body.querySelector('.flash')?.classList.remove('flash'), 50);
}

function viewRow(r, re, flashId) {
  return `
    <tr data-id="${r.id}"${r.id === flashId ? ' class="flash"' : ''}>
      <td data-label="Date">${highlight(r.date, re)}</td>
      <td data-label="Description">${highlight(r.description, re)}</td>
      <td data-label="Category">${highlight(r.category, re)}</td>
      <td data-label="Amount" class="num">${highlight(r.amount.toFixed(2), re)}</td>
      <td data-label="Actions" class="row-actions">
        <button type="button" class="btn" data-action="edit" aria-label="Edit ${escapeAttr(r.description)}">Edit</button>
        <button type="button" class="btn danger" data-action="delete" aria-label="Delete ${escapeAttr(r.description)}">Delete</button>
      </td>
    </tr>`;
}

// Inline edit: Enter saves, Escape cancels (handled in main.js).
function editRow(r) {
  const v = escapeAttr;
  return `
    <tr data-id="${r.id}" class="editing">
      <td data-label="Date"><input class="cell" data-field="date" type="text" inputmode="numeric" aria-label="Date, YYYY-MM-DD" value="${v(r.date)}"></td>
      <td data-label="Description"><input class="cell" data-field="description" type="text" aria-label="Description" value="${v(r.description)}"></td>
      <td data-label="Category"><input class="cell" data-field="category" type="text" list="category-list" aria-label="Category" value="${v(r.category)}"></td>
      <td data-label="Amount" class="num"><input class="cell" data-field="amount" type="text" inputmode="decimal" aria-label="Amount" value="${v(r.amount)}"></td>
      <td data-label="Actions" class="row-actions">
        <button type="button" class="btn primary" data-action="save">Save</button>
        <button type="button" class="btn" data-action="cancel">Cancel</button>
      </td>
    </tr>`;
}

const escapeAttr = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function setSearchError(message) {
  $('search-error').textContent = message;
  if (message) $('search').setAttribute('aria-invalid', 'true');
  else $('search').removeAttribute('aria-invalid');
}


// ---------- M5: stats, trend chart, cap ----------
export function renderStats(stats, days, base = '') {
  $('stat-count').textContent = stats.count;
  $('stat-sum').textContent = `${stats.sum.toFixed(2)} ${base}`.trim();
  $('stat-top').textContent = stats.top ? `${stats.top.category} (${stats.top.total.toFixed(2)})` : 'None yet';

  const max = Math.max(...days.map((d) => d.total), 0);
  $('trend').setAttribute('aria-label',
    'Spending in the last 7 days: ' + days.map((d) => `${d.label} ${d.total.toFixed(2)}`).join(', '));
  $('trend').innerHTML = days.map((d) => `
    <div class="day">
      <span class="val">${d.total ? d.total.toFixed(0) : ''}</span>
      <div class="bar-area"><div class="bar" data-h="${max ? Math.max((d.total / max) * 100, d.total ? 4 : 0) : 0}" style="height:0"></div></div>
      <span class="lbl">${d.label}</span>
    </div>`).join('');
  // Next frame: set heights so the CSS transition animates the bars growing.
  requestAnimationFrame(() => document.querySelectorAll('#trend .bar')
    .forEach((b) => { b.style.height = b.dataset.h + '%'; }));
}

// Polite region when under the cap, assertive region when over. Only write on change.
function setText(id, text) { if ($(id).textContent !== text) $(id).textContent = text; }

export function renderCap(status, base = '') {
  const money = (n) => `${n.toFixed(2)} ${base}`.trim();
  let polite = '', assertive = '';
  if (status.state === 'none') polite = 'No spending cap set. You can set one in Settings.';
  else if (status.state === 'under') polite = `${money(status.amount)} remaining under your cap.`;
  else if (status.state === 'exact') polite = 'You have reached your cap exactly.';
  else assertive = `Over your cap by ${money(status.amount)}!`;
  setText('cap-message', polite);
  setText('cap-alert', assertive);
}

// ---------- M6: conversions ----------
export function renderConversions(items) {
  $('conv').textContent = items.length
    ? 'Total in other currencies: ' + items.map((i) => `${i.total.toFixed(2)} ${i.code}`).join(' \u00b7 ')
    : '';
}
