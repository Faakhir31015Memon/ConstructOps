# GO-TO-MARKET PLAN — CONSTRUCTOPS (12 MONTHS)

**Stage:** single-founder pre-seed, Pakistan. **Objective by Month 12:** 40 paying accounts, ~Rs 550K MRR, documented trial→paid conversion ≥ 30%, blended CAC ≤ Rs 30K, churn baseline established. (Aligned to FINANCIAL_PROJECTIONS.md Y1; MARKET_ANALYSIS.md SOM.) All targets are assumptions-driven, not commitments.

---

## 1. Ideal Customer Profile (ICP)

**Primary ICP — the growing mid-small contractor:**

| Attribute | Value |
|---|---|
| Firm type | Building/road contractor or small developer, 2–8 concurrent sites (private residential/commercial work in DHA-type societies, CDA-approved housing, commercial plazas) |
| Size | 8–40 regular staff + daily-wage muster; annual turnover roughly Rs 25M–500M (owner-managed P&L) [ASSUMPTION — validate in first 20 discovery calls] |
| Pain trigger | Material pilferage (cement/steel), ghost labor billing, budget drift discovered too late, WhatsApp-chaos reporting — the loss pattern quantified in BUSINESS_MODEL.md §1 |
| Buyer | The owner himself; accountant and site supervisor are the two influencers |
| Disqualifiers | Government-only contractors (measurement-book/TTA workflows differ), single-house builders with <11 months of pipeline (churn by design), firms refusing any data off paper |

**Secondary ICP:** subcontractors (finishing, electrical) as referral carriers; real-estate societies as multi-project accounts later.

**Geographic beachhead:** Karachi → Lahore → Islamabad/Rawalpindi (formal-contractor concentration; founder travel radius), then Faisalabad/Multan via associations.

---

## 2. Pricing & Packaging (as implemented in product)

Source of truth: `backend/src/utils/subscription.util.js`; trial created at signup in `backend/src/controllers/auth.controller.js`; enforcement in `backend/src/middleware/auth.middleware.js`. [1]

| Plan | Price | Sites / Users | Positioning |
|---|---|---|---|
| Free trial | Rs 0, 15 days | 2 / 3 | Full product, time-boxed — the entire demo is the trial |
| 1 Month | Rs 15,000/mo | 5 / 15 | Entry; month-to-month = the default close |
| 6 Months | Rs 75,000 (=12.5K/mo, −17%) | 8 / 25 | "Project-cycle" plan — matches a 6–8 month build |
| 12 Months | Rs 135,000 (=11.25K/mo, −25%) | 15 / 50 | Annual-discount close for firms with continuous pipeline |

The Rs 45,000 Professional / Rs 120,000+ Enterprise tiers in BUSINESS_MODEL.md remain a **future upsell hypothesis, not sold today**; multi-site pressure is currently monetized via the 12-month tier's 15-site cap. [2]

### 15-day trial mechanics (exactly as the product behaves)

1. Self-signup creates the company workspace instantly with `plan=trial`, 15-day `subscriptionEndDate` (auth.controller.js: `trialDays = 15`). Limits enforced by middleware: 2 active projects, 3 users.
2. On day 7–10, in-app "expiring soon" state surfaces (`isExpiringSoon` at ≤7 days).
3. On expiry the account is **suspended, not deleted**: API returns "Your 15-day trial or plan has ended… submit a payment to reactivate" (auth.middleware.js:94). All data is preserved — the lock-in moment is deliberately the owner's own ledger.
4. Reactivation = payment submission (bank transfer / JazzCash / Easypaisa with transaction ID, or card details captured for manual verification); platform admin verifies the deposit and approves against the account (`PUT /subscription/admin/payments/:id/approve`), which activates the plan and extends the term.
5. When gateway credentials are configured (`GATEWAY_JAZZCASH_*` / `GATEWAY_EASYPISA_*`), a live checkout button appears automatically with HMAC-verified webhook confirmation — no code change needed to switch on automated collection. [1]

**GTM rule built into the funnel:** the founder never pitches without loading the prospect's real project names, staff list, and one budget line into a trial account during the first meeting. Trial value = "your book, already in the system, at day 15."

---

## 3. Channel Plan

### 3.1 Founder-led field sales (primary, Months 1–12)

- Target: 6 site visits + 8 remote demos per month; sell where work happens — on-site visits at active constructions in DHA/Korangi/Bath Island (Karachi), Johar/DHA phases (Lahore), CBR/sector builds (Islamabad).
- Collateral: 10-minute Urdu/Roman-Urdu demo (product already i18n-ready), printed one-pager of the material IN/OUT ledger and muster sheet output — sell the audit trail, not "software."
- Reference selling: after Month 4, every close is a named reference for the next (contractor networks are referral-dense; see 3.4).

### 3.2 Contractor associations & chambers (Months 3–12)

