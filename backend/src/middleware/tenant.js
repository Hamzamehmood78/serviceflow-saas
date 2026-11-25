import BusinessMember from '../models/BusinessMember.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// authenticate ke baad lagta hai. Batata hai ke user kis business ka (active) member hai.
// MVP: aik user = aik business. Aage multi-business ke liye yahin tabdeeli hogi.
export const loadTenant = asyncHandler(async (req, res, next) => {
  const membership = await BusinessMember.findOne({
    userId: req.user._id,
    status: 'active',
  }).sort({ createdAt: 1 });

  if (!membership) {
    throw new ApiError(403, 'No active business membership');
  }

  req.membership = membership;
  req.businessId = membership.businessId; // controllers sirf yehi use karen
  req.role = membership.role;
  next();
});