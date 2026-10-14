# Live Payment Gateway Setup — JazzCash & Easypaisa

The code side of live checkout is already in place (`src/services/paymentGateway.service.js`,
`src/routes/billing.routes.js`, `src/controllers/gatewayWebhook.controller.js`).
What is missing is a **merchant account**, which only the business can open. Until then every
checkout falls back to the manual flow: the company transfers to the bank/EasyPaisa number
shown at checkout and submits a reference, and the admin approves it.

## 1. What to apply for

| Provider | Where | What you receive |
| --- | --- | --- |
| JazzCash Merchant | JazzCash Business / Pakistan Mobile Communications merchant onboarding | Merchant ID (store ID), Store Key, return URL registration, UAT + production initiate endpoints |
| Easypaisa Merchant | Telenor Microfinance Bank merchant portal | Store ID, Hash Key, product code, sandbox and live API base URLs |

Both require a registered business (NTN, bank account, address). Ask the integration
team for the **UAT/sandbox credentials first** — the sandbox behaves like production
against test cards and test wallets.

Write down, for each environment (sandbox and live):
- the **initiate/checkout API URL** the provider gives you
- the **return URL** you register with them — it must be
  `https://<your-domain>/billing/return` (or wherever you land the customer)
- whether the provider posts a **server-to-server callback** and its format

## 2. Environment variables

Sandbox first; copy the same keys with live values when you go to production.

```
GATEWAY_JAZZCASH_STORE_ID=
GATEWAY_JAZZCASH_STORE_KEY=
GATEWAY_JAZZCASH_INITIATE_URL=            # initiate endpoint from the JazzCash onboarding pack
GATEWAY_EASYPISA_STORE_ID=
GATEWAY_EASYPISA_HASH_KEY=
GATEWAY_EASYPISA_INITIATE_URL=            # initiate endpoint from the Easypaisa onboarding pack
GATEWAY_RETURN_URL=https://<domain>/billing/return
GATEWAY_WEBHOOK_SECRET=<long random string, e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`>
APP_CLIENT_URL=https://<domain>
```

`GET /api/v1/billing/gateway-status` tells you (and the UI) which providers are live:

```json
{ "providers": { "jazzcash": { "label": "JazzCash", "live": true },
                "easypaisa": { "label": "Easypaisa", "live": false } } }
```

Checkout only offers a provider whose `live` flag is true; otherwise it shows the manual
transfer instructions. This is why the app is demoable without any credentials.

## 3. Request flow

1. Owner picks a plan → `POST /api/v1/subscription/payment` with `method: jazzcash|easypaisa`.
2. The API creates a `SubscriptionPayment` (status `pending`), builds the provider payload,
   signs it with the store/hash key (`secure hash = HMAC-SHA256` over the alphabetically
   sorted `key=value&…` string, uppercase hex), and calls the provider's initiate URL.
   Amount is sent in paisa (`Rs × 100`).
3. The provider returns a `redirectUrl`; the SPA opens it. Order id is `CO-<paymentId>`.
4. The customer pays in the provider's hosted page.
5. The provider calls back, and the plan activates.

If initiation fails, the pending payment record is deleted and the company is unlocked
again, so a gateway outage never leaves a customer stuck in `pending_payment`.

## 4. Webhook contract

```
POST /api/v1/billing/gateway/webhook/jazzcash      (or /easypaisa)
Content-Type: application/json
X-ConstructOps-Signature: <uppercase hex HMAC-SHA256 of the raw request body, keyed with GATEWAY_WEBHOOK_SECRET>

{ "orderId": "CO-6acf9d888a8cf0a97d2cfa69", "status": "captured", "reference": "TXN-0001" }
```

- `status` is `captured` or `failed`. Anything else is rejected.
- The signature is computed over the **raw body bytes** (`req.rawBody`), so it survives
  the request sanitizer.
- Responses: `401` bad signature · `400` unknown order / bad payload · `200` processed.
- Replay-safe: a payment that is no longer `pending` is acknowledged but never re-applied,
  so provider retries cannot extend a subscription twice.
- If your provider posts its own signature scheme instead, keep the raw body and verify
  the provider signature inside `handleGatewayWebhook`, then issue the internal signed
  forward yourself. Do not loosen `GATEWAY_WEBHOOK_SECRET` verification — it is the only
  thing between a public route and "this customer is now paid".

## 5. Test it before spending money

```bash
cd backend
npm run test:webhook                      # http://localhost:5000
npm run test:webhook -- --provider=easypaisa --plan=6_months
npm run test:webhook -- --base-url=https://<staging-domain>
```

The script creates a throwaway pending payment (no test data left behind), then asserts:

1. a forged signature is rejected (401)
2. an unknown order id is rejected (400)
3. a correctly signed `captured` payload is accepted and the payment turns `approved`
4. the company subscription actually extends
5. replaying the same capture is idempotent and does not extend the plan twice

All seven checks passing means the money path is trustworthy. Repeat it against the
provider sandbox once real credentials are in — that is the part no local script can prove.

## 6. Going live checklist

- [ ] Merchant accounts opened, sandbox credentials tested with a real Rs 1–10 payment
- [ ] `GATEWAY_*` live values set, `GATEWAY_RETURN_URL` registered with the provider
- [ ] `GATEWAY_WEBHOOK_SECRET` regenerated (never reuse the sandbox value)
- [ ] Provider callback URL pointed at `https://<domain>/api/v1/billing/gateway/webhook/<provider>`
- [ ] `npm run test:webhook -- --base-url=https://<domain>` green against staging
- [ ] One real end-to-end payment made from a phone, then refunded/reconciled
- [ ] Daily reconciliation: count `approved` payments vs provider settlement report
