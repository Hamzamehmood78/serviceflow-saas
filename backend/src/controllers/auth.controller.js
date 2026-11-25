import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Business from '../models/Business.js';
import BusinessMember from '../models/BusinessMember.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isTokenStale } from '../utils/sessionGuard.js';
import { makeSlug } from '../utils/slug.js';
import { setAuthCookies, clearAuthCookies, verifyRefreshToken } from '../utils/tokens.js';

// Ghalat email par bhi bcrypt chalta hai, taake jawab ka waqt aik jaisa rahe
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 12);

// User + uska active business + role (login aur /me dono use karte hain)
const getSession = async (user) => {
  const membership = await BusinessMember.findOne({
    userId: user._id,
    status: 'active',
  }).populate('businessId');

  if (!membership || !membership.businessId) {
    throw new ApiError(403, 'No active business found for this account');
  }

  const b = membership.businessId;
  return {
    user: { id: user._id, name: user.name, email: user.email },
    business: {
      id: b._id,
      name: b.name,
      slug: b.slug,
      timezone: b.timezone,
      currency: b.currency,
      onboardingCompleted: b.onboardingCompleted,
    },
    role: membership.role,
  };
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists', {
      email: 'This email is already registered',
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const session = await mongoose.startSession();
  let user;
  let business;

  try {
    await session.withTransaction(async () => {
      [user] = await User.create([{ name, email, passwordHash }], { session });

      [business] = await Business.create(
        [
          {
            name: `${name}'s Business`,
            slug: makeSlug(`${name} business`),
            ownerId: user._id,
          },
        ],
        { session }
      );

      await BusinessMember.create(
        [{ businessId: business._id, userId: user._id, role: 'owner' }],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  // setAuthCookies(res, user._id); // register ke baad user khud login ho jata hai

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: {
      user: { id: user._id, name: user.name, email: user.email },
      business: { id: business._id, name: business.name, slug: business.slug },
      role: 'owner',
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  const passwordOk = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

  if (!user || !passwordOk) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (user.accountStatus !== 'active') {
    throw new ApiError(403, 'This account is suspended');
  }

  const data = await getSession(user);
  setAuthCookies(res, user._id);

  res.json({ success: true, message: 'Logged in successfully', data });
});

export const me = asyncHandler(async (req, res) => {
  const data = await getSession(req.user);
  res.json({ success: true, message: 'OK', data });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) throw new ApiError(401, 'Not authenticated');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    clearAuthCookies(res);
    throw new ApiError(401, 'Session expired. Please log in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user || user.accountStatus !== 'active') {
    clearAuthCookies(res);
    throw new ApiError(401, 'Not authenticated');
  }
  if (isTokenStale(payload, user)) {
    clearAuthCookies(res);
    throw new ApiError(401, 'Session expired. Please log in again.');
  }
  setAuthCookies(res, user._id);
  res.json({ success: true, message: 'Session refreshed', data: null });
});

export const logout = asyncHandler(async (req, res) => {
  clearAuthCookies(res);
  res.json({ success: true, message: 'Logged out', data: null });
});