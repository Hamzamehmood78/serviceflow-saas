import mongoose from 'mongoose';

// Ye collection batati hai: kaun sa user, kis business mein, kis role mein hai.
// Isi se tenant isolation aur RBAC chalay ge.
const businessMemberSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'receptionist', 'staff'], required: true },
    status: { type: String, enum: ['active', 'invited', 'disabled'], default: 'active' },
  },
  { timestamps: true }
);

// Aik user aik business mein sirf aik dafa
businessMemberSchema.index({ businessId: 1, userId: 1 }, { unique: true });
businessMemberSchema.index({ userId: 1 });

export default mongoose.model('BusinessMember', businessMemberSchema);