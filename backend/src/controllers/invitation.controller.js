import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Staff from '../models/Staff.js';
import BusinessMember from '../models/BusinessMember.js';
import Invitation from '../models/Invitation.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashToken } from '../utils/hash.js';

const INVALID = 'This invitation is invalid or has expired';

const validInvite = (token) => ({
  tokenHash: hashToken(token),
  status: 'pending',
  expiresAt: { $gt: new Date() },
});

export const getInvitation = asyncHandler(async (req, res) => {
  const invite = await Invitation.findOne(validInvite(req.params.token)).populate('businessId', 'name');
  if (!invite) throw new ApiError(404, INVALID);

  res.json({
    success: true,
    message: 'OK',
    data: {
      name: invite.name,
      email: invite.email,
      role: invite.role,
      businessName: invite.businessId.name,
    },
  });
});

export const acceptInvitation = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  // Pehle token dekho, taake ghalat token par mehnga bcrypt na chale
  if (!(await Invitation.exists(validInvite(token)))) throw new ApiError(400, INVALID);

  const passwordHash = await bcrypt.hash(password, 12);
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Invitation ko aik hi step mein "use ho gayi" mark karta hai (do dafa chal nahi sakti)
      const invite = await Invitation.findOneAndUpdate(
        validInvite(token),
        { status: 'accepted', acceptedAt: new Date() },
        { session }
      );
      if (!invite) throw new ApiError(400, INVALID);

      if (await User.exists({ email: invite.email }).session(session)) {
        throw new ApiError(409, 'An account with this email already exists');
      }

      const [user] = await User.create(
        [{ name: invite.name, email: invite.email, passwordHash }],
        { session }
      );
      await BusinessMember.create(
        [{ businessId: invite.businessId, userId: user._id, role: invite.role }],
        { session }
      );

      if (invite.staffId) {
        await Staff.updateOne(
          { _id: invite.staffId, businessId: invite.businessId, userId: null },
          { userId: user._id },
          { session }
        );
      }
    });
  } finally {
    await session.endSession();
  }

  res.json({ success: true, message: 'Account created. Please log in.', data: null });
});