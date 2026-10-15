# PayDesk HRMS — Backend Requirements Specification

## 1. Goal & Scope
The PayDesk backend is an enterprise-grade RESTful API built with **Node.js, Express.js, and MySQL (Sequelize ORM)**. It serves as the single source of truth for managing employee records, statutory compensation structures, revisions, payroll cycles, and analytics for an organization with **10,000+ employees across multiple global jurisdictions**.

### 1.1 Problem Statement
The organization previously tracked 10,000 employee salaries, allowances, and statutory deductions in disconnected Excel spreadsheets. This caused:
- Calculation errors and floating-point formula drift.
- Lack of audit trails for salary revisions and one-time bonuses.
- Inability to answer high-level compensation questions in real time.
- Slow, manual payslip generation and report preparation.

The backend replaces these manual workflows with transactional APIs, automated statutory Indian payroll formulas, audit logging, and natural-language AI query answering.

---

## 2. Target User Persona & Access Control
- **Target Persona**: **HR Manager of the Organization**
- **Security Boundary**: All operational compensation, salary revision, structure update, and deletion endpoints require authentication under the `HR_MANAGER` role.
- **Auditing**: Every salary revision, increment, and employee deletion logs immutable records into the `audit_logs` table.

---

## 3. Core Functional Requirements

### 3.1 Authentication & Session Management
- Dual-mode JWT authentication: validates tokens from either `Authorization: Bearer <token>` or the HTTP-only `paydesk_token` cookie.
- Bcrypt-hashed password storage (cost factor 10).
- Immediate session hydration returning `{ success: true, data: { user, token } }`.

### 3.2 10,000+ Employee Registry (`/api/v1/employees`)
- Full CRUD operations with server-side pagination (`limit` & `offset`).
- Fast multi-column filtering by search term (first name, last name, employee code), department, country, and employment status.
- Transactional cascading deletion (`DELETE /employees/:id`) that cleans up child records in foreign key order without locking errors.

### 3.3 Statutory Compensation Engine (`/api/v1/salaries`)
- Single source of truth for all compensation formulas:
  - Monthly Basic = Annual Base / 12
  - HRA = 40% of Basic
  - Special Allowance = 20% of Basic
  - Gross Earnings = Basic + HRA + Special Allowance + Bonus/Increment
  - EPF = 12% of Basic
  - Professional Tax = ₹200.00 / month flat
  - Health Insurance = ₹120.00 / month flat
  - Loss of Pay (LOP) = `(Basic / 30) * Unpaid Leave Days`
  - Net Take-Home Pay = Gross Earnings - Total Deductions

### 3.4 Compensation Revisions & Increments (`/api/v1/salaries/revise`)
- **Annual Base Revision (`increment_type: 'annual'`)**: Permanently raises annual base salary, recalculating allowances and future statutory deductions.
- **Monthly Increment (`increment_type: 'monthly'`)**: Credits an increment to that specific month's payroll without altering the permanent annual base salary.

### 3.5 High-Fidelity Salary Slips (`/api/v1/payroll/payslip/:id/download`)
- Sends an official, standalone styled HTML salary slip with corporate branding, itemized earnings, and statutory deductions.
- Designed for offline viewing and browser print-to-PDF.

### 3.6 Multi-Format Streaming Exporter (`/api/v1/export/...`)
- Instant streaming exports for Salaries, Employees, and Audit Logs in CSV, Excel-compatible TSV, and printable HTML.

### 3.7 AI Compensation Assistant (`/api/v1/ai/ask`)
- Natural-language query interface powered by Google Gemini with live database context injection and quota resilience.

---

## 4. What Was Deliberately Left Out & Rationale
1. **Direct Automated Bank Clearing (ACH / NEFT API integrations)**:
   - *Rationale*: Direct bank execution requires banking escrows and merchant KYC. Providing verified payment references and export files (CSV/Excel) for batch upload into corporate banking portals is the standard HRMS boundary.
2. **Multi-Tenant SaaS Partitioning**:
   - *Rationale*: The requirement specifies "for an organization with 10,000 employees" and the "HR Manager of the org". Multi-tenant isolation adds schema bloat without value to this persona.
3. **Biometric Hardware Integrations**:
   - *Rationale*: Real-time biometric attendance syncing is an operational facility concern. The backend models the HR compensation boundary by applying LOP deductions based on unpaid leave days.
