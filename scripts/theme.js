const KEY = 'app:theme';

function stored() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

function apply(theme, button) {
  document.documentElement.dataset.theme = theme;
  button.setAttribute('aria-pressed', String(theme === 'dark'));
}

export function initTheme(button) {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  apply(stored() || (prefersDark ? 'dark' : 'light'), button);
  button.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(next, button);
    try { localStorage.setItem(KEY, next); } catch { /* storage blocked: theme just won't persist */ }
  });
}
