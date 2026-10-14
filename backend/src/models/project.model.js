import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    budget: {
      type: Number,
      required: true,
      default: 0,
    },
    spent: {
      type: Number,
      required: true,
      default: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused'],
      default: 'active',
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    // Site-owner notifications (WhatsApp daily digest)
    notify: {
      dailyDigest: { type: Boolean, default: false },
      whatsappNumbers: {
        type: [String],
        default: [],
        validate: {
          validator: (value) => value.length <= 5,
          message: 'A maximum of 5 WhatsApp numbers can be notified per site',
        },
      },
      lastDigestAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ companyId: 1, status: 1 });
projectSchema.index({ companyId: 1, createdAt: -1 });

const Project = mongoose.model('Project', projectSchema);
export default Project;
