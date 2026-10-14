# M1: Spec, Wireframes, A11y Plan

**Theme:** Student Finance Tracker

## Data model
```json
{
  "id": "txn_0001",
  "description": "Lunch at cafeteria",
  "amount": 12.50,
  "category": "Food",
  "date": "2025-09-29",
  "createdAt": "2025-09-29T10:00:00.000Z",
  "updatedAt": "2025-09-29T10:00:00.000Z"
}
```
Settings (stored separately under `app:settings`): `baseCurrency`, `rates` (two others), `cap`, `categories`.
Storage keys: `app:data`, `app:settings`.

## Wireframes (text sketches)

Mobile (360px): single column; records render as stacked cards.
```
[Header + nav (wraps)]
[Status line]
[About]
[Dashboard: 3 stats stacked, cap message, 7-day bars]
[Records: search, case toggle, sort, cards]
[Form: 1 column]
[Settings: stacked fieldsets]
```
Tablet (768px): stats in 3 columns, records become a table, form in 2 columns.
Desktop (1024px): 12-column grid. About (4 cols) beside Dashboard (8 cols); Records, Form, Settings full width, settings in 3 columns.

## Module plan
| File | Job |
|---|---|
| `storage.js` | load/save, JSON import validation, export |
| `state.js` | records array, settings, add/update/delete, sorting, stats |
| `validators.js` | regex rules, `compileRegex`, `escapeHtml`, `highlight` |
| `search.js` | live search, case toggle, filtering |
| `ui.js` | render table/cards, stats, trend, live messages, form errors |
| `main.js` | wires events together |

## Accessibility plan
- Landmarks: header, nav, main, section (each with a heading), footer; one `h1`.
- Skip link first in the tab order; `main` is focusable as the target.
- Every input has a bound `<label>`; errors linked with `aria-describedby` and `aria-invalid`.
- `role="status"` for save/import messages; cap message is `aria-live` polite when under the cap and assertive when over.
- Visible 3px focus ring on every interactive element; touch targets at least 44px tall.
- Colour contrast: body text 15:1, accent 7.9:1, warning 7.2:1 on white (all above WCAG AA 4.5:1).
- Motion: short transitions only, disabled under `prefers-reduced-motion`.
- Keyboard-only flow: Tab through nav, search, sort, table actions, form, settings. Enter submits the form; Esc cancels an inline edit.

## Regex plan (validation rules, min 4 + advanced)
| Field | Pattern |
|---|---|
| Description | `/^\S(?:.*\S)?$/` (no leading or trailing spaces) |
| Amount | `/^(0\|[1-9]\d*)(\.\d{1,2})?$/` |
| Date | `/^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$/` |
| Category | `/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/` |
| Advanced | `/\b(\w+)\s+\1\b/` back-reference to flag duplicate words in a description |
