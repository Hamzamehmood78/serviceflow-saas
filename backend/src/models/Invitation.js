import mongoose from 'mongoose';

const invitationSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 100 },
    role: { type: String, enum: ['receptionist', 'staff'], required: true },
    // Role "staff" ho to optional: kaun sa staff profile is login se jure ga
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
    tokenHash: { type: String, required: true, unique: true }, // asli token kahin save nahi
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'revoked'], default: 'pending' },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    acceptedAt: { type: Date },
  },
  { timestamps: true }
);

// Aik business mein aik email par aik waqt mein sirf aik pending invitation
invitationSchema.index(
  { businessId: 1, email: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

export default mongoose.model('Invitation', invitationSchema);