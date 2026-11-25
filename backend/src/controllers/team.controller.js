import User from '../models/User.js';
import Staff from '../models/Staff.js';
import Business from '../models/Business.js';
import BusinessMember from '../models/BusinessMember.js';
import Invitation from '../models/Invitation.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { newToken, hashToken } from '../utils/hash.js';
import { sendInvitationEmail } from '../utils/email.js';

const INVITE_TTL_MS = 48 * 60 * 60 * 1000; // 48 ghante

const serializeInvite = (i) => ({
  id: i._id,
  name: i.name,
  email: i.email,
  role: i.role,
  staffName: i.staffId?.name || null,
  expiresAt: i.expiresAt,
  expired: i.expiresAt <= new Date(),
  createdAt: i.createdAt,
});

const serializeMember = (m, currentUserId) => ({
  id: m._id,
  userId: m.userId._id,
  name: m.userId.name,
  email: m.userId.email,
  role: m.role,
  status: m.status,
  isYou: m.userId._id.toString() === currentUserId.toString(),
  joinedAt: m.createdAt,
});

const buildLink = (token) =>
  `${process.env.CLIENT_URL || 'http://localhost:5173'}/accept-invite?token=${token}`;

const notify = async (invite, business, link) => {
  try {
    await sendInvitationEmail({
      to: invite.email,
      name: invite.name,
      businessName: business.name,
      role: invite.role,
      link,
    });
  } catch (error) {
    console.error('Invitation email error:', error.message); // email fail ho to bhi link owner ke paas hai
  }
};

export const listTeam = asyncHandler(async (req, res) => {
  const [members, invites] = await Promise.all([
    BusinessMember.find({ businessId: req.businessId })
      .populate('userId', 'name email')
      .sort({ createdAt: 1 }),
    Invitation.find({ businessId: req.businessId, status: 'pending' })
      .populate('staffId', 'name')
      .sort({ createdAt: -1 }),
  ]);

  res.json({
    success: true,
    message: 'OK',
    data: {
      members: members.filter((m) => m.userId).map((m) => serializeMember(m, req.user._id)),
      invitations: invites.map(serializeInvite),
    },
  });
});

export const createInvitation = asyncHandler(async (req, res) => {
  const { name, email, role, staffId } = req.body;

  if (await User.exists({ email })) {
    throw new ApiError(409, 'This email already has a ServiceFlow account', {
      email: 'This email already has a ServiceFlow account',
    });
  }

  if (staffId) {
    if (role !== 'staff') {
      throw new ApiError(400, 'Only staff accounts can be linked to a staff profile', {
        staffId: 'Only staff accounts can be linked to a staff profile',
      });
    }
    const staff = await Staff.findOne({
      _id: staffId,
      businessId: req.businessId,
      status: { $in: ['active', 'inactive'] },
      userId: null,
    });
    if (!staff) {
      throw new ApiError(400, 'Choose a valid staff profile that has no login yet', {
        staffId: 'Choose a valid staff profile that has no login yet',
      });
    }
    const taken = await Invitation.exists({
      businessId: req.businessId,
      staffId,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });
    if (taken) {
      throw new ApiError(409, 'This staff profile already has a pending invitation', {
        staffId: 'This staff profile already has a pending invitation',
      });
    }
  }

  // Purani expire ho chuki pending invitation ko band karo, taake nayi ban sake
  await Invitation.updateMany(
    { businessId: req.businessId, email, status: 'pending', expiresAt: { $lte: new Date() } },
    { status: 'revoked' }
  );

  const token = newToken();
  let invite;
  try {
    invite = await Invitation.create({
      businessId: req.businessId,
      name,
      email,
      role,
      staffId: staffId || null,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      invitedBy: req.user._id,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, 'This email already has a pending invitation. Use Resend instead.', {
        email: 'This email already has a pending invitation. Use Resend instead.',
      });
    }
    throw error;
  }

  const business = await Business.findById(req.businessId);
  const link = buildLink(token);
  await notify(invite, business, link);
  await invite.populate('staffId', 'name');

  res.status(201).json({
    success: true,
    message: 'Invitation created',
    data: { invitation: serializeInvite(invite), inviteLink: link },
  });
});

export const resendInvitation = asyncHandler(async (req, res) => {
  const invite = await Invitation.findOne({
    _id: req.params.id,
    businessId: req.businessId, // sirf apne business ki
    status: 'pending',
  });
  if (!invite) throw new ApiError(404, 'Invitation not found');

  if (await User.exists({ email: invite.email })) {
    throw new ApiError(409, 'This email already has a ServiceFlow account');
  }

  const token = newToken();
  invite.tokenHash = hashToken(token); // purana link khud band
  invite.expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  await invite.save();

  const business = await Business.findById(req.businessId);
  const link = buildLink(token);
  await notify(invite, business, link);
  await invite.populate('staffId', 'name');

  res.json({
    success: true,
    message: 'Invitation resent',
    data: { invitation: serializeInvite(invite), inviteLink: link },
  });
});

export const revokeInvitation = asyncHandler(async (req, res) => {
  const invite = await Invitation.findOneAndUpdate(
    { _id: req.params.id, businessId: req.businessId, status: 'pending' },
    { status: 'revoked' }
  );
  if (!invite) throw new ApiError(404, 'Invitation not found');
  res.json({ success: true, message: 'Invitation revoked', data: null });
});

export const updateMemberStatus = asyncHandler(async (req, res) => {
  const member = await BusinessMember.findOne({
    _id: req.params.memberId,
    businessId: req.businessId,
  }).populate('userId', 'name email');
  if (!member || !member.userId) throw new ApiError(404, 'Team member not found');

  if (member.role === 'owner') throw new ApiError(400, 'The owner cannot be disabled');
  if (member.userId._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot change your own access');
  }

  member.status = req.body.status;
  await member.save();

  res.json({
    success: true,
    message: member.status === 'active' ? 'Access enabled' : 'Access disabled',
    data: serializeMember(member, req.user._id),
  });
});