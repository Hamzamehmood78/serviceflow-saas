import Business from '../models/Business.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { todayIn } from '../utils/dates.js';
import { serialize } from './business.controller.js';

const MAX_CLOSURES = 200;

export const updateOpeningHours = asyncHandler(async (req, res) => {
  const normalized = [...req.body.openingHours]
    .sort((a, b) => a.day - b.day)
    .map((d) => ({
      day: d.day,
      isOpen: d.isOpen,
      open: d.open,
      close: d.close,
      breaks: d.isOpen ? d.breaks : [], // band din ke breaks nahi
    }));

  const business = await Business.findOneAndUpdate(
    { _id: req.businessId },
    { $set: { openingHours: normalized } },
    { new: true, runValidators: true }
  );
  if (!business) throw new ApiError(404, 'Business not found');

  res.json({
    success: true,
    message: 'Opening hours saved',
    data: { openingHours: serialize(business).openingHours },
  });
});

export const addClosure = asyncHandler(async (req, res) => {
  const { date, reason } = req.body;

  const business = await Business.findById(req.businessId);
  if (!business) throw new ApiError(404, 'Business not found');

  if (date < todayIn(business.timezone)) {
    throw new ApiError(400, 'Choose today or a future date', { date: 'Choose today or a future date' });
  }
  if (business.closures.length >= MAX_CLOSURES) {
    throw new ApiError(400, `You can add at most ${MAX_CLOSURES} closures`);
  }

  const duplicate = () =>
    new ApiError(409, 'This date is already marked closed', {
      date: 'This date is already marked closed',
    });

  if (business.closures.some((c) => c.date === date)) throw duplicate();

  // $ne wala shart: do log aik saath add karen to bhi aik hi date do dafa nahi jati
  const updated = await Business.findOneAndUpdate(
    { _id: req.businessId, 'closures.date': { $ne: date } },
    { $push: { closures: { date, reason } } },
    { new: true }
  );
  if (!updated) throw duplicate();

  const added = updated.closures.find((c) => c.date === date);
  res.status(201).json({
    success: true,
    message: 'Closure added',
    data: { id: added._id, date: added.date, reason: added.reason },
  });
});

export const removeClosure = asyncHandler(async (req, res) => {
  const result = await Business.updateOne(
    { _id: req.businessId, 'closures._id': req.params.closureId }, // sirf apne business ki
    { $pull: { closures: { _id: req.params.closureId } } }
  );
  if (result.matchedCount === 0) throw new ApiError(404, 'Closure not found');
  res.json({ success: true, message: 'Closure removed', data: null });
});

export const completeOnboarding = asyncHandler(async (req, res) => {
  const business = await Business.findOneAndUpdate(
    { _id: req.businessId },
    { $set: { onboardingCompleted: true } },
    { new: true }
  );
  if (!business) throw new ApiError(404, 'Business not found');
  res.json({ success: true, message: 'Setup completed', data: serialize(business) });
});