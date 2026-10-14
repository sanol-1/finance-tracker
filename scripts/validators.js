// validators.js: every regex rule lives here so tests.html and the form share it.

export const PATTERNS = {
  // No leading/trailing whitespace; at least one character.
  description: /^\S(?:.*\S)?$/,
  // 0 or a number without leading zeros, optional 1-2 decimals.
  amount: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
  // YYYY-MM-DD shape (real calendar check is done separately).
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  // Letters, with single spaces or hyphens between words.
  category: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/,
  // ADVANCED: back-reference catches a repeated word ("the the").
  duplicateWord: /\b(\w+)\s+\1\b/i,
};

// Collapse runs of spaces/tabs inside the text into one space.
export const collapseSpaces = (s) => s.replace(/\s{2,}/g, ' ');

// Returns the repeated word (e.g. "the") or null.
export function findDuplicateWord(s) {
  const m = PATTERNS.duplicateWord.exec(s);
  return m ? m[1] : null;
}

// Each validator returns an error string, or '' when valid.
export function validateDescription(value) {
  if (!PATTERNS.description.test(value)) {
    return value.trim() === ''
      ? 'Description is required.'
      : 'Remove spaces at the start or end of the description.';
  }
  const dup = findDuplicateWord(collapseSpaces(value));
  if (dup) return `The word "${dup}" is repeated. Please check the description.`;
  return '';
}

export function validateAmount(value) {
  return PATTERNS.amount.test(value)
    ? ''
    : 'Use a number like 12 or 12.50 (no leading zeros, max 2 decimals).';
}

