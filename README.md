# PayDesk HRMS — Backend API Server


---

## Technical Documentation (`docs/`)

Comprehensive architectural and engineering documentation is available in the [`docs/`](docs/README.md) directory:

- [Requirements Specification](docs/requirements.md) — Scope, user personas, acceptance criteria, and deliberate non-goals.
- [Project Planning](docs/project-planning.md) — Agile sprint breakdown, implementation phases, and delivery milestones.
- [Backend Architecture & Diagrams](docs/architecture.md) — Layered CSR pattern, transaction boundaries, request lifecycle sequence diagram, and component map.
- [Database Design & ER Diagram](docs/database-design.md) — All 7 tables, schema dictionary, indexes, constraints, and visual Mermaid ER model.
- [API Documentation](docs/api-documentation.md) — RESTful endpoints, parameters, payloads, and responses.
- [10k Seeding & Performance](docs/seeding-and-performance.md) — Chunked transaction seeder, MySQL indexing, and query tuning.
- [Testing Strategy](docs/testing.md) — Jest unit, integration, and controller test architecture (14 test suites).
- [AI Prompts & Guidelines](docs/ai-prompts.md) — Prompts or instructions used with AI tools.
- [Development Notes](docs/development-notes.md) — Technical trade-offs, bug resolutions, and architectural decisions.
- [Deployment Guide](docs/deployment.md) — Environment variables, database migration, and Render web service setup.

---

## Architecture & Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Runtime** | Node.js (v18+) |
| **Framework** | Express.js (RESTful JSON APIs) |
| **Database** | MySQL 8.0+ |
| **ORM** | Sequelize (strict associations, snake_case table columns, camelCase models) |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`), bcrypt password hashing, HTTP-only cookies |
| **Testing** | Jest v29 & Supertest (14 suites, 50 tests, 100% pass) |
| **AI Integration** | Groq SDK (`openai/gpt-oss-120b`) for contextual compensation analytics |

---

## Directory Structure

```text
paydesk-backend/
├── docs/                               # Comprehensive project documentation
│   ├── ai-prompts.md                   # Prompts or instructions used with AI tools
│   ├── api-documentation.md            # RESTful API specifications & response schemas
│   ├── architecture.md                 # Layered CSR pattern, transaction rules, & Mermaid diagrams
│   ├── database-design.md              # 7-table schema, data dictionary, & visual Mermaid ER diagram
│   ├── deployment.md                   # Production deployment guide for Render & MySQL
│   ├── development-notes.md            # Technical trade-offs, bug fixes, & architecture decisions
│   ├── project-planning.md             # Development plan, sprint breakdown, & milestones
│   ├── requirements.md                 # Product requirements, 10k employee scope, & non-goals
│   ├── seeding-and-performance.md      # Chunked bulk seeder & MySQL query optimization
│   └── testing.md                      # Backend testing strategy, controller tests, & error masking
├── src/                                # Application source code
│   ├── config/                         # Database connection & Sequelize configuration
│   │   └── database.js                 # MySQL connection pool configuration
│   ├── controllers/                    # HTTP request handlers & response orchestration
│   │   ├── __tests__/                  # Controller unit tests (employee, salary, auth, analytics)
│   │   ├── analyticsController.js      # Dashboard KPI aggregation & spend analytics
│   │   ├── authController.js           # Login, logout, getMe, & session tokens
│   │   ├── employeeController.js       # Employee CRUD, search, pagination, & cascading delete
│   │   └── salaryController.js         # Salary directory, revision, increments, & slip export
│   ├── middlewares/                    # Express middlewares
│   │   ├── __tests__/                  # Middleware tests (auth, validation, errors)
│   │   ├── authMiddleware.js           # Dual-token verification (Bearer/cookie) & role guards
│   │   ├── errorHandler.js             # Global unhandled error middleware
│   │   └── validateMiddleware.js       # Joi/express validation guards
│   ├── models/                         # Sequelize ORM schema definitions & relationships
│   │   ├── __tests__/                  # Schema association & constraint tests
│   │   ├── AuditLog.js                 # Audit trail model
│   │   ├── Employee.js                 # Employee profile model
│   │   ├── PayrollDeduction.js         # Itemized statutory deductions model
│   │   ├── PayrollRecord.js            # Monthly payroll cycle model
│   │   ├── Role.js                     # User role model
│   │   ├── SalaryRecord.js             # Salary structure revision history model
│   │   ├── User.js                     # Authenticated user account model
│   │   └── index.js                    # Model registry & foreign key associations
│   ├── routes/                         # Express API route declarations
│   │   ├── __tests__/                  # Route integration & validation tests
│   │   ├── analyticsRoutes.js          # /api/v1/analytics
│   │   ├── authRoutes.js               # /api/v1/auth
│   │   ├── employeeRoutes.js           # /api/v1/employees
│   │   ├── healthRoutes.js             # /api/v1/health
│   │   └── salaryRoutes.js             # /api/v1/salaries
│   ├── services/                       # Core domain business logic
│   │   ├── __tests__/                  # Service unit tests (calculation, employee, auth)
│   │   ├── authService.js              # Credentials validation & token minting
│   │   ├── employeeService.js          # 10k employee queries & cascading transaction delete
│   │   └── salaryService.js            # Statutory compensation math, LOP, & revisions
│   ├── utils/                          # Cross-cutting utility modules
│   │   ├── __tests__/                  # Utility tests (errorResponse, token, cookie)
│   │   ├── auditLogger.js              # Audit trail logger helper
│   │   ├── cookie.js                   # HTTP-only secure cookie generator
│   │   ├── errorResponse.js            # Sanitizes database errors into user-friendly messages
│   │   └── token.js                    # JWT signing & verification
│   ├── app.js                          # Express app configuration, CORS, & middleware chain
│   └── server.js                       # HTTP server entry point & port listener
├── scripts/                            # Database management & seed scripts
│   └── seedEmployees.js                # High-speed chunked seeder for 10,000 employees
├── .env.example                        # Example environment variables template
├── package.json                        # Node dependencies & script commands
└── README.md                           # Backend project overview & setup guide
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
