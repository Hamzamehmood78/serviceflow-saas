import Business from '../models/Business.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// ownerId jaisi andar ki cheezein bahar nahi jati
export const serialize = (b) => ({
  id: b._id,
  name: b.name,
  slug: b.slug,
  category: b.category,
  description: b.description,
  phone: b.phone,
  email: b.email,
  address: b.address,
  logoUrl: b.logoUrl,
  timezone: b.timezone,
  currency: b.currency,
  onboardingCompleted: b.onboardingCompleted,
    openingHours: b.openingHours.map((d) => ({
    day: d.day,
    isOpen: d.isOpen,
    open: d.open,
    close: d.close,
    breaks: d.breaks.map((x) => ({ start: x.start, end: x.end })),
  })),
  closures: [...b.closures]
    .sort((a, c) => a.date.localeCompare(c.date))
    .map((c) => ({ id: c._id, date: c.date, reason: c.reason })),
    openingHours: b.openingHours.map((d) => ({
    day: d.day,
    isOpen: d.isOpen,
    open: d.open,
    close: d.close,
    breaks: d.breaks.map((x) => ({ start: x.start, end: x.end })),
  })),
  closures: [...b.closures]
    .sort((a, c) => a.date.localeCompare(c.date))
    .map((c) => ({ id: c._id, date: c.date, reason: c.reason })),
  settings: {
    onlineBookingEnabled: b.settings.onlineBookingEnabled,
    slotIntervalMinutes: b.settings.slotIntervalMinutes,
    minLeadTimeHours: b.settings.minLeadTimeHours,
    bookingHorizonDays: b.settings.bookingHorizonDays,
    freeCancellationHours: b.settings.freeCancellationHours,
    defaultDurationMinutes: b.settings.defaultDurationMinutes,
  },
});

export const getBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.businessId);
  if (!business) throw new ApiError(404, 'Business not found');
  res.json({ success: true, message: 'OK', data: serialize(business) });
});

export const updateBusiness = asyncHandler(async (req, res) => {
  const { settings, ...rest } = req.body;
  const update = { ...rest };

  // settings ke sirf bheje hue fields badlo, baqi waise hi rahen
  if (settings) {
    for (const [key, value] of Object.entries(settings)) {
      update[`settings.${key}`] = value;
    }
  }

  if (Object.keys(update).length === 0) {
    throw new ApiError(400, 'No changes provided');
  }

  let business;
  try {
    business = await Business.findOneAndUpdate(
      { _id: req.businessId }, // sirf apna business
      { $set: update },
      { new: true, runValidators: true }
    );
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.slug) {
      throw new ApiError(409, 'This booking link is already taken', {
        slug: 'This booking link is already taken',
      });
    }
    throw error;
  }

  if (!business) throw new ApiError(404, 'Business not found');
  res.json({ success: true, message: 'Settings saved', data: serialize(business) });
});