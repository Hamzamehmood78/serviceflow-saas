// Rupees ka text ("1500", "1500.50") -> paisa (integer). Ghalat ho to null.
export const toMinor = (text) => {
  const s = String(text).trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
};

// Paisa -> input mein dikhane ke liye rupees ka text
export const fromMinor = (minor) => {
  const rupees = minor / 100;
  return minor % 100 === 0 ? String(rupees) : rupees.toFixed(2);
};

// Paisa -> "Rs 1,500" (business ki currency ke hisaab se)
export const formatMoney = (minor, currency = 'PKR') =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);