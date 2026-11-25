import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { isTokenStale } from '../utils/sessionGuard.js';

// Har protected route se pehle lagta hai: "ye request kis user ki hai?"
export const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.access_token;
  if (!token) throw new ApiError(401, 'Not authenticated');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, 'Session expired');
  }

  const user = await User.findById(payload.sub);
  if (!user || user.accountStatus !== 'active') {
    throw new ApiError(401, 'Not authenticated');
  }
  if (isTokenStale(payload, user)) throw new ApiError(401, 'Session expired');
  req.user = user;
  next();
});