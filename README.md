# PayDesk HRMS — Backend API Server

PayDesk HRMS Backend is an enterprise compensation, payroll calculation, employee records, and compliance audit trail service built with Node.js, Express, and Sequelize ORM on MySQL 8.0+.

---

## Architecture & Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Runtime** | Node.js (v18+) |
| **Framework** | Express.js (RESTful JSON APIs) |
| **Database** | MySQL 8.0+ |
| **ORM** | Sequelize (strict associations, snake_case table columns, camelCase models) |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`), bcrypt password hashing, HTTP-only cookies |
| **AI Integration** | Groq SDK (`openai/gpt-oss-120b`) for contextual compensation analytics |

---

## Directory Structure

```
paydesk-backend/
├── src/
│   ├── config/             # Database connection & Sequelize configuration
│   ├── controllers/        # Route handlers (auth, employee, salary, payroll, export, ai)
│   ├── middlewares/        # Authentication, role validation, error handler
│   ├── models/             # Sequelize models (Employee, SalaryRecord, PayrollRecord, PayrollDeduction, AuditLog, User, Role)
│   ├── routes/             # Express API routes
│   ├── services/           # Business logic, calculations, database queries
│   ├── utils/              # Token generators, CSV parsers, helpers
│   ├── app.js              # Express app configuration & middleware mounts
│   └── server.js           # Server bootstrap and port listener
├── scripts/                # Database migrations, seeding scripts
├── .env                    # Environment configuration
└── requirements.md         # Detailed architectural requirements
```

---

## Database Models & Relationships

1. **`User` & `Role`**: System users (HR Managers) authenticating into the platform.
2. **`Employee`**: Core directory storing employee codes (`EMP-XXXXXX`), names, emails, departments, job titles, country, and currency.
3. **`SalaryRecord`**: Historical and active salary structures. Stores `base_salary`, `bonuses`, `deductions`, `net_salary`, `effective_date`, and revision `reason`.
4. **`PayrollRecord`**: Monthly payroll cycles (`payroll_month`, `payroll_year`). Stores `basic_salary`, `allowances`, `gross_salary`, `attendance_days`, `unpaid_leave_days`, `lop_deduction`, `statutory_deductions`, `bonus_amount`, and `net_salary`.
5. **`PayrollDeduction`**: Itemized deductions linked to employees and payroll runs (e.g., EPF, Professional Tax, Health & Medical Premium, Loss of Pay).
6. **`AuditLog`**: Compliance tracking for employee creation, deletion, salary revisions, and structure adjustments.

---

## Core Calculations

* **Monthly Basic**: $\text{Annual Base} / 12$
* **HRA (40%)**: $\text{Monthly Basic} \times 0.40$
* **Special Allowance (20%)**: $\text{Monthly Basic} \times 0.20$
* **Gross Earnings**: $\text{Basic} + \text{HRA} + \text{Special Allowance} + \text{Bonus / Monthly Increment}$
* **EPF (12%)**: $\text{Monthly Basic} \times 0.12$
* **Professional Tax**: ₹200.00 / month
* **Health Premium**: ₹120.00 / month
* **Loss of Pay (LOP)**: $(\text{Monthly Basic} / 30) \times \text{Unpaid Days}$
* **Net Salary**: $\text{Gross Earnings} - (\text{EPF} + \text{PT} + \text{Health} + \text{LOP})$

---

## API Endpoints

### Authentication (`/api/v1/auth`)
* `POST /login` — Login HR manager and issue JWT (returned in JSON and HTTP-only cookie).
* `POST /logout` — Invalidate session cookie.
* `GET /me` — Current authenticated user profile.

### Employee Directory (`/api/v1/employees`)
* `GET /` — List paginated employees with search, department, and country filters.
* `POST /` — Onboard new employee profile and create starting salary structure.
* `GET /:id` — Retrieve detailed employee profile.
* `DELETE /:id` — Transactional cascading delete removing child payroll deductions, payroll records, salary records, and audit logs.

### Salary Management (`/api/v1/salaries`)
* `GET /` — Paginated salary records enriched with monthly calculations, LOP, and leave details. Filterable by `month`, `department`, and `search`.
* `POST /revise` — Revise compensation:
  * `increment_type: 'monthly'` applies to this month's payroll without inflating base salary.
  * `increment_type: 'annual'` permanently updates base salary.
* `GET /structure/:employee_id` — Fetch verified salary structure and leave allowances.
* `PUT /structure/:employee_id` — Save/update salary structure components and sync deductions.
* `GET /history/:employee_id` — Historical compensation timeline and verified payroll history.

### Payroll & Salary Slips (`/api/v1/payroll`)
* `GET /records` — Paginated payroll records.
* `GET /payslip/:id` — Full itemized salary slip JSON details.
* `GET /payslip/:id/download` — Direct download of styled standalone `.html` salary slip with official branding and breakdown.

### Data Exports (`/api/v1/export`)
* `GET /salaries` — Export compensation records (formats: `csv`, `xlsx`, `pdf`).
* `GET /employees` — Export employee directory.
* `GET /audit-logs` — Export compliance audit logs.

### AI Assistant (`/api/v1/ai`)
* `POST /ask` — Natural language compensation questions answered via parameterized live database queries.

---

## Running Locally

1. **Install Dependencies**:
   ```bash
   cd paydesk-backend
   npm install
   ```
2. **Environment Variables (`.env`)**:
   ```env
   PORT=5000
   NODE_ENV=development
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_NAME=paydesk_db
   DB_USER=root
   DB_PASSWORD=your_password
   JWT_SECRET=your_jwt_secret
   CLIENT_URL=http://localhost:5173
   ```
3. **Start Development Server**:
   ```bash
   npm run dev
   ```
