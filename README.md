# Student Finance Tracker

An accessible, responsive finance tracker for students, built with plain HTML, CSS and JavaScript (no frameworks).

- **Theme:** Student Finance Tracker
- **Live site (GitHub Pages):** https://sanol-1.github.io/finance-tracker/
- **Demo video (unlisted):** ADD_LINK_HERE
- **Author:** sanol-1, l.mpakasano@alustudent.com

## Features

- **Records:** add, inline-edit (per row), and delete (with confirmation). Every record has a unique `id`, `createdAt` and `updatedAt`.
- **Regex validation:** 4 form rules plus an advanced back-reference rule, with clear inline errors.
- **Live regex search:** safe compile (try/catch), case-insensitive toggle, matches highlighted with `<mark>` (text is HTML-escaped first).
- **Sorting:** date, description (A to Z or Z to A) and amount (low to high or high to low).
- **Dashboard:** total records, total spent, top category, 7-day trend chart (CSS bars with an animated grow-in), converted totals in two other currencies.
- **Spending cap:** polite live message when under the cap, assertive alert when over.
- **Settings:** base currency + 2 others with manual rates, editable categories, cap.
- **Persistence:** auto-saves to `localStorage`; sample data (`seed.json`) loads only on the first visit.
- **Import / export JSON:** the file is validated before loading (all-or-nothing).
- **Stretch:** light/dark theme toggle (remembered).
- **Responsive:** mobile-first with breakpoints at about 360px (base), 768px and 1024px. Records are cards on phones and a table from 768px.

## Regex catalog

| Where | Pattern | Valid examples | Invalid examples |
|---|---|---|---|
| Description | `^\S(?:.*\S)?$` | `Lunch at cafeteria` | ` Lunch`, `Lunch `, empty |
| Amount | `^(0\|[1-9]\d*)(\.\d{1,2})?$` | `12.50`, `0`, `0.5` | `007`, `12.345`, `-5`, `12a` |
| Date | `^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$` (+ real calendar check) | `2025-09-29`, `2024-02-29` | `2025-02-29`, `2025-13-01`, `29/09/2025` |
| Category | `^[A-Za-z]+(?:[ -][A-Za-z]+)*$` | `Food`, `Study Material`, `Part-time` | `Food2`, `Food-`, `Study  Material` |
| **Advanced** (back-reference) | `\b(\w+)\s+\1\b` (flag `i`) | blocks `Bought the the book`, `Coffee coffee` | allows `Bus pass` |
| Currency code (settings) | `^[A-Z]{3}$` | `USD`, `RWF` | `usd`, `US` |
| Exchange rate (settings) | `^(0\|[1-9]\d*)(\.\d{1,6})?$` and greater than 0 | `0.92`, `1450` | `0`, `1.2.3` |
| Record id (import) | `^[A-Za-z]+_\d+$` | `txn_0001` | `abc`, `1` |

Double spaces inside a description are collapsed automatically (`/\s{2,}/g` becomes one space).

**Search examples** (typed into the search box; matched against description, category, amount and date):

| Pattern | Finds |
|---|---|
| `(coffee\|tea)` | beverage records, case-insensitive by default |
| `\.\d{2}\b` | amounts with cents |
| `\b(\w+)\s+\1\b` | descriptions with a repeated word |
| `^2025-10` | dates in October 2025 |
| `Food\|Books` | records in either category |
| `(` | invalid pattern: shows an error, does not crash |

## Keyboard map

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Move forward / backward through every control |
| `Enter` on "Skip to main content" (first Tab stop) | Jump past the navigation |
| `Enter` on a nav link | Go to that section |
| Arrow keys on the Sort menu | Change the sort order |
| `Enter` / `Space` on **Edit** | Edit the row in place; focus moves into the first field |
| `Enter` (inside an edit field) | Save the edit |
| `Esc` (inside an edit field) | Cancel the edit |
| `Enter` / `Space` on **Delete** | Ask for confirmation, then delete |
| `Enter` / `Space` on **Import JSON** | Open the file picker |
| `Enter` / `Space` on the theme button | Toggle light/dark |

Focus is managed on purpose: after saving or cancelling an edit it returns to that row's Edit button; after deleting it moves to the neighbouring row (or the search box if the list is empty); after adding a record it returns to the Description field.

## Accessibility notes

- Landmarks: `header`, `nav`, `main`, `section` (each with a heading), `footer`; a single `h1`.
- Skip-to-content link is the first focusable element.
- Every input has a bound `<label>`; errors are linked with `aria-describedby` and flagged with `aria-invalid`.
- Live regions: `role="status"` for confirmations, `role="alert"` for failures (invalid import, failed save), a polite region for "remaining under cap", and an assertive region for "over cap".
- Visible 3px focus ring on all interactive elements; touch targets at least 44px tall in forms.
- Colour contrast measured (WCAG AA needs 4.5:1 for text, 3:1 for the focus ring). Light theme: text 15.8:1, muted text 7.0:1, accent 7.8:1, warning 7.8:1, focus ring 4.6:1. Dark theme: text 13.3:1, muted 7.8:1, accent 8.2:1, warning 8.7:1, focus ring 10.8:1.
- The trend chart has a text summary (`aria-label`) listing each day's value.
- Animations are short and are switched off under `prefers-reduced-motion`.
- On phones, rows are laid out as cards using CSS; each value keeps a visible label.

## How to run

The app uses ES modules and `fetch`, so open it through a web server (not by double-clicking the file):

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

## How to run the tests

```bash
python3 -m http.server 8000
# then open http://localhost:8000/tests.html
```

`tests.html` runs the assertions in the browser (validators, back-reference rule, import/export validation, settings validation, stats, 7-day trend and cap logic) and prints PASS/FAIL for each, plus a summary line such as `69 passed, 0 failed`.

## Data model

```json
{
  "id": "txn_0001",
  "description": "Lunch at cafeteria",
  "amount": 12.5,
  "category": "Food",
  "date": "2025-09-25",
  "createdAt": "2025-09-25T08:00:00.000Z",
  "updatedAt": "2025-09-25T08:00:00.000Z"
}
```

Amounts are stored in the base currency. Storage keys: `app:data`, `app:settings`, `app:theme`.

**Export format:** `{ "version": 1, "exportedAt": "...", "settings": { ... }, "records": [ ... ] }`. Import also accepts a plain array of records (like `seed.json`).

## Project structure

```
index.html  tests.html  seed.json  README.md
styles/styles.css
scripts/  main.js (wiring)  state.js (data + settings)  storage.js (localStorage, export)
          validators.js (all regex rules)  search.js (safe regex, highlight)
          stats.js (totals, trend, cap)  ui.js (DOM rendering)  theme.js (light/dark)
docs/M1-spec.md
```

## Seed data

`seed.json` has 12 records including edge cases: a leap day (`2024-02-29`), a zero amount, a 0.50 amount, a 1,250,000 amount, HTML characters in a description (`<set>`), and a repeated word ("with with").
