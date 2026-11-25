import Service from '../models/Service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { escapeRegex, toInt } from '../utils/query.js';

const serialize = (s) => ({
  id: s._id,
  name: s.name,
  description: s.description,
  category: s.category,
  durationMinutes: s.durationMinutes,
  priceMinor: s.priceMinor,
  bufferBeforeMinutes: s.bufferBeforeMinutes,
  bufferAfterMinutes: s.bufferAfterMinutes,
  bookableOnline: s.bookableOnline,
  status: s.status,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
});

const duplicateName = () =>
  new ApiError(409, 'A service with this name already exists', {
    name: 'A service with this name already exists',
  });

// const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// const toInt = (value, fallback, min, max) => {
//   const n = Number.parseInt(typeof value === 'string' ? value : '', 10);
//   if (Number.isNaN(n)) return fallback;
//   return Math.min(Math.max(n, min), max);
// };

export const listServices = asyncHandler(async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : 'current';
  const filter = { businessId: req.businessId }; // hamesha sirf apne business ki

  if (status === 'current') filter.status = { $in: ['active', 'inactive'] };
  else if (['active', 'inactive', 'archived'].includes(status)) filter.status = status;
  else if (status !== 'all') throw new ApiError(400, 'Invalid status filter');

  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };

  const page = toInt(req.query.page, 1, 1, 100000);
  const limit = toInt(req.query.limit, 20, 1, 100);

  const [items, total] = await Promise.all([
    Service.find(filter)
      .sort({ name: 1 })
      .collation({ locale: 'en', strength: 2 })
      .skip((page - 1) * limit)
      .limit(limit),
    Service.countDocuments(filter),
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

export const getService = asyncHandler(async (req, res) => {
  const service = await Service.findOne({ _id: req.params.id, businessId: req.businessId });
  if (!service) throw new ApiError(404, 'Service not found');
  res.json({ success: true, message: 'OK', data: serialize(service) });
});

export const createService = asyncHandler(async (req, res) => {
  let service;
  try {
    // businessId aakhir mein, taake body se koi badal na sake
    service = await Service.create({ ...req.body, businessId: req.businessId });
  } catch (error) {
    if (error.code === 11000) throw duplicateName();
    throw error;
  }
  res.status(201).json({ success: true, message: 'Service created', data: serialize(service) });
});

export const updateService = asyncHandler(async (req, res) => {
  if (Object.keys(req.body).length === 0) throw new ApiError(400, 'No changes provided');

  let service;
  try {
    service = await Service.findOneAndUpdate(
      { _id: req.params.id, businessId: req.businessId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
  } catch (error) {
    if (error.code === 11000) throw duplicateName();
    throw error;
  }

  if (!service) throw new ApiError(404, 'Service not found');
  res.json({ success: true, message: 'Service updated', data: serialize(service) });
});

// Jaan boojh kar koi delete route nahi: services sirf archive hoti hain (Section 4.3)