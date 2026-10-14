import '../src/config/env.js';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import Company from '../src/models/company.model.js';
import User from '../src/models/user.model.js';
import SubscriptionPayment from '../src/models/subscriptionPayment.model.js';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
};

const BASE_URL = flag('base-url', process.env.APP_URL || 'http://localhost:5000');
const PROVIDER = flag('provider', 'jazzcash');
const SECRET = process.env.GATEWAY_WEBHOOK_SECRET || '';
const PLAN = flag('plan', '1_month');

const sign = (body) => crypto.createHmac('sha256', SECRET).update(body).digest('hex').toUpperCase();

const post = async (body, signature) => {
  const res = await fetch(`${BASE_URL}/api/v1/billing/gateway/webhook/${PROVIDER}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-ConstructOps-Signature': signature },
    body,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
};

const check = (label, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) process.exitCode = 1;
};

const createDemoPayment = async () => {
  const company = await Company.create({
    name: 'Webhook Test Company',
    subscriptionPlan: 'trial',
    subscriptionStatus: 'active',
    isTrial: true,
  });
  const owner = await User.create({
    name: 'Webhook Tester',
    email: `webhook-test-${Date.now()}@example.invalid`,
    password: 'TempPass123',
    role: 'owner',
    companyId: company._id,
    status: 'active',
  });
  const payment = await SubscriptionPayment.create({
    companyId: company._id,
    submittedBy: owner._id,
    plan: PLAN,
    amount: 15000,
    method: PROVIDER === 'jazzcash' ? 'jazzcash' : 'easypaisa',
    status: 'pending',
    transactionReference: 'AWAITING-GATEWAY-CAPTURE',
    gateway: { provider: PROVIDER, orderId: '', status: 'initiated' },
  });
  payment.gateway.orderId = `CO-${payment._id}`;
  await payment.save();
  return { payment, company, owner };
};

const run = async () => {
  if (!SECRET) {
    console.error('GATEWAY_WEBHOOK_SECRET is not set in backend/.env — the server cannot verify any signature.');
    process.exit(1);
  }

  await connectDB();
  console.log(`Target: ${BASE_URL}/api/v1/billing/gateway/webhook/${PROVIDER}`);

  let created = null;
  let payment =
    (flag('payment-id', '') && (await SubscriptionPayment.findById(flag('payment-id', '')))) ||
    (await SubscriptionPayment.findOne({ 'gateway.provider': PROVIDER, status: 'pending' }).sort({ createdAt: 1 }));

  if (!payment) {
    console.log('No pending gateway payment in the database — creating a throwaway one.');
    created = await createDemoPayment();
    payment = created.payment;
  }

  console.log(`Payment ${payment._id} · order ${payment.gateway.orderId} · status ${payment.status}\n`);

  // 1. Forged signature must be refused.
  const tamperedBody = JSON.stringify({ orderId: payment.gateway.orderId, status: 'captured' });
  const forged = await post(tamperedBody, sign(tamperedBody).split('').reverse().join(''));
  check('unsigned/forged callback is rejected', forged.status === 401, `HTTP ${forged.status}`);

  // 2. Unknown order must be refused.
  const unknownBody = JSON.stringify({ orderId: 'CO-000000000000000000000000', status: 'captured' });
  const unknown = await post(unknownBody, sign(unknownBody));
  check('unknown order id is rejected', unknown.status === 400, `HTTP ${unknown.status}`);

  // 3. Correctly signed capture must activate the plan.
  const captureBody = JSON.stringify({
    orderId: payment.gateway.orderId,
    status: 'captured',
    reference: 'TEST-TXN-0001',
  });
  const capture = await post(captureBody, sign(captureBody));
  check('signed capture accepted', capture.status === 200 && capture.json.success, `HTTP ${capture.status} ${JSON.stringify(capture.json)}`);

  const after = await SubscriptionPayment.findById(payment._id).lean();
  check('payment is approved', after?.status === 'approved', `status=${after?.status}`);

  const companyAfter = await Company.findById(after.companyId).lean();
  check(
    'company subscription extended',
    Boolean(companyAfter?.subscriptionEndDate) && new Date(companyAfter.subscriptionEndDate) > new Date(),
    `plan=${companyAfter?.subscriptionPlan} ends=${companyAfter?.subscriptionEndDate}`
  );

  // 4. Providers retry webhooks — a second capture must not double-extend.
  const endBefore = companyAfter.subscriptionEndDate;
  const replay = await post(captureBody, sign(captureBody));
  check('replayed capture is idempotent', replay.status === 200, `HTTP ${replay.status} ${replay.json.message || ''}`);
  const endAfter = (await Company.findById(after.companyId).select('subscriptionEndDate').lean())?.subscriptionEndDate;
  check(
    'replay did not extend the plan again',
    String(endBefore) === String(endAfter),
    `${endBefore} → ${endAfter}`
  );

  if (created) {
    await SubscriptionPayment.deleteOne({ _id: created.payment._id });
    await User.deleteOne({ _id: created.owner._id });
    await Company.deleteOne({ _id: created.company._id });
    console.log('\nThrowaway payment/company cleaned up.');
  }

  const failed = process.exitCode === 1;
  console.log(
    failed
      ? '\nSome webhook checks failed — fix the gateway configuration before going live.'
      : '\nGateway webhook path verified end to end. Next step: run the same script against the provider sandbox URL.'
  );
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Webhook test crashed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
