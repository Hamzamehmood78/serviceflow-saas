export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

// Kam az kam 8 characters, aik harf aur aik number
export const isStrongPassword = (value) =>
  value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);