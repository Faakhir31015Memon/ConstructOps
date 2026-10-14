import mongoose from 'mongoose';

const auditEventSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    actorId: { type: String, index: true },
    actorName: { type: String, default: '' },
    actorRole: { type: String, default: '' },
    // e.g. "workers:create", "projects:delete", "expenses:review"
    action: { type: String, required: true, index: true },
    resourceType: { type: String, default: '', index: true },
    resourceId: { type: String, default: '' },
    method: { type: String, default: '' },
    path: { type: String, default: '' },
    statusCode: { type: Number, default: 200 },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditEventSchema.index({ companyId: 1, createdAt: -1 });
auditEventSchema.index({ companyId: 1, resourceType: 1, resourceId: 1 });

const AuditEvent = mongoose.model('AuditEvent', auditEventSchema);
export default AuditEvent;
