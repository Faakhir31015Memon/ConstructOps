import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { LANGUAGE_CODES, DEFAULT_LANGUAGE } from '../config/languages.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'manager', 'accountant', 'contractor'],
      default: 'owner',
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: false,
    },
    status: {
      type: String,
      enum: ['active', 'banned', 'deactivated', 'pending_payment'],
      default: 'active',
    },
    language: {
      type: String,
      enum: LANGUAGE_CODES,
      default: DEFAULT_LANGUAGE,
    },
    // Bumped on password change so every already-issued access token stops working.
    tokenVersion: {
      type: Number,
      default: 0,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    // sha256 of the single-use password reset token, plus its 30-minute window.
    resetTokenHash: {
      type: String,
      default: null,
    },
    resetTokenExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Hash the password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password helper
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.index({ companyId: 1, role: 1 });

const User = mongoose.model('User', userSchema);
export default User;
