import { ApiError } from '../utils/ApiError.js';

// Istemal: requireRole('owner', 'receptionist')
export const requireRole =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.role || !allowedRoles.includes(req.role)) {
      return next(new ApiError(403, 'You do not have permission to do this'));
    }
    next();
  };