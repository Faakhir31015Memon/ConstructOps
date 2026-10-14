import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['budget', 'delay', 'material', 'worker'],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

alertSchema.index({ projectId: 1, isRead: 1, createdAt: -1 });

const Alert = mongoose.model('Alert', alertSchema);
export default Alert;
