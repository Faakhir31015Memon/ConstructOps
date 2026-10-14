import SubscriptionPayment from '../models/subscriptionPayment.model.js';
import Payment from '../models/payment.model.js';
import { buildInvoicePdf } from '../services/invoicePdf.js';
import logger from '../utils/logger.js';

const PLAN_LABELS = {
  '1_month': 'ConstructOps — 1 month plan (30 days)',
  '6_months': 'ConstructOps — 6 months plan (180 days)',
  '12_months': 'ConstructOps — 12 months plan (365 days)',
};

const issuer = () => ({
  name: process.env.INVOICE_ISSUER || 'ConstructOps (Pvt) Ltd',
  line1: process.env.INVOICE_ADDRESS_LINE1 || 'ConstructOps SaaS Platform',
  line2: process.env.INVOICE_ADDRESS_LINE2 || 'Lahore, Pakistan',
  contact: [
    process.env.SUPPORT_EMAIL && `Email: ${process.env.SUPPORT_EMAIL}`,
    process.env.BANK_ACCOUNT_NUMBER && `${process.env.BANK_NAME || 'Bank'}: ${process.env.BANK_ACCOUNT_NUMBER}`,
    process.env.EASYPAISA_NUMBER && `EasyPaisa: ${process.env.EASYPAISA_NUMBER}`,
  ]
    .filter(Boolean)
    .join('  |  '),
});

const sendPdf = (res, filename, buffer) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.end(buffer);
};

const fail = (res, req, error, statusCode = 500) => {
  logger.error('Invoice generation failed', { error: error.message, path: req.originalUrl, userId: req.user?._id });
  if (!res.headersSent) res.status(statusCode).json({ success: false, message: 'Could not generate this document. Please try again.' });
};

// @desc    Download the SaaS subscription invoice/receipt for one payment
// @route   GET /api/v1/subscription/invoice/:paymentId
// @access  Private (own company) or admin
export const subscriptionInvoice = async (req, res) => {
  try {
    const payment = await SubscriptionPayment.findById(req.params.paymentId).populate('companyId', 'name');
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const userCompanyId = req.user.companyId?._id || req.user.companyId;
    if (req.user.role !== 'admin' && String(payment.companyId?._id || payment.companyId) !== String(userCompanyId)) {
      return res.status(403).json({ success: false, message: 'This invoice belongs to another company' });
    }
    if (payment.status === 'rejected') {
      return res.status(400).json({ success: false, message: 'This payment was rejected, so no invoice is available.' });
    }

    const periodDays = { '1_month': 30, '6_months': 180, '12_months': 365 }[payment.plan] || 30;
    const issuedAt = payment.reviewedAt || payment.gateway?.capturedAt || payment.createdAt;
    const doc = {
      kind: payment.status === 'approved' ? 'RECEIPT' : 'INVOICE',
      number: `SUB-${String(payment._id).slice(-8).toUpperCase()}`,
      issuedAt,
      status: payment.status.toUpperCase(),
      currency: payment.currency || 'PKR',
      method: String(payment.method).replace('_', ' ').toUpperCase(),
      reference: payment.transactionReference || '',
      from: issuer(),
      to: {
        name: payment.companyId?.name || 'Customer',
        line1: 'ConstructOps subscription',
        contact: '',
      },
      dueLabel: 'Service period',
      periodLabel: `${new Date(issuedAt).toISOString().slice(0, 10)} -> ${new Date(new Date(issuedAt).getTime() + periodDays * 86400000).toISOString().slice(0, 10)}`,
      lines: [{ description: PLAN_LABELS[payment.plan] || `ConstructOps ${payment.plan}`, qty: 1, rate: payment.amount, amount: payment.amount }],
      subtotal: payment.amount,
      tax: 0,
      total: payment.amount,
      notes: payment.payerDetails ? `Payer: ${payment.payerDetails}` : '',
    };

    const buffer = await buildInvoicePdf(doc);
    sendPdf(res, `constructops-${doc.number.toLowerCase()}.pdf`, buffer);
  } catch (error) {
    fail(res, req, error);
  }
};

