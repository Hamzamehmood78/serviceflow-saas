// Search text ko regex mein dalne se pehle safe karta hai
export const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Query ka number (page, limit) safe tareeqe se: ghalat ho to fallback, hadd ke andar
export const toInt = (value, fallback, min, max) => {
  const n = Number.parseInt(typeof value === 'string' ? value : '', 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
};