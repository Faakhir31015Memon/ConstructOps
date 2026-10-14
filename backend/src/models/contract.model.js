import mongoose from 'mongoose';

const contractSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    contractorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    contractAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    terms: {
      type: String,
      trim: true,
      default: '',
    },
    milestones: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        dueDate: {
          type: Date,
        },
        status: {
          type: String,
          enum: ['pending', 'completed', 'paid'],
          default: 'pending',
        },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'completed', 'terminated'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

contractSchema.index({ projectId: 1, contractorId: 1 });
contractSchema.index({ companyId: 1, status: 1 });

const Contract = mongoose.model('Contract', contractSchema);
export default Contract;
