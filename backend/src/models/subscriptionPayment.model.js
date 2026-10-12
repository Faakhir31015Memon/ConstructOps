import mongoose from 'mongoose';

const subscriptionPaymentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    plan: {
      type: String,
      enum: ['1_month', '6_months', '12_months'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'PKR',
    },
    method: {
      type: String,
      enum: ['card', 'easypaisa', 'jazzcash', 'bank_transfer'],
      required: true,
    },
    transactionReference: {
      type: String,
      required: true,
      trim: true,
    },
    payerDetails: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewNote: {
      type: String,
      trim: true,
      default: '',
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const SubscriptionPayment = mongoose.model('SubscriptionPayment', subscriptionPaymentSchema);
export default SubscriptionPayment;