// @desc    Download a contractor payment invoice for one recorded payment
// @route   GET /api/v1/contractors/invoice/:paymentId
// @access  Private (owner/accountant/manager of that company) or admin
export const contractorPaymentInvoice = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId)
      .populate('projectId', 'name location companyId')
      .populate('contractorId', 'name email')
      .populate('companyId', 'name');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const userCompanyId = req.user.companyId?._id || req.user.companyId;
    const sameCompany =
      String(payment.companyId?._id || payment.companyId) === String(userCompanyId);
    // A subcontractor may always pull the receipt for a payment made to them.
    const isPayee = String(payment.contractorId?._id || payment.contractorId) === String(req.user._id);
    if (req.user.role !== 'admin' && !sameCompany && !isPayee) {
      return res.status(403).json({ success: false, message: 'This invoice belongs to another company' });
    }

    const doc = {
      kind: 'INVOICE',
      number: `PAY-${String(payment._id).slice(-8).toUpperCase()}`,
      issuedAt: payment.paymentDate || payment.createdAt,
      status: String(payment.status).toUpperCase(),
      currency: 'PKR',
      method: String(payment.paymentMethod).replace('_', ' ').toUpperCase(),
      reference: payment.referenceNumber || '',
      from: {
        name: payment.companyId?.name || 'Company',
        line1: 'Main contractor',
        contact: '',
      },
      to: {
        name: payment.contractorId?.name || 'Subcontractor',
        line1: payment.contractorId?.email || '',
        contact: '',
      },
      dueLabel: 'Site',
      periodLabel: payment.projectId?.name || '-',
      lines: [
        {
          description: `Work payment — ${payment.projectId?.name || 'site'}${payment.projectId?.location ? ` (${payment.projectId.location})` : ''}`,
          qty: 1,
          rate: payment.amount,
          amount: payment.amount,
        },
      ],
      subtotal: payment.amount,
      tax: 0,
      total: payment.amount,
      notes: payment.notes || '',
    };

    const buffer = await buildInvoicePdf(doc);
    sendPdf(res, `constructops-payment-${doc.number.toLowerCase()}.pdf`, buffer);
  } catch (error) {
    fail(res, req, error);
  }
};

// @desc    Download a payroll sheet invoice/statement for a month
// @route   GET /api/v1/workers/payroll/invoice?projectId=&month=
// @access  Private
export const payrollStatement = async (req, res) => {
  try {
    const { buildPayroll } = await import('../services/payroll.service.js');
    const companyId = req.user.companyId?._id || req.user.companyId;
    const payroll = await buildPayroll({
      projectId: req.query.projectId,
      month: req.query.month,
      companyId: req.user.role === 'admin' ? null : companyId,
    });

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Project not found or not accessible' });
    }

    const doc = {
      kind: 'PAYROLL',
      number: `LAB-${String(payroll.project._id).slice(-6).toUpperCase()}-${String(payroll.month).replace('-', '')}`,
      issuedAt: new Date(),
      status: 'PREPARED',
      currency: 'PKR',
      method: 'CASH / BANK',
      from: { name: payroll.companyName || 'Company', line1: `Site: ${payroll.project.name}`, contact: '' },
      to: { name: `${payroll.rows.length} workers`, line1: payroll.periodLabel, contact: '' },
      dueLabel: 'Period',
      periodLabel: payroll.periodLabel,
      lines: payroll.rows.slice(0, 55).map((row) => ({
        description: `${row.name} (${row.role}) — ${row.daysPresent} days`,
        qty: row.daysPresent,
        rate: row.dailyWage,
        amount: row.amount,
      })),
      subtotal: payroll.totals.amount,
      tax: 0,
      total: payroll.totals.amount,
      notes: payroll.rows.length > 55 ? `${payroll.rows.length - 55} more workers on the Excel export.` : '',
    };

    const buffer = await buildInvoicePdf(doc);
    sendPdf(res, `constructops-payroll-${doc.number.toLowerCase()}.pdf`, buffer);
  } catch (error) {
    fail(res, req, error);
  }
};
