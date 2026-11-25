import Staff from '../models/Staff.js';
import Service from '../models/Service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { escapeRegex, toInt } from '../utils/query.js';

const POPULATE = { path: 'serviceIds', select: 'name status' };

const serialize = (s) => ({
  id: s._id,
  name: s.name,
  title: s.title,
  email: s.email,
  phone: s.phone,
  color: s.color,
  bookableOnline: s.bookableOnline,
  status: s.status,
  hasLogin: !!s.userId,
  serviceIds: s.serviceIds.map((x) => x._id),
  services: s.serviceIds.map((x) => ({ id: x._id, name: x.name, status: x.status })),
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
});

// const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// const toInt = (value, fallback, min, max) => {
//   const n = Number.parseInt(typeof value === 'string' ? value : '', 10);
//   if (Number.isNaN(n)) return fallback;
//   return Math.min(Math.max(n, min), max);
// };

// Services apne business ki hon aur archived na hon
const checkServices = async (businessId, ids) => {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];

  const count = await Service.countDocuments({
    _id: { $in: unique },
    businessId,
    status: { $in: ['active', 'inactive'] },
  });
  if (count !== unique.length) {
    throw new ApiError(400, 'One or more services are invalid', {
      serviceIds: 'One or more selected services are invalid',
    });
  }
  return unique;
};

export const listStaff = asyncHandler(async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : 'current';
  const filter = { businessId: req.businessId }; // hamesha sirf apne business ka

  if (status === 'current') filter.status = { $in: ['active', 'inactive'] };
  else if (['active', 'inactive', 'archived'].includes(status)) filter.status = status;
  else if (status !== 'all') throw new ApiError(400, 'Invalid status filter');

  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: 'i' };
    filter.$or = [{ name: rx }, { title: rx }];
  }

  const page = toInt(req.query.page, 1, 1, 100000);
  const limit = toInt(req.query.limit, 20, 1, 100);

  const [items, total] = await Promise.all([
    Staff.find(filter)
      .sort({ name: 1 })
      .collation({ locale: 'en', strength: 2 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(POPULATE),
    Staff.countDocuments(filter),
  ]);

  res.json({
    success: true,
    message: 'OK',
    data: {
      items: items.map(serialize),
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    },
  });
});

export const getStaff = asyncHandler(async (req, res) => {
  const staff = await Staff.findOne({ _id: req.params.id, businessId: req.businessId }).populate(POPULATE);
  if (!staff) throw new ApiError(404, 'Staff member not found');
  res.json({ success: true, message: 'OK', data: serialize(staff) });
});

export const createStaff = asyncHandler(async (req, res) => {
  const serviceIds = await checkServices(req.businessId, req.body.serviceIds ?? []);

  // businessId aakhir mein, taake body se koi badal na sake
  const staff = await Staff.create({ ...req.body, serviceIds, businessId: req.businessId });
  await staff.populate(POPULATE);

  res.status(201).json({ success: true, message: 'Staff member created', data: serialize(staff) });
});

export const updateStaff = asyncHandler(async (req, res) => {
  if (Object.keys(req.body).length === 0) throw new ApiError(400, 'No changes provided');

  const update = { ...req.body };
  if (update.serviceIds) {
    update.serviceIds = await checkServices(req.businessId, update.serviceIds);
  }

  const staff = await Staff.findOneAndUpdate(
    { _id: req.params.id, businessId: req.businessId },
    { $set: update },
    { new: true, runValidators: true }
  ).populate(POPULATE);

  if (!staff) throw new ApiError(404, 'Staff member not found');
  res.json({ success: true, message: 'Staff member updated', data: serialize(staff) });
});

// Jaan boojh kar koi delete route nahi: staff bhi sirf archive hota hai