- Approach builder/developer associations and chamber-of-commerce construction panels (FPCCI-affiliated district chambers; local housing-society developer bodies) for paid speaking/demo slots and member discounts.
- Offer: association-branded onboarding workshop + 1 free month to member firms that start a trial within the campaign window. Budget: association sponsorships/partnership fees Rs 350K/yr (Section 6).
- KPI: ≥25% of Month-9+ trial volume attributable to association-sourced leads or referrals.

### 3.3 Facebook / Instagram / WhatsApp marketing (Months 5–12)

- Rationale with numbers: 52.9M Facebook users in Pakistan; contractor commerce (labor crews, material dealers, plot booking) already runs on Facebook groups + WhatsApp — this is where the ICP lives online. [3]
- Motion: (a) Facebook lead forms targeting "thekedar"/contractor-interest audiences in 3 metros, creative = 60-sec site-owners' pain video in Roman Urdu; (b) WhatsApp business line with catalog of the 3 plans and one-tap trial-signup link; (c) weekly "site-control tip" content in 2–3 large contractor groups (organic).
- Budget: Rs 900K over the year (starting M5), benchmark CAC for paid social B2B SMB in Pakistan assumed at Rs 8–15K per *qualified trial* [ASSUMPTION — test with Rs 25K/month before scaling].

### 3.4 Referral program (Months 6–12)

- Mechanics: existing paying customer gets **1 free month (plan-value credit)** per referred firm that converts to paid; referee gets 7 extra trial days. Cost = ~Rs 13.75K per conversion vs Rs 25K blended CAC — margin accretive by design.
- Distribution: referral card auto-generated inside the app workspace (owner view); accountant/material-dealer double-referrals logged manually by founder.

---

## 4. Sales Motion — and Why Manual Bank/JazzCash/Easypaisa Activation Is a Feature

The funnel: **Lead → site-visit/WhatsApp demo → 15-day trial (their real data loaded) → day-11 payment-intent call → bank slip / wallet TID submitted → admin verifies → activation → day-30 onboarding review → expansion (add sites) / referral ask.**

Manual payment + human activation is intentional at this stage, for six investor-relevant reasons:

1. **Trust economics.** Pakistani SME owners pay against relationship and receipt, not a card form. Submitting a bank slippage (rai­d/UTR) or a JazzCash/Easypaisa TID mirrors how they already pay labor, dealers, and consultants; the checkout asks nothing unfamiliar.
2. **It filters for serious buyers.** A prospect who transfers Rs 15,000 to an account *before* admin approval has self-selected as high-intent — supporting the 33% trial→paid assumption (FINANCIAL_PROJECTIONS A2) that a one-click card trial would dilute.
3. **Fraud/chargeback = Rs 0.** Collections are final on approval; there is no card-network dispute risk on 60–70% of revenue until the gateway is enabled.
4. **Zero fixed gateway cost while volume is small.** Live JazzCash/Easypaisa checkout is env-flag ready with HMAC webhooks; switching it on when collections justify the ~2.5–3.5% MDR keeps the COGS line in FINANCIAL_PROJECTIONS §4 (Rs 165/customer/mo blended MDR) honest. [1]
5. **Recovery path is already designed.** Suspension-not-deletion (auth.middleware.js) turns every expired trial into a warm, one-click-win reactivation conversation rather than a lost card trial.
6. **It generates the churn/activation dataset the founder needs** — payment-date, plan, reactivity behavior per company, recorded in the payment ledger with timestamps, before any self-serve automation is trusted.

The honest caveat to investors: manual activation caps throughput at roughly 15–20 activations/week of admin time; the plan therefore gates gateway enablement at Month 9–12 or >80 collections/cycle, whichever comes first.

---

## 5. Partner Ideas (Months 6–12, low cash, revenue-linked)

| Partner | Offer | What they get | ConstructOps gets |
|---|---|---|---|
| Cement & steel dealers (e.g., distributors in SITE/Sitapura/Shah Alam markets) | Co-branded "material reconciliation" one-pager; dealer recommends app to buyers; pilot: dealer scans delivery challans into customer's ledger | Fewer payment disputes; more predictable buyer cash flow; lead visibility on buyers' consumption | Distribution at point of purchase — 1 dealer relationship = 30–80 contractor contacts [ASSUMPTION: validate 2 dealers by M6] |
| Local ready-mix / block suppliers | Delivery-note template with ConstructOps QR (IN/OUT audit entry) | Dispute reduction on delivered quantity | Same wedge |
| Real-estate developer societies (private schemes) | "Owner dashboard" pitch: society committee sees contractor budget-vs-spent | Oversight without hiring staff | Multi-site enterprise-shaped logos (path to Enterprise tier) |
| Bank SME desks / microfinance (SBP digital-push programs) | Present ConstructOps as a "digitize-your-projects" partner in their workshops | Digitization KPIs for their programs | Pre-qualified contractors with bank relationships (also smooths bank-transfer activation) |
| Chartered-accountants / bookkeeping firms serving contractors | Referral fee = 1 month's first payment per logo; monthly-close export as their deliverable | Cleaner client books (audited ledgers, auto Excel/PDF exports already in product) | Trusted-advisor endorsement, the strongest signal in this market |

