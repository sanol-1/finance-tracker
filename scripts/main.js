import {
  validateDescription, validateAmount, validateCategory, validateDate,
  validateRecord, collapseSpaces,
} from './validators.js';
import { announce, showFieldError, clearErrors, fillCategories } from './ui.js';

const DEFAULT_CATEGORIES = ['Food', 'Books', 'Transport', 'Entertainment', 'Fees', 'Other'];
const FIELDS = ['description', 'amount', 'category', 'date'];
const checkers = {
  description: validateDescription,
  amount: validateAmount,
  category: validateCategory,
  date: validateDate,
};

const form = document.getElementById('record-form');
const input = (name) => document.getElementById(name);

fillCategories(DEFAULT_CATEGORIES);

// Validate a single field when the user leaves it.
FIELDS.forEach((name) => {
  input(name).addEventListener('blur', () => {
    const el = input(name);
    if (name === 'description') el.value = collapseSpaces(el.value); // collapse doubles
    if (el.value === '') return; // required errors show on submit
    showFieldError(name, checkers[name](el.value));
  });
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const values = Object.fromEntries(FIELDS.map((f) => [f, input(f).value]));
  values.description = collapseSpaces(values.description);
  input('description').value = values.description;

  const errors = validateRecord(values);
  FIELDS.forEach((f) => showFieldError(f, errors[f] || ''));

  const firstBad = FIELDS.find((f) => errors[f]);
  if (firstBad) {
    input(firstBad).focus(); // keyboard users land on the first problem
    announce(`Please fix ${Object.keys(errors).length} field(s) before saving.`);
    return;
  }
  announce('All fields are valid. Saving is added in the next milestone.');
});

form.addEventListener('reset', () => clearErrors(FIELDS));
