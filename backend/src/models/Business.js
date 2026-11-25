import mongoose from 'mongoose';

const breakSchema = new mongoose.Schema(
  {
    start: { type: String, required: true }, // "13:00"
    end: { type: String, required: true },
  },
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

// Holiday ya khaas band din: date business ke timezone ki "YYYY-MM-DD"
const closureSchema = new mongoose.Schema({
  date: { type: String, required: true },
  reason: { type: String, default: '', maxlength: 100 },
});

const defaultOpeningHours = () =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    isOpen: day !== 0, // Sunday band
    open: '09:00',
    close: '18:00',
    breaks: [],
  }));

const businessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: String, default: 'other', trim: true, maxlength: 50 },
    description: { type: String, default: '', maxlength: 1000 },
    phone: { type: String, default: '', trim: true, maxlength: 20 },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 100 },
    address: { type: String, default: '', trim: true, maxlength: 300 },
    logoUrl: { type: String, default: '' },
    timezone: { type: String, default: 'Asia/Karachi' },
    currency: { type: String, default: 'PKR' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    onboardingCompleted: { type: Boolean, default: false },
    openingHours: { type: [dayHoursSchema], default: defaultOpeningHours },
    closures: { type: [closureSchema], default: [] },
    settings: {
      onlineBookingEnabled: { type: Boolean, default: true },
      slotIntervalMinutes: { type: Number, default: 30 },
      minLeadTimeHours: { type: Number, default: 2 },
      bookingHorizonDays: { type: Number, default: 30 },
      freeCancellationHours: { type: Number, default: 4 },
      defaultDurationMinutes: { type: Number, default: 30 },
    },
  },
  { timestamps: true }
);

businessSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Business', businessSchema);