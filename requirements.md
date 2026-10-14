# PayDesk HRMS — Backend Architecture & Requirements Specification

## 1. System Overview & Architectural Principles
PayDesk HRMS is an enterprise-grade Human Resource & Compensation Management system.

- **Core Technologies**: Node.js, Express.js (CommonJS), MySQL 8.0+, Sequelize ORM.
- **Single Source of Truth**: All salary calculations, statutory deductions, Loss of Pay (LOP), bonuses, increment adjustments, and export formats are strictly executed on the backend.
- **Role-Based Authorization**: Managed strictly under the `HR_MANAGER` role. All operational compensation and salary structure routes require active HR authentication.
- **ACID Transactions**: All multi-table operations (such as cascading employee deletion, salary revisions, and deduction synchronization) execute inside managed Sequelize database transactions.

---

## 2. Authentication & Session Persistence
- **Dual Token Acceptance**: Middleware (`authMiddleware.js`) validates JWT tokens from either `Authorization: Bearer <token>` or the HTTP-only `paydesk_token` cookie.
- **First-Login Resolution**: On login, `{ success: true, data: { user, token } }` is returned, guaranteeing immediate cross-origin API authorization without 401 delays.

---

## 3. Verified Compensation & Salary Calculation Engine

All compensation calculations follow the canonical statutory structure:

### 3.1 Earnings Breakdown
1. **Monthly Basic Pay**:
   $$\text{Monthly Basic} = \text{round}\left(\frac{\text{Annual Base Salary}}{12}\right)$$
2. **House Rent Allowance (HRA)**:
   $$\text{HRA} = \text{round}(\text{Monthly Basic} \times 0.40)$$
3. **Special Allowance**:
   $$\text{Special Allowance} = \text{round}(\text{Monthly Basic} \times 0.20)$$
4. **Total Allowances**:
   $$\text{Total Allowances} = \text{HRA} + \text{Special Allowance} \quad (\approx 60\% \text{ of Monthly Basic})$$
5. **Gross Monthly Earnings**:
   $$\text{Gross Earnings} = \text{Monthly Basic} + \text{Total Allowances} + \text{Performance Bonus / Monthly Increment}$$

### 3.2 Statutory Deductions & Loss of Pay (LOP)
1. **Employee Provident Fund (EPF)**:
   $$\text{EPF} = \text{round}(\text{Monthly Basic} \times 0.12)$$
2. **Professional Tax (PT)**: Flat statutory rate of ₹200.00 / month.
3. **Health & Medical Insurance Premium**: Corporate rate of ₹120.00 / month.
4. **Loss of Pay (LOP)**:
   $$\text{Per Day Rate} = \text{round}\left(\frac{\text{Monthly Basic}}{30}\right)$$
   $$\text{LOP Deduction} = \text{Per Day Rate} \times \text{Unpaid Leave Days}$$
5. **Total Monthly Deductions**:
   $$\text{Total Deductions} = \text{EPF} + \text{PT} + \text{Health Insurance} + \text{LOP}$$

### 3.3 Net Take-Home Pay
$$\text{Net Salary Payable} = \text{Gross Earnings} - \text{Total Deductions}$$

---

## 4. Implemented Modules & Features

### 4.1 Employee Salary Directory & Filtering (`/api/v1/salaries`)
- Retrieves paginated compensation records enriched with monthly calculations, LOP computations, and paid leave balances (Casual Leave, Sick Leave, Unpaid Leave).
- Supports real-time filtering by `month` (e.g., `2026-10`), `department`, and employee name/code `search`.
- Dynamic month calculation: seamlessly calculates prorated LOP and deductions for the selected month.

### 4.2 Salary Structure Management (`/api/v1/salaries/structure/:employee_id`)
- Generates or updates the verified component breakdown for any employee.
- Automatic deduction synchronization: creating or editing a salary structure immediately syncs standard statutory records into `payroll_deductions`.

### 4.3 Compensation Revisions & Monthly Increments (`/api/v1/salaries/revise`)
- **Annual Base Revision (`increment_type: 'annual'`)**: Updates the permanent annual base salary, recalculates statutory deductions, and logs audit events.
- **Monthly Increment ("This Month Only Increment", `increment_type: 'monthly'`)**:
  - The employee's annual base salary remains intact.
  - The increment amount (e.g. ₹5,000) is credited to that specific month's payroll (`PayrollRecord.bonus_amount`), directly boosting gross and net earnings for that month's salary slip.
  - Audit log records `action: 'SALARY_REVISED'`, `new_value: { monthly_increment: 5000 }`, displayed as `+₹5,000 (This Month)` instead of inflating base pay.

### 4.4 Resilient Salary Slips & History API (`/api/v1/payroll/payslip/...`)
- **Auto-Generation of Active Cycles**: In `getEmployeeHistory(employee_id)`, if an employee has zero payroll records, the backend automatically creates and persists the verified October 2026 `PayrollRecord` and itemized `PayrollDeduction` rows in MySQL.
- **Direct HTML Download (`GET /api/v1/payroll/payslip/:id/download`)**:
  - Sends a standalone, high-fidelity salary slip HTML document with official headers, company branding, itemized earnings, deductions, and net take-home pay.
  - Sets `Content-Disposition: attachment; filename="Salary_Slip_<Code>_<Month>_<Year>.html"`.
  - Includes fallback resolution for employee IDs or synthetic IDs to guarantee zero 404 download errors.

### 4.5 Robust Cascading Employee Deletion (`DELETE /api/v1/employees/:id`)
- Transactional deletion that cascades through child records in strict foreign key order:
  1. `payroll_deductions` (by `payroll_record_id` and by `employee_id`)
  2. `payroll_records`
  3. `salary_records`
  4. `audit_logs` (preventing `audit_logs_ibfk_2` constraint failures)
  5. `employees`
- Guarantees clean 200 OK deletion without database locking or foreign key exceptions.

### 4.6 Reporting & Export Engine (`/api/v1/export/...`)
- Comprehensive exports for `/export/salaries`, `/export/employees`, and `/export/audit-logs`.
- Supports formats:
  - **CSV**: RFC 4180 escaped CSV streams.
  - **Excel**: Tab-delimited `.xls` spreadsheets compatible with Microsoft Excel.
  - **PDF**: Standalone printable HTML report designed for instant browser print/PDF generation.

### 4.7 AI Salary Assistant (`/api/v1/ai/ask`)
- Natural-language compensation query assistant.
- Executes parameterized aggregation queries on live MySQL data (payroll totals, departmental stats, deduction ratios, bonus comparisons).
- Error-classified responses: handles `AI_QUOTA_EXHAUSTED` (HTTP 429), `AI_SERVICE_UNAVAILABLE`, and `INSUFFICIENT_DATA`.
