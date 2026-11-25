import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    category: { type: String, default: '', trim: true, maxlength: 50 },
    durationMinutes: { type: Number, required: true, min: 5, max: 480 },
    // Price paisay mein (Rs. 1,500 = 150000)
    priceMinor: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: 'Price must be a whole number of paisa' },
    },
    bufferBeforeMinutes: { type: Number, default: 0, min: 0, max: 120 },
    bufferAfterMinutes: { type: Number, default: 0, min: 0, max: 120 },
    bookableOnline: { type: Boolean, default: true },
    status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active' },
  },
  { timestamps: true }
);

serviceSchema.index({ businessId: 1, status: 1 });

// Aik business mein active/inactive services ke naam unique (bare chhote letters ka farq nahi).
// Archived services ka naam dobara use ho sakta hai.
serviceSchema.index(
  { businessId: 1, name: 1 },
  {
    unique: true,
    collation: { locale: 'en', strength: 2 },
    partialFilterExpression: { status: { $in: ['active', 'inactive'] } },
  }
);

export default mongoose.model('Service', serviceSchema);