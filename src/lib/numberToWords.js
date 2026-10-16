// Convert numbers to words using the Indian numbering system (Crore / Lakh / Thousand).

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/** Integer → words (no "only" suffix). Returns 'Zero' for 0. */
export function numberToWords(num) {
  num = Math.floor(Math.abs(Number(num) || 0));
  if (num === 0) return 'Zero';
  if (num.toString().length > 9) return 'Overflow';

  const n = ('000000000' + num).substr(-9).match(/(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})/);
  if (!n) return '';

  const pair = (chunk) => ones[Number(chunk)] || tens[chunk[0]] + ' ' + ones[chunk[1]];

  let str = '';
  str += Number(n[1]) !== 0 ? pair(n[1]) + ' Crore ' : '';
  str += Number(n[2]) !== 0 ? pair(n[2]) + ' Lakh ' : '';
  str += Number(n[3]) !== 0 ? pair(n[3]) + ' Thousand ' : '';
  str += Number(n[4]) !== 0 ? pair(n[4]) + ' Hundred ' : '';
  str += Number(n[5]) !== 0 ? (str !== '' ? 'and ' : '') + pair(n[5]) + ' ' : '';

  return str.trim();
}

/** Total (number) → "… and NN/100 only" sentence used on the invoice. */
export function amountInWords(total) {
  const value = Number(total) || 0;
  const intPart = Math.floor(value);
  const decimals = Math.round((value - intPart) * 100);
  return numberToWords(intPart) + (decimals ? ` and ${decimals}/100` : '') + ' only';
}
