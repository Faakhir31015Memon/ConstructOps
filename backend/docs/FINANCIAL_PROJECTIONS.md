# FINANCIAL PROJECTIONS — CONSTRUCTOPS (3-YEAR)

**Prepared for investors. Single-founder pre-seed baseline. All figures are assumptions-driven projections, not guidance.** Nothing in this document is historical actuals except implemented pricing and known fixed costs.

> **Convention:** PKR primary; USD shown at **Rs 282/USD** (illustrative SBP open-market rate, Oct 2026 — reconfirm before use; PKR/USD has moved >20% over the past 5 years, so USD figures are a convenience translation, not a functional currency for this business). [1]

---

## 1. Pricing Basis (as implemented, not hypothetical)

The model uses the **live product prices in code** (`backend/src/utils/subscription.util.js`), which are more conservative than the tier hypothesis in `backend/docs/BUSINESS_MODEL.md`: [2][3]

| Plan (live) | Price PKR | Duration | Effective monthly | Limits (projects/users) |
|---|---|---|---|---|
| Free trial | 0 | 15 days | 0 | 2 / 3 |
| 1 Month | 15,000 | 30 days | 15,000 | 5 / 15 |
| 6 Months | 75,000 | 180 days | 12,500 | 8 / 25 |
| 12 Months | 135,000 | 365 days | 11,250 | 15 / 50 |
| Professional / Enterprise (hypothesis, NOT built) | 45,000/mo · 120,000+/mo | — | — | Upsell path, excluded from model |

Blended ARPA (assumed mix 60% monthly / 30% six-month / 10% annual): **Rs 165,000/yr = Rs 13,750/month.** Prepaid tiers mean ~40% of revenue is collected ahead of recognition — working-capital positive, shown in Section 6.

---

## 2. Core Assumptions (explicit)

**[ASSUMPTION-DRIVEN — every line below is a stated assumption, to be replaced by actuals quarterly]**

| # | Assumption | Value | Basis |
|---|---|---|---|
| A1 | Trial signups/month | Y1: 5→18 ramp; Y2: 25→40; Y3: 40→55 | GTM capacity (founder-led → 2-person sales); ~2,500 trials cumulative over 3 yrs |
| A2 | Trial→paid conversion | 33% | Manual, high-touch activation (admin verifies bank slip); conservative vs SMB SaaS self-serve norms |
| A3 | Monthly-tier logo churn | 6%/month | Churn risk tied to project gaps (documented risk in MARKET_ANALYSIS.md) |
| A4 | 6-month tier non-renewal | 50% at term end (≈ 5.6%/mo equivalent during prepaid term) | Prepaid behavior |
| A5 | 12-month tier non-renewal | 30% at term end | Prepaid behavior |
| A6 | Blended MRR-weighted churn | 4.5–5.5%/month; model uses **5%** | Derived from A3–A5 and mix |
| A7 | CAC | Rs 25,000 blended (marketing + field sales, Y1–Y3) | BUSINESS_MODEL.md target; Y1 actual modeled at Rs 27,900 incl. trial-generation spend |
| A8 | Gross margin | 85% (Y1) → 88% (Y3) | Section 4 |
| A9 | Payment processing cost | Rs 0 on bank transfer; ~3% MDR on wallet-gateway volume (assumed 40% of collections once gateway keys enabled) | JazzCash/Easypaisa gateway is env-flag only today; manual flow dominates Y1 | [4] |
| A10 | ARPA inflation | Flat for 3 years (no price increase assumed) | Conservative; PKR inflation would normally force annual repricing — flagged as upside/risk |
| A11 | Collection slippage | None modeled (prepaid enforcement via auto-suspension at term end) | Product behavior: expired accounts suspend until payment — hard stop on revenue leakage | [2] |

---

## 3. Subscriber Cohort Model

**End-of-quarter paying accounts** (monthly detail where it drives cash):

| Quarter | New paid from trial | Churn (logos) | Ending accounts | Ending ARR (Rs) | Ending ARR (USD) |
|---|---|---|---|---|---|
| Y1 Q1 | 6 | 0 | 6 | 1.0 M | 3.5 K |
| Y1 Q2 | 10 | 2 | 14 | 2.3 M | 8.2 K |
| Y1 Q3 | 13 | 3 | 24 | 4.0 M | 14 K |
| Y1 Q4 | 19 | 3 | 40 | 6.6 M | 23 K |
| Y2 Q1 | 19 | 4 | 55 | 9.1 M | 32 K |
| Y2 Q2 | 25 | 5 | 75 | 12.4 M | 44 K |
| Y2 Q3 | 31 | 6 | 100 | 16.5 M | 58 K |
| Y2 Q4 | 36 | 6 | 130 | 21.5 M | 76 K |
| Y3 Q1 | 38 | 18 | 150 | 24.8 M | 88 K |
| Y3 Q2 | 42 | 17 | 175 | 28.9 M | 102 K |
| Y3 Q3 | 46 | 21 | 205 | 33.8 M | 120 K |
| Y3 Q4 | 53 | 18 | 240 | 39.6 M | 140 K |

