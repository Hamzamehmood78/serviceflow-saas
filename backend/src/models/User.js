import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 100,
    },
    // select: false matlab queries mein hash khud nahi aata (safety)
    passwordHash: { type: String, required: true, select: false },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
        passwordChangedAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);