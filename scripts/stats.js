// stats.js: pure functions (no DOM) so they are easy to test.

export const round2 = (n) => Math.round(n * 100) / 100;

// Local calendar date as YYYY-MM-DD (toISOString would shift by timezone).
export function toISODate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function computeStats(records) {
  const byCategory = new Map();
  let sum = 0;
  records.forEach((r) => {
    sum += r.amount;
    byCategory.set(r.category, (byCategory.get(r.category) || 0) + r.amount);
  });
  const ranked = [...byCategory.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return {
    count: records.length,
    sum: round2(sum),
    top: ranked.length ? { category: ranked[0][0], total: round2(ranked[0][1]) } : null,
  };
}

// Spending per day for the 7 days ending on `today` (oldest first).
export function last7Days(records, today = new Date()) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    days.push({
      date: toISODate(d),
      label: d.toLocaleDateString('en', { weekday: 'short' }),
      total: 0,
    });
  }
  records.forEach((r) => {
    const day = days.find((x) => x.date === r.date);
    if (day) day.total = round2(day.total + r.amount);
  });
  return days;
}

// state: 'none' | 'under' | 'exact' | 'over'
export function capStatus(total, cap) {
  if (cap === null || cap === undefined || cap === '') return { state: 'none' };
  const diff = round2(Number(cap) - total);
  if (diff > 0) return { state: 'under', amount: diff };
  if (diff === 0) return { state: 'exact', amount: 0 };
  return { state: 'over', amount: round2(-diff) };
}