Month-12 detail (the critical months): trial starts at 5/mo (M1–M3), 8/mo (M4–M6), 12/mo (M7–M9), 18/mo (M10–M12); at 33% conversion that yields 2, 3, 4, 6 new paid accounts per month — 43 gross adds, net 40 after churn on the small base. **Every month of Y1 is a founder-led-sales month; no paid-ads dependency is assumed before M7.**

---

## 4. Unit Economics & Gross Margin

Per paying customer, per month (PKR):

| Line | Amount | Note |
|---|---|---|
| Blended MRR | 13,750 | Section 1 mix |
| Shared infra (VPS + MongoDB Atlas + backups/CDN) | ~800 | Fixed-cost platform: ~Rs 35–45K/mo covers the first ~100 tenants; per-tenant cost falls as we scale |
| AI assistant | 0–250 | Default deterministic engine = Rs 0 marginal; LLM mode used by a minority of tenants, capped by prompt budget | [5] |
| Payment MDR (blended) | ~165 | 3% × 40% of collections (A9) |
| Support/consumables direct | ~300 | Onboarding calls, exports, email |
| **Total COGS** | **~1,500** | |
| **Gross profit** | **12,250 → GM ≈ 85% (Y1), 88% (Y3 as mix shifts to prepaid)** | BUSINESS_MODEL.md target >80% — met | [3] |

**LTV / CAC:** contribution Rs 12,250/mo × expected lifetime 20 months (5% blended churn) = **LTV ≈ Rs 245,000**; CAC Rs 25,000 → **LTV:CAC ≈ 9.8x**. At 7% churn (lifetime ~14 mo) → LTV Rs 171,500 → **6.9x**. Both clear the 4.5x target. [3] **CAC payback: ~2.1 months** of gross margin. (We treat 9.8x as model-optimistic until churn actuals exist at M9.)

---

## 5. P&L — Annual Summary (quarterly in Section 6)

| PKR millions | Y1 | Y2 | Y3 |
|---|---|---|---|
| Revenue | 2.64 | 13.0 | 29.5 |
| COGS | 0.55 | 1.35 | 3.42 |
| **Gross profit** | **2.09 (79%)** | **11.65 (90%*)** | **26.06 (88%)** |
| Salaries & contractors | 1.80 | 4.50 | 8.60 |
| Marketing & field sales | 1.20 | 2.40 | 4.00 |
| Tools, software, comms | 0.30 | 0.50 | 0.70 |
| Legal, accounting, admin | 0.35 | 0.70 | 0.90 |
| Travel / demo / events | 0.45 | 0.80 | 1.00 |
| Office & misc | 0.30 | 0.50 | 0.50 |
| **EBITDA** | **-2.01** | **+2.25** | **+10.36** |
| EBITDA margin | — | 17% | 35% |

*Y1 gross margin reads below the 85% steady state because fixed platform cost sits against a tiny base; this is a scale effect, not a pricing problem.

USD equivalents at Rs 282/USD: Y1 revenue ≈ $9.4K; Y2 ≈ $46K; Y3 ≈ $105K; Y3 exit ARR ≈ $140K. **Stated plainly: this is a small-absolute-revenue PKR business that is nonetheless real, cash-generative, and the beachhead for a 60K-firm market** — the investor case is unit economics + expansion path (other metros, Professional/Enterprise tiers, MENA), not near-term USD scale.

---

## 6. Quarterly P&L and Break-even

EBITDA by quarter (Rs millions):

| | Q1 | Q2 | Q3 | Q4 | Year |
|---|---|---|---|---|---|
| Y1 | -0.90 | -0.50 | -0.35 | -0.26 | -2.01 |
| Y2 | -0.73 | -0.01 | +0.93 | +2.06 | +2.25 |
| Y3 | +1.00 | +1.93 | +3.06 | +4.39 | +10.36 |

