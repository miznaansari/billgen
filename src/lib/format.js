// Display helpers shared across pages.

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatINR(value) {
  const n = Number(value);
  if (!isFinite(n)) return '₹0';
  return inr.format(n);
}

/** "2025-10-16" / ISO string → "16 Oct 2025"; anything else returned as-is. */
export function formatDateHuman(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "2025-10-16" → "16/10/2025" (used on the PDF); non-ISO strings pass through unchanged. */
export function formatDateForPdf(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
  return value || '';
}

export function todayISO() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
