import crypto from 'crypto';

// "Ali's Clinic" -> "ali-s-clinic-a1b2c3" (random suffix se slug unique rehta hai)
export const makeSlug = (text) => {
  const base =
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'business';
  return `${base}-${crypto.randomBytes(3).toString('hex')}`;
};