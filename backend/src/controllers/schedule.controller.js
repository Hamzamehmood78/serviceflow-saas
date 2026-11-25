import Staff from '../models/Staff.js';
import Business from '../models/Business.js';
import StaffSchedule from '../models/StaffSchedule.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { todayIn } from '../utils/dates.js';

const MAX_LEAVES = 100;

// Staff isi business ka hona chahiye, warna 404
const loadStaff = async (req) => {
  const staff = await Staff.findOne({ _id: req.params.id, businessId: req.businessId });
  if (!staff) throw new ApiError(404, 'Staff member not found');
  return staff;
};

const dayOut = (d) => ({
  day: d.day,
  isOpen: d.isOpen,
  open: d.open,
  close: d.close,
  breaks: d.breaks.map((b) => ({ start: b.start, end: b.end })),
});

const serialize = (doc, business) => {
  const custom = !!doc && doc.customHours && doc.openingHours.length === 7;
  const hours = custom ? doc.openingHours : business.openingHours;

  return {
    customHours: custom,
    openingHours: [...hours].sort((a, b) => a.day - b.day).map(dayOut),
    leaves: [...(doc?.leaves ?? [])]
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .map((l) => ({ id: l._id, startDate: l.startDate, endDate: l.endDate, type: l.type, reason: l.reason })),
    timezone: business.timezone,
  };
};

// Schedule na ho to bana do. Do requests aik saath aayen to dobara koshish.
const upsertSchedule = async (staffId, businessId, update) => {
  const run = () =>
    StaffSchedule.findOneAndUpdate({ staffId, businessId }, update, {
      new: true,
      upsert: true,
      runValidators: true,
    });
  try {
    return await run();
  } catch (error) {
    if (error.code === 11000) return run();
    throw error;
  }
};

export const getSchedule = asyncHandler(async (req, res) => {
  const staff = await loadStaff(req);
  const [doc, business] = await Promise.all([
    StaffSchedule.findOne({ staffId: staff._id, businessId: req.businessId }),
    Business.findById(req.businessId),
  ]);
  res.json({ success: true, message: 'OK', data: serialize(doc, business) });
});

export const saveHours = asyncHandler(async (req, res) => {
  const staff = await loadStaff(req);

  const normalized = [...req.body.openingHours]
    .sort((a, b) => a.day - b.day)
    .map((d) => ({
      day: d.day,
      isOpen: d.isOpen,
      open: d.open,
      close: d.close,
      breaks: d.isOpen ? d.breaks : [], // band din ke breaks nahi
    }));

  const doc = await upsertSchedule(staff._id, req.businessId, {
    $set: { customHours: true, openingHours: normalized },
  });
  const business = await Business.findById(req.businessId);
  res.json({ success: true, message: 'Working hours saved', data: serialize(doc, business) });
});

export const resetHours = asyncHandler(async (req, res) => {
  const staff = await loadStaff(req);
  const doc = await StaffSchedule.findOneAndUpdate(
    { staffId: staff._id, businessId: req.businessId },
    { $set: { customHours: false, openingHours: [] } }, // leaves waise hi rehti hain
    { new: true }
  );
  const business = await Business.findById(req.businessId);
  res.json({ success: true, message: 'Now following business hours', data: serialize(doc, business) });
});

export const addLeave = asyncHandler(async (req, res) => {
  const staff = await loadStaff(req);
  const { startDate, endDate, type, reason } = req.body;

  const [existing, business] = await Promise.all([
    StaffSchedule.findOne({ staffId: staff._id, businessId: req.businessId }),
    Business.findById(req.businessId),
  ]);

  if (endDate < todayIn(business.timezone)) {
    throw new ApiError(400, 'Choose dates from today onwards', {
      endDate: 'Choose dates from today onwards',
    });
  }

  const leaves = existing?.leaves ?? [];
  if (leaves.length >= MAX_LEAVES) {
    throw new ApiError(400, `You can add at most ${MAX_LEAVES} leave periods`);
  }
  if (leaves.some((l) => startDate <= l.endDate && endDate >= l.startDate)) {
    throw new ApiError(409, 'These dates overlap another leave period', {
      startDate: 'These dates overlap another leave period',
    });
  }

  const doc = await upsertSchedule(staff._id, req.businessId, {
    $push: { leaves: { startDate, endDate, type, reason } },
  });
  const added = doc.leaves[doc.leaves.length - 1];

  res.status(201).json({
    success: true,
    message: 'Leave added',
    data: { id: added._id, startDate, endDate, type, reason },
  });
});

export const removeLeave = asyncHandler(async (req, res) => {
  const staff = await loadStaff(req);
  const result = await StaffSchedule.updateOne(
    { staffId: staff._id, businessId: req.businessId, 'leaves._id': req.params.leaveId },
    { $pull: { leaves: { _id: req.params.leaveId } } }
  );
  if (result.matchedCount === 0) throw new ApiError(404, 'Leave not found');
  res.json({ success: true, message: 'Leave removed', data: null });
});