export function isRealDate(value) {
  if (!PATTERNS.date.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function validateDate(value) {
  if (!PATTERNS.date.test(value)) return 'Use the format YYYY-MM-DD, for example 2025-09-29.';
  return isRealDate(value) ? '' : 'That date does not exist on the calendar.';
}

export function validateCategory(value) {
  return PATTERNS.category.test(value)
    ? ''
    : 'Use letters only, with single spaces or hyphens between words.';
}

// Validate a whole record; returns { field: message } for invalid fields only.
export function validateRecord({ description, amount, category, date }) {
  const errors = {
    description: validateDescription(description),
    amount: validateAmount(amount),
    category: validateCategory(category),
    date: validateDate(date),
  };
  return Object.fromEntries(Object.entries(errors).filter(([, msg]) => msg));
}

// ---------- M6: settings + import validation ----------
export const CURRENCY = /^[A-Z]{3}$/;
export const RATE = /^(0|[1-9]\d*)(\.\d{1,6})?$/;

export const validateCurrency = (v) =>
  CURRENCY.test(v) ? '' : 'Use a 3-letter code in capitals, for example USD.';
export const validateRate = (v) =>
  RATE.test(v) && Number(v) > 0 ? '' : 'Use a number greater than 0, for example 0.92.';

export function parseCategories(text) {
  return text.split(',').map((c) => collapseSpaces(c.trim())).filter(Boolean);
}

function categoriesError(list) {
  if (list.length === 0) return 'Add at least one category.';
  const bad = list.find((c) => !PATTERNS.category.test(c));
  if (bad) return `"${bad}" is not valid. Use letters, with single spaces or hyphens.`;
  const lower = list.map((c) => c.toLowerCase());
  if (new Set(lower).size !== lower.length) return 'Each category must be unique.';
  return '';
}

// values: { baseCurrency, cur2, rate2, cur3, rate3, categories }; returns { inputId: message }
export function validateSettingsForm(v) {
  const errors = {
    'base-currency': validateCurrency(v.baseCurrency),
    cur2: validateCurrency(v.cur2),
    rate2: validateRate(v.rate2),
    cur3: validateCurrency(v.cur3),
    rate3: validateRate(v.rate3),
    categories: categoriesError(parseCategories(v.categories)),
  };
  const codes = [v.baseCurrency, v.cur2, v.cur3];
  if (!errors.cur2 && codes.indexOf(v.cur2) !== codes.lastIndexOf(v.cur2)) errors.cur2 = 'Currencies must all be different.';
  if (!errors.cur3 && codes.indexOf(v.cur3) !== codes.lastIndexOf(v.cur3)) errors.cur3 = 'Currencies must all be different.';
  return Object.fromEntries(Object.entries(errors).filter(([, m]) => m));
}

export function validateSettingsObject(s) {
  const fail = (error) => ({ ok: false, error });
  if (!s || typeof s !== 'object') return fail('settings must be an object.');
  if (typeof s.baseCurrency !== 'string' || !CURRENCY.test(s.baseCurrency)) return fail('baseCurrency is invalid.');
  if (!Array.isArray(s.currencies) || s.currencies.length !== 2) return fail('currencies must list exactly 2 currencies.');
  for (const c of s.currencies) {
    if (!c || typeof c.code !== 'string' || !CURRENCY.test(c.code)) return fail('a currency code is invalid.');
    if (typeof c.rate !== 'number' || !Number.isFinite(c.rate) || c.rate <= 0) return fail('a currency rate is invalid.');
  }
  const codes = [s.baseCurrency, ...s.currencies.map((c) => c.code)];
  if (new Set(codes).size !== 3) return fail('currencies must all be different.');
  if (!Array.isArray(s.categories) || s.categories.some((c) => typeof c !== 'string')) return fail('categories must be a list of text.');
  const catErr = categoriesError(s.categories);
  if (catErr) return fail(catErr);
  if (s.cap !== null && s.cap !== undefined && (typeof s.cap !== 'number' || !Number.isFinite(s.cap) || s.cap < 0)) return fail('cap is invalid.');
  return {
    ok: true,
    settings: {
      baseCurrency: s.baseCurrency,
      currencies: s.currencies.map((c) => ({ code: c.code, rate: c.rate })),
      categories: [...s.categories],
      cap: s.cap ?? null,
    },
  };
}

// Returns an error string for one record, or '' when it is well-formed.
export function validateRecordShape(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return 'is not an object';
  if (typeof r.id !== 'string' || !/^[A-Za-z]+_\d+$/.test(r.id)) return 'has an invalid id';
  if (typeof r.description !== 'string' || !PATTERNS.description.test(r.description)) return 'has an invalid description';
  if (typeof r.amount !== 'number' || !Number.isFinite(r.amount) || r.amount < 0) return 'has an invalid amount';
  if (Math.abs(r.amount * 100 - Math.round(r.amount * 100)) > 1e-6) return 'has more than 2 decimal places';
  if (typeof r.category !== 'string' || !PATTERNS.category.test(r.category)) return 'has an invalid category';
  if (typeof r.date !== 'string' || !isRealDate(r.date)) return 'has an invalid date';
  for (const k of ['createdAt', 'updatedAt']) {
    if (typeof r[k] !== 'string' || Number.isNaN(Date.parse(r[k]))) return `has an invalid ${k}`;
  }
  return '';
}

// Accepts a bare array of records or { records, settings }. All-or-nothing.
export function validateImportData(data) {
  let list = data;
  let settings = null;
  if (data && !Array.isArray(data) && typeof data === 'object') {
    list = data.records;
    if (data.settings !== undefined && data.settings !== null) {
      const s = validateSettingsObject(data.settings);
      if (!s.ok) return { ok: false, error: `Settings: ${s.error}` };
      settings = s.settings;
    }
  }
  if (!Array.isArray(list)) return { ok: false, error: 'The file must contain a list of records.' };
  const ids = new Set();
  for (let i = 0; i < list.length; i++) {
    const err = validateRecordShape(list[i]);
    if (err) return { ok: false, error: `Record ${i + 1} ${err}.` };
    if (ids.has(list[i].id)) return { ok: false, error: `Record ${i + 1} repeats the id "${list[i].id}".` };
    ids.add(list[i].id);
  }
  const records = list.map(({ id, description, amount, category, date, createdAt, updatedAt }) =>
    ({ id, description, amount, category, date, createdAt, updatedAt }));
  return { ok: true, records, settings };
}
