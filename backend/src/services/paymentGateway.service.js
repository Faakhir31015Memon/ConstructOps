import crypto from 'crypto';

// Live checkout is enabled per-provider only when its API credentials are present.
// Without credentials every payment degrades to the verified manual flow.
const PROVIDER_ENV = {
  jazzcash: {
    required: ['GATEWAY_JAZZCASH_STORE_ID', 'GATEWAY_JAZZCASH_STORE_KEY', 'GATEWAY_JAZZCASH_INITIATE_URL'],
    label: 'JazzCash',
  },
  easypaisa: {
    required: ['GATEWAY_EASYPISA_STORE_ID', 'GATEWAY_EASYPISA_HASH_KEY', 'GATEWAY_EASYPISA_INITIATE_URL'],
    label: 'Easypaisa',
  },
};

export const getGatewayAvailability = () =>
  Object.fromEntries(
    Object.entries(PROVIDER_ENV).map(([id, cfg]) => [
      id,
      {
        label: cfg.label,
        live: cfg.required.every((key) => Boolean(process.env[key])),
      },
    ]),
  );

const hmac = (secret, message) =>
  crypto.createHmac('sha256', secret).update(message).digest('hex').toUpperCase();

const buildSecureHash = (params, securityKey) => {
  const ordered = Object.keys(params)
    .sort()
    .filter((k) => k !== 'secureHash')
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return hmac(securityKey, ordered);
};

// amountPKR is converted to paisa; providers charge in smallest unit.
export const initiateCheckout = async ({ provider, paymentId, amountPKR, payerMobile, company }) => {
  const cfg = PROVIDER_ENV[provider];
  if (!cfg) {
    const err = new Error(`Unsupported gateway provider: ${provider}`);
    err.code = 'UNKNOWN_PROVIDER';
    throw err;
  }
  if (!cfg.required.every((key) => Boolean(process.env[key]))) {
    const err = new Error(`${cfg.label} gateway is not configured on this environment.`);
    err.code = 'GATEWAY_NOT_CONFIGURED';
    throw err;
  }

  const orderId = `CO-${paymentId}`;

  if (provider === 'jazzcash') {
    const params = {
      pp_TxnInd: '2',
      pp_SupportedFeatures: 'F2',
      pp_Amount: String(Math.round(amountPKR * 100)),
      pp_CurrencyCode: '586',
      pp_LanguageCode: 'EN',
      pp_TxnDate: new Date().toISOString().slice(0, 10),
      pp_TxnTime: new Date().toTimeString().slice(0, 8).replace(/:/g, ''),
      pp_MobileAccount: payerMobile || '',
      pp_TxnRefNo: orderId,
      pp_Title: `ConstructOps subscription (${company})`,
      pp_MerchantID: process.env.GATEWAY_JAZZCASH_STORE_ID,
      pp_ReturnURL: process.env.GATEWAY_RETURN_URL || '',
      pp_EnableOtp: '1',
      pp_HashedIPAddress: '0',
    };
    params.pp_SecureHash = buildSecureHash(params, process.env.GATEWAY_JAZZCASH_STORE_KEY);

    const response = await fetch(process.env.GATEWAY_JAZZCASH_INITIATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (data.respCode !== '000') {
      const err = new Error(`JazzCash initiation failed: ${data.respCode} ${data.respMessage || ''}`);
      err.code = 'GATEWAY_INIT_FAILED';
      throw err;
    }
    return { provider, orderId, checkoutUrl: data.redirectUrl, sessionExpiry: null };
  }

  // easypaisa
  const payload = {
    storeId: process.env.GATEWAY_EASYPISA_STORE_ID,
    amount: String(Math.round(amountPKR * 100)),
    orderId,
    currency: 'PKR',
    email: '',
    phone: payerMobile || '',
    productdesc: `ConstructOps subscription (${company})`,
    productname: 'ConstructOps',
  };
  const signature = buildSecureHash(payload, process.env.GATEWAY_EASYPISA_HASH_KEY);
  const response = await fetch(process.env.GATEWAY_EASYPISA_INITIATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GATEWAY_EASYPISA_STORE_ID}`,
    },
    body: JSON.stringify({ ...payload, signature }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  const checkoutUrl = data.paymentRedirectUrl || data.redirectUrl || data.data?.paymentRedirectUrl;
  if (!response.ok || !checkoutUrl) {
    const err = new Error(`Easypaisa initiation failed: ${JSON.stringify(data).slice(0, 200)}`);
    err.code = 'GATEWAY_INIT_FAILED';
    throw err;
  }
  return { provider, orderId, checkoutUrl, sessionExpiry: null };
};

// Webhook authenticity: X-ConstructOps-Signature: hex HMAC-SHA256 of the raw body.
export const verifyWebhookSignature = (rawBody, signature) => {
  const secret = process.env.GATEWAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = hmac(secret, rawBody);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature).toUpperCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
