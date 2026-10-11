# SECURITY AUDIT & THREAT MODEL — CONSTRUCTOPS
**Classification:** Internal Security Baseline  
**Scope:** Identity, Tenant Boundaries, Injection Mitigation, API Attack Surfaces  

---

## 1. Threat Model & Risk Analysis

### 1.1 Tenant Boundary Violation (BOLA / IDOR)
- **Risk:** In multi-tenant systems, users from Organization A might guess or intercept IDs belonging to Organization B and read or mutate records.
- **Mitigation:**
  - Every resource lookup on mutating endpoints (`POST`, `PUT`, `DELETE`) verifies parent `Project` ownership against `req.user.companyId`.
  - Global lookups (`GET`) explicitly query `{ companyId: req.user.companyId }` or `{ projectId: { $in: companyProjectIds } }`.
  - System Administrator privileges (`role === 'admin'`) are strictly partitioned from regular tenants.

### 1.2 Authentication & Credential Integrity
- **Risk:** Token forging via fallback secrets, weak passwords susceptible to brute-force or dictionary attacks, stolen long-lived access tokens.
- **Mitigation:**
  - Fallback JWT secrets completely eliminated; server will not boot without explicit `JWT_SECRET`.
  - Password complexity: Minimum 8 characters, requiring at least one letter and one number.
  - Password hashing: `bcryptjs` with work factor 10.
  - Token validity: Access tokens restricted to 1-hour lifetime.

### 1.3 Injection & Parameter Tampering
- **Risk:** NoSQL operator injection (`$gt`, `$ne`, `$where`) in JSON payloads.
- **Mitigation:**
  - Mongoose typed schemas strictly cast all inputs.
  - Planned addition of request schema validation (Joi/Zod) to reject unexpected query parameters or operators.

### 1.4 Financial Tampering & Float Precision
- **Risk:** Client submitting arbitrary negative amounts, manipulating ledger sums, or floating-point rounding errors causing financial discrepancies.
- **Mitigation:**
  - Server-side calculation of `spent` counters from authoritative `Expense` collections.
  - Positive integer / minor unit enforcement on financial fields.

---

## 2. Hardening Action Items

| ID | Control | Standard / Target | Status |
|---|---|---|---|
| **SEC-AUD-01** | Mandatory JWT Secret Enforcement | OWASP ASVS 3.5 | **VERIFIED** |
| **SEC-AUD-02** | Registration Password Policy | OWASP ASVS 2.1 | **VERIFIED** |
| **SEC-AUD-03** | Server-Side Tenant Isolation | NIST SP 800-145 | **VERIFIED** |
| **SEC-AUD-04** | Rate Limiting on Auth Endpoints | OWASP Top 10 A07 | **SCHEDULED** |
| **SEC-AUD-05** | Helmet HTTP Security Headers | OWASP Top 10 A05 | **SCHEDULED** |
| **SEC-AUD-06** | CORS Restrictive Whitelisting | OWASP ASVS 14.4 | **SCHEDULED** |
