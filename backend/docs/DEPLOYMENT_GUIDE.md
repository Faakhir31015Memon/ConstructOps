# DEPLOYMENT & OPERATIONS GUIDE — CONSTRUCTOPS
**Target Environments:** Staging & Production
**Architecture:** One Node/Express service (API + static SPA + uploaded photos) on a persistent runtime, plus MongoDB Atlas.

---

## 1. Environment Configuration

### 1.1 Backend (`backend/.env`, template in `backend/.env.example`)
`backend/.env.example` documents every variable the code actually reads. The
minimal set to boot is:

```env
PORT=5000
NODE_ENV=production
DB_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/constructops?retryWrites=true&w=majority
JWT_SECRET=<openssl rand -hex 32>
CORS_ORIGIN=https://app.constructops.com
LOG_LEVEL=info
```

Notes on names that trip people up:

- The connection variable is **`DB_URI`** (`src/config/db.js`), not `MONGO_URI`.
- The API base has no `VITE_API_URL`; the frontend reads **`VITE_API_BASE_URL`**.
- `JWT_SECRET` has **no fallback** — the process refuses to start without it.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` create the env-only system admin. Leave them
  unset on a public demo so no shared super-user exists.
- Everything else (SMTP, WhatsApp, gateway, AI assistant, invoices) is optional;
  each feature degrades to a "not configured" state instead of failing.

### 1.2 Frontend (`frontend/.env`)
```env
# Origin of the API only — the client appends /api/v1 itself.
VITE_API_BASE_URL=https://api.constructops.com
```
Leave it unset when the SPA and API share one origin (Option A); the client then
calls `/api/v1` on the same host.

---

## 2. Repository Layout

- `Dockerfile`, `.dockerignore`, `render.yaml` — single-image deploy + blueprint.
- `backend/` — Express API, Mongoose models, maintenance scripts (`backend/scripts/`), docs (`backend/docs/`).
- `frontend/` — Vite/React SPA, PWA manifest + hand-written service worker (`frontend/public/`), `vercel.json` for the split option.

There is **no** `backend/vercel.json` and **no** `backend/api/[...all].js`. The
backend is not a serverless function app: `server.js` listens on `PORT`, runs the
digest scheduler, and needs a persistent process. Earlier revisions of this
document described a Vercel serverless layout that was never built.

---

## 3. Local Development Startup

1. **Backend:** `cd backend && npm install && npm run dev` (nodemon, port 5000).
2. **Frontend (second terminal):** `cd frontend && npm install && npm run dev`
   (Vite, port 3000). `vite.config.js` proxies `/api` and `/uploads` to
   `http://127.0.0.1:5000`, so the browser sees one origin and no CORS setup.
3. **Built-app test:** `cd frontend && npm run build`, then copy the bundle next
   to the API (`cp -r frontend/dist backend/public`) and open
   `http://localhost:5000`. That is the exact code path a single-image deploy
   uses, including the service worker (it only registers on a production build).

---

## 4. Production Deployment

### Option A — Single image (recommended: one URL, no CORS)
`Dockerfile` builds the SPA, then copies `frontend/dist` into `backend/public`
inside the runtime image. `src/app.js` serves `./public` when it exists, so one
origin answers `/`, `/api/v1/*` and `/uploads/*`.

```bash
docker build -t constructops .
docker run -p 5000:5000 --env-file backend/.env constructops
curl -s http://localhost:5000/api/v1/health   # {"database":{"status":"up",...}}
```

Render does this from `render.yaml` (`Blueprint`). **Uploads are on the container
filesystem**, so either attach a persistent disk mounted at `/app/uploads` or
accept that report photos disappear on redeploy — see the commented `disk:` block.

### Option B — Split: Vercel (SPA) + any Node host (API)
- Vercel project **Root Directory = `frontend`**; `frontend/vercel.json` supplies
  the build command, `dist` output, SPA rewrites and cache headers.
- Set `VITE_API_BASE_URL` to the API origin and add that Vercel origin to the
  backend's `CORS_ORIGIN` allowlist (comma-separated).
- The API must run as a long-lived process (`npm start` under pm2/Docker/a
  Render web service). Serverless functions would break the digest scheduler and
  the uploaded-photo directory.

### Post-deploy checklist
1. `GET /api/v1/health` returns `database.status: "up"` (it performs a real ping).
2. `npm run ensure-indexes` — creates and verifies every compound/unique/TTL index.
3. `npm run backup` then check `backend/backups/<stamp>/manifest.json`.
4. Log in as a real user, create nothing, and confirm the audit trail page loads.
5. `npm run test:webhook` against the staging URL once gateway creds are set.

## 5. Backups, Seeding and Gateway Verification
See `BACKUP_RESTORE.md`, `PAYMENT_GATEWAY_SETUP.md` and `DEMO_SCRIPT.md` in this
folder. All maintenance commands run from `backend/`:

| Command | Purpose |
|---|---|
| `npm run backup` | JSONL dump of every collection (+ `uploads/`) into `BACKUP_DIR` |
| `npm run restore <folder> --yes` | Wipe-and-replay a backup; refuses in production unless `FORCE_RESTORE=1` |
| `npm run ensure-indexes` | `syncIndexes()` for all models, then prints the live index set |
| `npm run seed:demo -- --force` | Loads the demo tenant; blocked unless `ALLOW_DEMO_SEED=1` |
| `npm run test:webhook` | Signed HMAC webhook round-trip against a running API |

## 6. Runtime Constraints
- **HTTPS termination** must happen in front of the service; the service worker
  and the OAuth-free token cookies both assume a secure origin.
- One process per environment may set `DIGEST_AUTOMATIC=1`; two schedulers send
  duplicate WhatsApp digests.
- `backend/uploads/` and `backend/backups/` hold customer data and are
  gitignored. A legacy photo is already in git history — purge it before the
  first customer goes live.
