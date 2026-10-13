import mongoose from 'mongoose';
import SubscriptionPayment from '../models/subscriptionPayment.model.js';
import User from '../models/user.model.js';
import { activatePlanForPayment } from '../services/subscriptionActivation.service.js';

// payload: { orderId, status: 'captured' | 'failed', reference? }
export const handleGatewayWebhook = async ({ provider, payload }) => {
  const { orderId, status } = payload || {};
  if (!orderId || !['captured', 'failed'].includes(status)) {
    throw new Error('Payload must include orderId and status (captured|failed).');
  }

  const byId = String(orderId).replace(/^CO-/, '');
  const or = [{ 'gateway.orderId': orderId }];
  if (mongoose.isValidObjectId(byId)) {
    or.push({ _id: byId });
  }
  const payment = await SubscriptionPayment.findOne({ $or: or });
  if (!payment) {
    throw new Error(`No payment found for order ${orderId}`);
  }
  if (payment.gateway?.provider && payment.gateway.provider !== provider) {
    throw new Error(`Order belongs to provider ${payment.gateway.provider}, not ${provider}`);
  }
  if (payment.status !== 'pending') {
    return { message: `Payment already ${payment.status}`, paymentId: payment._id };
  }

  if (status === 'captured') {
    const { subscription } = await activatePlanForPayment(payment, `Captured via ${provider} webhook`);
    payment.gateway.capturedAt = new Date();
    await payment.save();
    return { message: 'Payment captured; plan activated', paymentId: payment._id, subscription };
  }

  payment.status = 'rejected';
  payment.reviewNote = `${provider} checkout failed`;
  payment.reviewedAt = new Date();
  await payment.save();
  await User.updateMany({ companyId: payment.companyId }, { status: 'active' });
  return { message: 'Payment marked failed; company reactivated for manual retry', paymentId: payment._id };
};
