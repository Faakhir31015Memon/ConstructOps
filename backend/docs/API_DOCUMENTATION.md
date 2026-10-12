# API DOCUMENTATION & CONTRACTS — CONSTRUCTOPS
**Base Path:** `/api/v1`  
**Authentication:** Bearer Token (JWT Header: `Authorization: Bearer <TOKEN>`)  
**Standard Response Shape:**
```json
{
  "success": true,
  "data": { ... } // or entity key e.g. "projects", "expense"
}
```
**Standard Error Shape:**
```json
{
  "success": false,
  "message": "Human readable error description"
}
```

---

## 1. Authentication Endpoints (`/auth`)

### 1.1 Register Company & Owner
- **POST** `/auth/register`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@contractor.com",
    "password": "Password123",
    "companyName": "Apex Builders Ltd"
  }
  ```
- **Response (201):**
  ```json
  {
    "success": true,
    "user": { "_id": "...", "name": "Jane Doe", "email": "jane@contractor.com", "role": "owner", "companyId": "..." },
    "token": "eyJhbGciOi..."
  }
  ```

### 1.2 User Login
- **POST** `/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "jane@contractor.com",
    "password": "Password123"
  }
  ```
- **Response (200):** Same user and JWT payload.

---

## 2. Project Management (`/projects`)

### 2.1 List Company Projects
- **GET** `/projects`
- **Access:** Private (All roles within tenant)
- **Response (200):** Array of tenant-owned projects.

### 2.2 Create Project
- **POST** `/projects`
- **Access:** Private (`owner`, `manager`)
- **Request Body:**
  ```json
  {
    "name": "Gulberg Residency Tower",
    "location": "Lahore, Block D",
    "budget": 45000000,
    "startDate": "2026-11-01",
    "endDate": "2027-12-31"
  }
  ```

### 2.3 Get Project Dashboard Analytics
- **GET** `/projects/:id/dashboard`
- **Access:** Private (Verified tenant only)
- **Response (200):** Detailed KPIs including total spent, progress, active workers, latest site reports, and expense breakdown by category.

---

## 3. Financial Ledger (`/expenses`)

### 3.1 Record Project Expense
- **POST** `/expenses`
- **Access:** Private (`owner`, `accountant`)
- **Request Body:**
  ```json
  {
    "projectId": "664b...",
    "category": "material",
    "amount": 125000,
    "description": "50 bags DG Khan cement delivery",
    "date": "2026-10-15"
  }
  ```
- **Behavior:** Validates project belongs to caller's company, records ledger entry, recalculates total project spent atomically, and fires budget overrun alerts if budget threshold exceeded.

---

## 4. Workforce & Attendance (`/workers`)

### 4.1 Register Worker
- **POST** `/workers`
- **Access:** Private (`owner`, `manager`)
- **Fields:** `projectId`, `name`, `role`, `dailyWage`, `phone`.

### 4.2 Submit Attendance Check-In
- **POST** `/workers/attendance/check-in`
- **Access:** Private (`owner`, `manager`)
- **Fields:** `workerId`, `projectId`, `date`, `status` (`present` | `absent`).

---

## 5. Inventory & Materials (`/materials`)

### 5.1 Define Material
- **POST** `/materials`
- **Access:** Private (`owner`, `manager`)
- **Fields:** `projectId`, `name`, `unit`.

### 5.2 Log Stock Movement (IN / OUT)
- **POST** `/materials/log`
- **Access:** Private (`owner`, `manager`)
- **Fields:** `projectId`, `materialId`, `type` (`IN` | `OUT`), `quantity`, `note`.
- **Auditing:** Adjusts stock levels; automatically flags high severity alerts if balance drops into negative discrepancy.

---

## 6. Report Exports (`/export`)

Both endpoints stream a generated file instead of the standard JSON shape, so error responses are the only JSON payloads on these routes.

### 6.1 Full Project Report
- **GET** `/export/projects/:id/:format`
- **Access:** `owner`, `manager`, `accountant` of the project's company; `contractor` only with an active `ProjectAssignment`; admin bypass. Route guard: `protect` + `checkProjectAccess()`.
- **`format`:** `xlsx` | `pdf` (anything else → `400`).
- **Contents (Excel, one sheet per section):** Summary, Contractors, Milestones, Labour, Attendance, Materials, Material movement, Expenses, Contractor payments, Daily reports, Site Photos, Alerts, Export notes.
- **Contents (PDF, A4 landscape):** same data as narrative sections plus photo blocks.

### 6.2 Company-Wide Report
- **GET** `/export/company/:format`
- **Access:** Private (`protect`); scoped to the caller's own company — an owner gets every project in the company, a contractor only their assigned ones.
- **Sheets:** Summary, Projects, Contractor to project, Milestones, Workers, Materials, Expenses, Contractor payments, Daily reports.

### 6.3 Response Headers
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | application/pdf
Content-Length: <bytes>
Content-Disposition: attachment; filename="<slug>-<YYYY-MM-DD>.<ext>"; filename*=UTF-8''<same>
Cache-Control: no-store
X-Export-Warnings: <count>
```

### 6.4 Known Export Limits
- Site photos are embedded only when stored as base64 data URIs (`png`/`jpg`/`gif`). Remote `http(s)` image links are listed as hyperlinks, never fetched server-side (SSRF avoidance).
- Embed ceilings: 12 MB / 80 images per workbook; 8 MB / 24 images per PDF; PDF hard-caps at 120 pages. Skipped items are reported in the "Export notes" sheet and `X-Export-Warnings`.
- The PDF uses WinAnsi standard fonts, so non-Latin script (e.g. Urdu descriptions) is replaced by a `[N non-Latin characters - full text in the Excel file]` marker. Excel keeps the original text.
- Projects with no daily reports or no images export normally with those sections empty.
