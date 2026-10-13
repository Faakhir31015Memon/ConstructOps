# ConstructOps

Construction project management SaaS for Pakistani contractors: projects, budgets,
expenses, materials, workers, attendance, daily site reports, alerts, exports and a
plan-based subscription with admin-verified or live-gateway payments.

## Structure

| Folder | Stack | Own files |
|---|---|---|
| `backend/` | Node.js + Express + MongoDB (Mongoose) | `package.json`, `package-lock.json` |
| `frontend/` | React 18 + Vite | `package.json`, `package-lock.json`, `vite.config.js` |
| `docs/` (in backend) | Architecture, API, security, roadmap docs | — |

Each app is fully self-contained: run `npm install` inside the folder you are working on.

## Run

```bash
# Backend (needs a local MongoDB or an Atlas URI in backend/.env as DB_URI)
cd backend
npm install
cp .env.example .env   # set JWT_SECRET, DB_URI, CORS_ORIGIN
npm run dev            # development (nodemon)  -> http://localhost:5000
npm start              # production             -> same port, no file watching

# Frontend
cd ../frontend
npm install
npm run dev            # development -> http://localhost:3000 (proxies /api to :5000)
npm run build          # production bundle in frontend/dist
```

`CORS_ORIGIN` is a comma-separated allowlist (default `http://localhost:3000`);
requests from other browser origins are rejected with 403. The server shuts down
gracefully on SIGINT/SIGTERM (drains requests, closes the Mongo connection).

## Payments

- Manual flow (default, always available): bank transfer to a Pakistani bank
  (bank + account title + account number **or** IBAN), or JazzCash/Easypaisa TID.
  Admin verifies and approves under `PUT /api/v1/subscription/admin/payments/:id/approve`.
- Live checkout: set `GATEWAY_JAZZCASH_*` / `GATEWAY_EASYPISA_*` credentials in
  `backend/.env`; the checkout button appears automatically and the provider
  confirms via signed webhook (`POST /api/v1/billing/gateway/webhook/:provider`,
  HMAC-SHA256 with `GATEWAY_WEBHOOK_SECRET`).

## AI Assistant

Floating in-app assistant (owner/manager/accountant/contractor aware). It answers
from a tenant-scoped workspace snapshot — company totals are computed with database
aggregations, so answers stay correct even for large workspaces. With
`ASSISTANT_API_KEY` set it uses an OpenAI-compatible model
(`ASSISTANT_API_BASE_URL`, `ASSISTANT_MODEL`); without keys it falls back to a
deterministic answer engine over the same data. Contractors only ever see their
assigned projects and their own expenses.

## Security posture

- All company data is tenant-scoped; every `/projects/:id...` route passes through
  `checkProjectAccess` (company match + contractor assignment).
- Update endpoints use field whitelists — `companyId`, `addedBy`, `spent`, `status`
  cannot be injected through request bodies.
- Gateway webhooks are HMAC-verified against the raw request body.
- CORS allowlist + `nosniff` / `DENY` frame headers on every API response.
