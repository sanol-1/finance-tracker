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
