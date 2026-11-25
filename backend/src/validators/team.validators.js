import { z } from 'zod';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const inviteSchema = z.object({
  name: z
    .string({ required_error: 'Name is required', invalid_type_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  email: z
    .string({ required_error: 'Email is required', invalid_type_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .max(100, 'Email is too long')
    .refine((v) => emailRegex.test(v), 'Enter a valid email address'),
  role: z.enum(['receptionist', 'staff'], { message: 'Choose receptionist or staff' }),
  staffId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid staff profile')
    .optional(),
});

export const acceptSchema = z.object({
  token: z
    .string({ required_error: 'Invalid invitation link', invalid_type_error: 'Invalid invitation link' })
    .min(20, 'Invalid invitation link')
    .max(200, 'Invalid invitation link'),
  password: z
    .string({ required_error: 'Password is required', invalid_type_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
});

export const memberStatusSchema = z.object({
  status: z.enum(['active', 'disabled'], { message: 'Choose active or disabled' }),
});