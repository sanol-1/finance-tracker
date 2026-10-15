export function compileRegex(input, ignoreCase = true) {
  if (!input) return { re: null, error: '' };
  try {
    return { re: new RegExp(input, ignoreCase ? 'gi' : 'g'), error: '' };
  } catch (e) {
    return { re: null, error: 'Invalid pattern: ' + e.message.replace(/^Invalid regular expression: /, '') };
  }
}

export const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
export function highlight(text, re) {
  const s = String(text);
  if (!re) return escapeHtml(s);
  let out = '', last = 0, m;
  re.lastIndex = 0;
  while ((m = re.exec(s)) !== null) {
    if (m[0] === '') { re.lastIndex++; continue; } 
    out += escapeHtml(s.slice(last, m.index)) + '<mark>' + escapeHtml(m[0]) + '</mark>';
    last = m.index + m[0].length;
  }
  return out + escapeHtml(s.slice(last));
}

export function filterRecords(list, re) {
  if (!re) return list;
  return list.filter((r) => {
    const hay = [r.description, r.category, r.amount.toFixed(2), r.date];
    return hay.some((v) => { re.lastIndex = 0; return re.test(v); });
  });
}
