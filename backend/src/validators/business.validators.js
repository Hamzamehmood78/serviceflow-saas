import { z } from 'zod';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidTimezone = (tz) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const CATEGORIES = [
  'clinic',
  'dental',
  'salon',
  'barbershop',
  'spa',
  'workshop',
  'studio',
  'tutor',
  'training',
  'consultant',
  'other',
];
export const CURRENCIES = ['PKR', 'USD', 'GBP', 'EUR', 'AED', 'SAR'];

// Khali ho sakta hai. 0300 1234567 ya 03001234567 -> 0300-1234567
export const phone = z
  .string()
  .trim()
  .max(20, 'Phone is too long')
  .transform((v) => v.replace(/[\s()]/g, ''))
  .refine((v) => v === '' || /^\+?[0-9-]{7,15}$/.test(v), 'Enter a valid phone number')
  .transform((v) => {
    const digits = v.replace(/-/g, '');
    return /^03\d{9}$/.test(digits) ? `${digits.slice(0, 4)}-${digits.slice(4)}` : v;
  });

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(100, 'Email is too long')
  .refine((v) => v === '' || emailRegex.test(v), 'Enter a valid email address');

const settingsSchema = z
  .object({
    onlineBookingEnabled: z.boolean(),
    slotIntervalMinutes: z
      .number()
      .int()
      .refine((v) => [10, 15, 20, 30, 45, 60].includes(v), 'Choose a valid slot interval'),
    minLeadTimeHours: z.number().int().min(0, 'Must be 0 or more').max(168, 'Must be at most 168'),
    bookingHorizonDays: z.number().int().min(1, 'Must be at least 1').max(365, 'Must be at most 365'),
    freeCancellationHours: z.number().int().min(0, 'Must be 0 or more').max(720, 'Must be at most 720'),
    defaultDurationMinutes: z.number().int().min(5, 'Must be at least 5').max(480, 'Must be at most 480'),
  })
  .partial();

// Sab fields optional (PATCH). Schema mein jo nahi, wo khud hat jata hai (ownerId wagaira).
export const updateBusinessSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, 'Use at least 3 characters')
      .max(40, 'Use at most 40 characters')
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use only letters, numbers and single hyphens'),
    category: z.enum(CATEGORIES, { message: 'Choose a valid category' }),
    description: z.string().trim().max(1000, 'Description is too long'),
    phone,
    email,
    address: z.string().trim().max(300, 'Address is too long'),
    timezone: z.string().trim().refine(isValidTimezone, 'Choose a valid timezone'),
    currency: z.enum(CURRENCIES, { message: 'Choose a valid currency' }),
    settings: settingsSchema,
  })
  .partial();
  // ---------- Opening hours ----------
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const time = z.string().regex(timeRegex, 'Use HH:MM (24-hour)');
const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

const dayHoursSchema = z.object({
  day: z.number().int().min(0).max(6),
  isOpen: z.boolean(),
  open: time,
  close: time,
  breaks: z.array(z.object({ start: time, end: time })).max(3, 'At most 3 breaks per day'),
});

export const openingHoursSchema = z
  .object({
    openingHours: z.array(dayHoursSchema).length(7, 'Provide all 7 days'),
  })
  .superRefine((val, ctx) => {
    const seen = new Set();

    val.openingHours.forEach((d, i) => {
      if (seen.has(d.day)) {
        ctx.addIssue({ code: 'custom', path: ['openingHours', i, 'day'], message: 'Duplicate day' });
      }
      seen.add(d.day);
      if (!d.isOpen) return;

      const open = toMin(d.open);
      const close = toMin(d.close);
      if (close <= open) {
        ctx.addIssue({
          code: 'custom',
          path: ['openingHours', i, 'close'],
          message: 'Closing time must be after opening time',
        });
        return;
      }

      const sorted = d.breaks
        .map((b, idx) => ({ ...b, idx }))
        .sort((a, b) => toMin(a.start) - toMin(b.start));

      let prevEnd = open;
      for (const b of sorted) {
        const s = toMin(b.start);
        const e = toMin(b.end);
        const path = ['openingHours', i, 'breaks', b.idx, 'end'];
        if (e <= s) {
          ctx.addIssue({ code: 'custom', path, message: 'Break must end after it starts' });
        } else if (s < prevEnd) {
          ctx.addIssue({
            code: 'custom',
            path,
            message: 'Break overlaps another break or starts before opening',
          });
        } else if (e > close) {
          ctx.addIssue({ code: 'custom', path, message: 'Break must end before closing time' });
        } else {
          prevEnd = e;
        }
      }
    });
  });

// ---------- Closures (holidays) ----------
const isRealDate = (v) => {
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

export const closureBodySchema = z.object({
  date: z
    .string({ required_error: 'Choose a date', invalid_type_error: 'Choose a date' })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date')
    .refine(isRealDate, 'Choose a valid date'),
  reason: z.string().trim().max(100, 'Reason is too long').default(''),
});