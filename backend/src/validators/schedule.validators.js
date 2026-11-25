import { z } from 'zod';
import { isRealDate, daysBetween } from '../utils/dates.js';

const date = (label) =>
  z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} is required` })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date')
    .refine(isRealDate, 'Choose a valid date');

export const leaveBodySchema = z
  .object({
    startDate: date('Start date'),
    endDate: date('End date'),
    type: z.enum(['leave', 'unavailable'], { message: 'Choose leave or unavailable' }).default('leave'),
    reason: z.string().trim().max(100, 'Reason is too long').default(''),
  })
  .superRefine((v, ctx) => {
    if (v.endDate < v.startDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'End date must be on or after the start date',
      });
    } else if (daysBetween(v.startDate, v.endDate) > 365) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'A leave can be at most 366 days' });
    }
  });