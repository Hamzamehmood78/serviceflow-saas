import mongoose from 'mongoose';

// Business ke model jaisa hi din ka structure (breaks ke saath)
const breakSchema = new mongoose.Schema(
  { start: { type: String, required: true }, end: { type: String, required: true } },
  { _id: false }
);

const dayHoursSchema = new mongoose.Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday ... 6 = Saturday
    isOpen: { type: Boolean, default: false },
    open: { type: String, default: '09:00' },
    close: { type: String, default: '18:00' },
    breaks: { type: [breakSchema], default: [] },
  },
  { _id: false }
);

// Chhutti ya na-dastiyab muddat: tareekhein business ke timezone ki "YYYY-MM-DD"
const leaveSchema = new mongoose.Schema({
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  type: { type: String, enum: ['leave', 'unavailable'], default: 'leave' },
  reason: { type: String, default: '', maxlength: 100 },
});

const staffScheduleSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      unique: true, // aik staff ka aik hi schedule
    },
    // false matlab: business ke opening hours follow karo
    customHours: { type: Boolean, default: false },
    openingHours: { type: [dayHoursSchema], default: [] },
    leaves: { type: [leaveSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('StaffSchedule', staffScheduleSchema);