---

## 6. Budget — 12 Months (PKR)

Total GTM budget Y1: **Rs 2.65 million (~USD 9.4K @ Rs 282/USD)** — consistent with the Rs 1.2M marketing + Rs 0.45M travel + part of Rs 0.35M admin lines in FINANCIAL_PROJECTIONS §5. [4]

| Line | PKR | Timing | Notes |
|---|---|---|---|
| Paid social (FB lead gen + creative production) | 900,000 | M5–M12 | Rs 25K/mo pilot → scale only if trial-CAC ≤ Rs 15K |
| Field sales travel & site demos | 450,000 | M1–M12 | Karachi–Lahore–Islamabad circuit, ~1 visit/wk |
| Association sponsorships, workshop fees, printed collateral | 350,000 | M3–M12 | 2–3 paid sessions/yr + one-pagers |
| Referral credits (1 free month per referred conversion) | 300,000 | M6–M12 | ≈ 20–22 referral conversions at plan value |
| Sales tools (CRM free-tier→paid, WhatsApp Business, demo device/data) | 250,000 | M1–M12 | |
| Founder demo-account costs (trial data loading, part-time assistant 10 hrs/wk from M4) | 250,000 | M4–M12 | The "we load your book" step is staffed, not free |
| Contingency | 150,000 | — | |
| **Total** | **2,650,000** | | Implied blended CAC: ≤ Rs 30K per paying account at 40 customers (matches A7 target ±20%) |

---

## 7. Milestone Metrics by Quarter

| Quarter | Trials started | Ending paying | MRR (Rs) | Channel mix requirement | Learning goal |
|---|---|---|---|---|---|
| Q1 (M1–3) | 15–20 (founder-led) | 6 | ~85K | 100% field | 20 discovery calls; ICP size/turnover assumptions validated or replaced; 2 named case studies drafted |
| Q2 (M4–6) | 24 (8/mo) | 14 | ~200K | ≥30% association-sourced | First association workshop held; day-11 payment-call script standardized; trial→paid actual vs 33% assumption measured |
| Q3 (M7–9) | 36 (12/mo) | 24 | ~340K | ≥20% paid social; ≥20% referral | Paid-social trial-CAC benchmark (kill/keep at Rs 15K); 1 dealer-partner pilot signed |
| Q4 (M10–12) | 54 (18/mo) | 40 | ~550K | ≥30% non-field (social+referral+partners) | Churn baseline (3-month logos); gateway enablement decision (auto-approval vs manual); Y2 hiring triggers checked (50 tenants) |

**North-star metric: count of customers with ≥2 active projects who renew once.** Proxy metrics: weekly site-report submissions per tenant (engagement), material IN/OUT entries per tenant (lock-in depth), payment-on-time rate (health). If tenants aren't logging weekly data by day 8 of trial, conversion assumptions are wrong regardless of channel spend — this is the single instrumented early-warning the plan depends on, and it is queryable from the product's metrics endpoints. [1]

---

## 8. What Would Make Us Stop / Pivot the GTM

- Trial→paid conversion < 15% after 30 trials with loaded data → problem is willingness-to-pay, not channel; move to per-site pricing experiments.
- 3-month logo churn > 35% → product tied to project gaps; accelerate 6/12-month prepaid mix before adding spend.
- Paid-social qualified-trial CAC > Rs 25K through M9 → cut to zero, double down on field + associations (the original assumption set already carries this).

---

## 9. Sources & Cross-References

1. ConstructOps repo: `backend/src/utils/subscription.util.js` (plans/prices/limits), `backend/src/controllers/auth.controller.js` (15-day trial at signup), `backend/src/middleware/auth.middleware.js` (expiry suspension message), `backend/src/middleware/planLimit.middleware.js`, `backend/src/controllers/subscription.controller.js` (plans endpoint, payment submission, admin approve), `backend/README.md` (manual vs gateway payment flow, HMAC webhook) — all funnel mechanics described above are existing behavior, not roadmap
2. `backend/docs/BUSINESS_MODEL.md` — tier hypothesis (Rs 15K/45K/120K), CAC target Rs 25,000, problem/loss quantification
3. DataReportal / We Are Social, "Digital 2026: Pakistan" — 52.9M Facebook users, 117M internet users (channel-size evidence) — datareportal.com/reports/digital-2026-pakistan
4. `backend/docs/FINANCIAL_PROJECTIONS.md` and `backend/docs/MARKET_ANALYSIS.md` (same folder) — budget/revenue/SOM alignment; USD conversion at Rs 282/USD per SBP open-market reference (sbp.org.pk/economic-data/open-market-closing-exchange-rates)
