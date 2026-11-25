import { ApiError } from '../utils/ApiError.js';

// Request ka body schema se check karta hai. Ghalat ho to 400 error deta hai.
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errors = {};
    for (const issue of result.error.issues) {
            const field = issue.path.join('.') || 'form';
      if (!errors[field]) errors[field] = issue.message;
    }
    return next(new ApiError(400, 'Validation failed', errors));
  }

  req.body = result.data; // saaf shuda (trim, lowercase) data
  next();
};