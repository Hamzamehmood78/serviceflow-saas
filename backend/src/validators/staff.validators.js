import { z } from 'zod';
import { phone, email } from './business.validators.js';
import { STAFF_COLORS } from '../constants/staffColors.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid service');

const fields = {
  name: z
    .string({ required_error: 'Name is required', invalid_type_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  title: z.string().trim().max(100, 'Title is too long'),
  email,
  phone,
  color: z.enum(STAFF_COLORS, { message: 'Choose a valid colour' }),
  bookableOnline: z.boolean(),
  serviceIds: z.array(objectId).max(50, 'Too many services'),
};

export const createStaffSchema = z.object({
  name: fields.name,
  title: fields.title.default(''),
  email: fields.email.default(''),
  phone: fields.phone.default(''),
  color: fields.color.default('indigo'),
  bookableOnline: fields.bookableOnline.default(true),
  serviceIds: fields.serviceIds.default([]),
  status: z.enum(['active', 'inactive'], { message: 'Choose a valid status' }).default('active'),
});

// PATCH: sab optional. businessId, userId wagaira schema mein nahi, khud hat jate hain.
export const updateStaffSchema = z
  .object({
    ...fields,
    status: z.enum(['active', 'inactive', 'archived'], { message: 'Choose a valid status' }),
  })
  .partial();