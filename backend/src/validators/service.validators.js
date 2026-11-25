import { z } from 'zod';

const whole = (min, max, label) =>
  z
    .number({ required_error: `${label} is required`, invalid_type_error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must be at most ${max}`);

const fields = {
  name: z
    .string({ required_error: 'Name is required', invalid_type_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  description: z.string().trim().max(500, 'Description is too long'),
  category: z.string().trim().max(50, 'Category is too long'),
  durationMinutes: whole(5, 480, 'Duration'),
  priceMinor: whole(0, 100000000, 'Price'),
  bufferBeforeMinutes: whole(0, 120, 'Buffer'),
  bufferAfterMinutes: whole(0, 120, 'Buffer'),
  bookableOnline: z.boolean(),
};

export const createServiceSchema = z.object({
  name: fields.name,
  durationMinutes: fields.durationMinutes,
  priceMinor: fields.priceMinor,
  description: fields.description.default(''),
  category: fields.category.default(''),
  bufferBeforeMinutes: fields.bufferBeforeMinutes.default(0),
  bufferAfterMinutes: fields.bufferAfterMinutes.default(0),
  bookableOnline: fields.bookableOnline.default(true),
  status: z.enum(['active', 'inactive'], { message: 'Choose a valid status' }).default('active'),
});

// PATCH: sab optional. businessId wagaira schema mein nahi, is liye khud hat jate hain.
export const updateServiceSchema = z
  .object({
    ...fields,
    status: z.enum(['active', 'inactive', 'archived'], { message: 'Choose a valid status' }),
  })
  .partial();