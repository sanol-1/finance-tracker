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
