# SYSTEM ARCHITECTURE — CONSTRUCTOPS
**Architecture Pattern:** Multi-Tenant Modular Monolith / Microservices-Ready SaaS  
**Version:** 1.0.0  

---

## 1. System Topology

```
                  +-----------------------------------+
                  |        React SPA Client           |
                  |     (Vite + React Router)         |
                  +-----------------+-----------------+
                                    |
                           HTTPS / REST (JWT)
                                    |
                  +-----------------v-----------------+
                  |      Express.js API Gateway       |
                  |  (CORS, Morgan, Tenant Isolation) |
                  +-----------------+-----------------+
                                    |
         +--------------------------+--------------------------+
         |                          |                          |
+--------v-------+          +-------v-------+          +-------v-------+
|  Auth Service  |          | Project Svc   |          | Ops & Ledger  |
| (JWT, RBAC)    |          | (CRUD, Scope) |          | (Exp, Mat)    |
+----------------+          +---------------+          +---------------+
         |                          |                          |
         +--------------------------+--------------------------+
                                    |
                  +-----------------v-----------------+
                  |         MongoDB Atlas             |
                  |     (Mongoose ORM Schemas)        |
                  +-----------------------------------+
```

---

## 2. Multi-Tenancy Architecture

### 2.1 Tenant Model
- ConstructOps operates on a **Logical Multi-Tenancy (Row-Level Security)** model.
- Each construction organization possesses a unique `Company` record (`_id`).
- All tenant users (`User`) are bound to their organization via `companyId`.
- Projects (`Project`) are explicitly tagged with `companyId`.
- Sub-resources (Workers, Materials, MaterialLogs, Expenses, DailyReports, Alerts) are scoped by `projectId` which inherits strict verification against the caller's `companyId`.

### 2.2 Role-Based Access Control (RBAC) Matrix

| Resource / Action | System Admin | Company Owner | Project / Site Manager | Accountant |
|---|---|---|---|---|
| **Platform Analytics & User Bans** | Read / Write | Denied | Denied | Denied |
| **Company Settings & Members** | Read / Write | Read / Write | Denied | Denied |
| **Project Creation & Deletion** | Read / Write | Create / Delete | Create (No Delete) | Read Only |
| **Expense Recording & Auditing** | Read Only | Full Access | Read Only | Create / Update |
| **Worker Roster & Daily Attendance** | Read Only | Full Access | Full Access | Read Only |
| **Material Catalog & IN/OUT Logs** | Read Only | Full Access | Full Access | Read Only |
| **Daily Site Logs & Reports** | Read Only | Full Access | Full Access | Read Only |

---

## 3. Storage & Persistence Layout
- **Database Engine:** MongoDB 6.0+ / 8.0+ Compatible.
- **ORM:** Mongoose with schema validation, compound indexes for idempotency, and pre-save password encryption via `bcryptjs`.
- **Indexing Rules:**
  - `Attendance`: `{ workerId: 1, date: 1 }` (Unique compound index preventing double logging).
  - `Material`: `{ projectId: 1, name: 1 }` (Unique compound index per project).
  - `User`: `{ email: 1 }` (Unique index).
  - `Project`: `{ companyId: 1 }` (Index for high-efficiency tenant scoping).
