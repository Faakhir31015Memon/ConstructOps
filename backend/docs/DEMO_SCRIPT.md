# 90-SECOND DEMO VIDEO — SHOT LIST

Purpose: an investor-facing walkthrough of ConstructOps running on the hosted
demo. Target length 85–95 seconds. Record the browser at 1920x1080, zoom 100%,
OS notifications off, and use a real cursor (no highlighter effects).

## Before you press record
1. Deploy per `DEPLOYMENT_GUIDE.md` (Option A) and load the tenant once:
   `cd backend && npm run seed:demo -- --force`
2. Sign in as the demo owner at least once so the onboarding checklist is in a
   known state, then sign out and close all tabs.
3. Browser window: only the app. Clear chat, hide bookmarks bar (`Ctrl+Shift+B`).
4. Demo login (seeded, throwaway data — never a real customer):
   `owner@demo.constructops.pk` / `Construct123`

| Shot | Time | Screen | What to say (one line) |
|---|---|---|---|
| 1. Hook | 0:00–0:08 | Login page, type the email, land on Dashboard | "ConstructOps is the site, labour and cost ledger a Pakistani contractor runs on one phone." |
| 2. Dashboard | 0:08–0:22 | Dashboard KPI cards + charts, scroll once | "Three active sites, live spend against budget, and the delay alerts the owner would otherwise hear about a week late." |
| 3. Site detail | 0:22–0:34 | Open *Khrais Housing Scheme — Phase 2* → Workers tab | "Twenty workers on this site. Attendance is one tap: mark all present." Click **Mark all present**. |
| 4. Payroll | 0:34–0:46 | Payroll tab, month picker, **Statement PDF** | "Payroll is derived from attendance — days present times the daily rate. No separate register, no month-end argument." |
| 5. Daily report | 0:46–0:58 | Reports tab, open today's report with a photo | "The site engineer files a photo report in thirty seconds; the platform turns it into progress and delay notes." |
| 6. Cost + materials | 0:58–1:08 | Materials tab, then Expenses | "Every bag of cement in and out, every expense pending approval, so the cost per site is always true." |
| 7. Money in | 1:08–1:18 | Account → Billing history → **Receipt** PDF | "Subscription and receipts are handled in-app, including the contractor's payment receipt." |
| 8. WhatsApp digest | 1:18–1:26 | Project → WhatsApp Digest → **Preview** | "And at nine PM the owner gets this summary on WhatsApp — without opening the app." |
| 9. Close | 1:26–1:32 | Dashboard again, hold 2s | "That's the whole product. ConstructOps — site control from your phone." |

## Recording mechanics
- Capture with OBS (Window Capture on the browser) at 60fps; audio optional — most
  investors watch muted, so keep on-screen text readable and add subtitles.
- Do one full dry run, then record three takes and keep the best.
- Click deliberately: pause 0.5s before each click so the cut is legible.
- If a shot needs more time than its slot, cut the materials shot (#6) first —
  attendance and payroll are the differentiators.

## If a shot fails
- Blank dashboard: the demo tenant was wiped by a redeploy — re-run the seed.
- "Trial expired": the seeded subscription end date passed; re-seed.
- PDF button spinner: PDFs stream from the API; if the API slept (free tier),
  load `…/api/v1/health` first, wait for `status: "up"`, then record.
