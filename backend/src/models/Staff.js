import mongoose from 'mongoose';
import { STAFF_COLORS } from '../constants/staffColors.js';

const staffSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    title: { type: String, default: '', trim: true, maxlength: 100 },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 100 },
    phone: { type: String, default: '', trim: true, maxlength: 20 },
    color: { type: String, enum: STAFF_COLORS, default: 'indigo' },
    bookableOnline: { type: Boolean, default: true },
    serviceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    // Login wala account (Task 3.5 mein judega). Abhi khali rehta hai.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active' },
  },
  { timestamps: true }
);

staffSchema.index({ businessId: 1, status: 1 });

export default mongoose.model('Staff', staffSchema);