- **Cumulative cash breakeven: months 22–24** (end of Y2 Q4 the cumulative P&L turns positive: -1,980 → +276K). Prepaid 6/12-month collections make cash position lead P&L from Y1 Q4 onward (A11).
- **Total 3-year funding need at this plan: ≈ Rs 5–7 million (≈ USD 18–25K) plus buffer**, covering Y1 loss and the Y2 hiring ramp before self-funding. This is consistent with a Pakistan pre-seed envelope; a smaller/no raise version simply delays Y2 hires by 2–3 quarters.

---

## 7. Headcount Plan

| When | Role | Cost (PKR/mo) | Trigger to hire |
|---|---|---|---|
| Now | Founder (full stack: product/sales/delivery) | stipend 120–150K | — |
| M6–M12 | Contract dev support (fractional) | 30–50K | >25 tenants or export/AI bug queue growth |
| M14–M15 | Full-stack engineer #1 | 110K | >50 paying OR churn signals from slow fixes |
| M17–M20 | Field sales AE #1, Lahore | 70K + commission | Y2 Q1 trial pipeline ≥ 25/mo |
| M24 | Field sales AE #2, Karachi | 70K + commission | 100 paying; CAC payback < 4 mo sustained |
| M28 | Customer success rep (Urdu-first) | 100K | >150 paying; NPS program live |
| M33 | Junior engineer #2 | 80K | Enterprise-tier discovery (custom exports) |

Gross people cost included in Section 5: Y1 Rs 1.8M; Y2 Rs 4.5M; Y3 Rs 8.6M.

---

## 8. Sensitivity — Y3 Exit ARR (Rs millions)

Trials held constant at A1; conversion (A2) × blended churn (A6):

| Churn ↓ / Conversion → | 23% | 33% (base) | 43% |
|---|---|---|---|
| 3%/mo | 50.6 | 54.9 | 59.8 |
| 5%/mo (base) | 36.3 | **39.6** | 43.2 |
| 7%/mo | 26.4 | 29.2 | 32.3 |

Readings:
- **Downside case (7% churn / 23% conv): Y3 exit ARR Rs 26–29M still breaks even in Y2** — the cost base flexes (defer AE#2), so downside is slower growth, not insolvency.
- **Upside is not free:** higher conversion assumes trial capacity (A1) scales — i.e., it needs the sales hires at the stated triggers.
- Single biggest swing factor is **churn**, consistent with the project-gap churn risk in MARKET_ANALYSIS.md §7. Mitigation embedded in pricing: prepaid 6/12-month tiers convert churn risk into working capital.

Second sensitivity (pricing lever, held out of base case): a 20% price increase at Y2 start (PKR-inflation-normal) adds ≈ Rs 4.5M to Y3 exit ARR without changing any funnel assumption — flagged as deliberate conservatism (A10).

---

## 9. What We Are NOT Claiming

- No enterprise deals, Procore-displacement revenue, or MENA revenue in these numbers.
- No build cost for the Professional (Rs 45K) / Enterprise (Rs 120K+) tiers from the BUSINESS_MODEL hypothesis — they are excluded until shipped and validated. [3]
- No working-capital facility, receivables, or FX-hedged assumptions.
- Churn/conversion figures are prior guesses until 2 quarters of actuals exist; the model's discipline is that all four funnel inputs (A1–A6) are measurable from the product's own metrics endpoints as soon as tenants are live.

---

## 10. Sources & Cross-References

1. State Bank of Pakistan, Open Market Closing Exchange Rates — sbp.org.pk/economic-data/open-market-closing-exchange-rates (conversion convenience only)
2. ConstructOps repo: `backend/src/utils/subscription.util.js` (PLAN_PRICES, PLAN_LIMITS, trial duration); `backend/src/middleware/auth.middleware.js` (expiry suspension flow); `backend/src/controllers/auth.controller.js` (15-day trial on signup) — implemented pricing and enforcement, single source of truth
3. ConstructOps `backend/docs/BUSINESS_MODEL.md` — tier hypothesis, CAC Rs 25,000 target, LTV/CAC >4.5x target, GM >80% target
4. JazzCash gateway scale (rail availability for future automated collection): 60M+ registered customers, PKR 16.8T annual GTV — jazzcash.com.pk/news (May 2026); Easypaisa comparable scale — Easypaisa Digital Bank FY2025 disclosures
5. ConstructOps repo: `backend/src/services/assistant.service.js` + README (AI assistant falls back to a deterministic zero-API-cost engine when no model keys are set — the basis for the Rs 0–250 AI COGS line)
6. MARKET_ANALYSIS.md (same folder) — churn-risk context, firm universe, SAM/SOM alignment (this model's 40/130/240 accounts = its SOM table)
