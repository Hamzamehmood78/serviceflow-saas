import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import PasswordReset from '../models/PasswordReset.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendPasswordResetEmail } from '../utils/email.js';

const RESET_TTL_MS = 30 * 60 * 1000; // 30 minute

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (user && user.accountStatus === 'active') {
    try {
      await PasswordReset.deleteMany({ userId: user._id }); // purane links band

      const token = crypto.randomBytes(32).toString('hex');
      await PasswordReset.create({
        userId: user._id,
        tokenHash: hashToken(token), // database mein asli token nahi, sirf hash
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      });

      const link = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, link);
    } catch (error) {
      console.error('Forgot password error:', error.message);
    }
  }

  // Email registered ho ya na ho, jawab hamesha aik jaisa
  res.json({
    success: true,
    message: 'If an account with that email exists, a reset link has been sent.',
    data: null,
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const now = new Date();

  // Token ko aik hi step mein "use ho gaya" mark karta hai, taake do dafa chal na sake
  const record = await PasswordReset.findOneAndUpdate(
    { tokenHash: hashToken(token), usedAt: null, expiresAt: { $gt: now } },
    { usedAt: now }
  );

  if (!record) {
    throw new ApiError(400, 'This reset link is invalid or has expired');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.updateOne({ _id: record.userId }, { passwordHash, passwordChangedAt: now });
  await PasswordReset.deleteMany({ userId: record.userId });

  res.json({ success: true, message: 'Password updated. Please log in.', data: null });
});