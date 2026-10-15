# PayDesk HRMS — REST API Specification & Endpoint Reference

Base URL: `/api/v1`  
Authentication: Bearer Token via `Authorization: Bearer <token>` or HTTP-only `paydesk_token` cookie.

---

## 1. Authentication Endpoints (`/auth`)

### 1.1 Login HR User
- **Method**: `POST`
- **Path**: `/api/v1/auth/login`
- **Auth Required**: No
- **Request Body**:
```json
{
  "email": "hr@paydesk.internal",
  "password": "Password123!"
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "HR Manager",
      "email": "hr@paydesk.internal",
      "role": "HR_MANAGER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 1.2 Get Current User
- **Method**: `GET`
- **Path**: `/api/v1/auth/me`
- **Auth Required**: Yes

### 1.3 Logout User
- **Method**: `POST`
- **Path**: `/api/v1/auth/logout`
- **Auth Required**: Yes

---

## 2. Employee Directory Endpoints (`/employees`)

### 2.1 List & Search Employees
- **Method**: `GET`
- **Path**: `/api/v1/employees`
- **Query Parameters**:
  - `page`: Page number (default: `1`)
  - `limit`: Items per page (default: `10`)
  - `search`: Case-insensitive search on name or `employee_code`
  - `department`: Filter by department
  - `country`: Filter by country
  - `status`: `Active`, `Terminated`, `On Leave`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "count": 10000,
    "rows": [
      {
        "id": 1,
        "employee_code": "EMP-000001",
        "first_name": "Aarav",
        "last_name": "Sharma",
        "email": "aarav.sharma.1@paydesk.internal",
        "department": "Engineering",
        "job_title": "Senior Software Engineer",
        "country": "India",
        "currency": "INR",
        "hire_date": "2021-04-12",
        "status": "Active"
      }
    ]
  }
}
```

### 2.2 Onboard New Employee
- **Method**: `POST`
- **Path**: `/api/v1/employees`
- **Request Body**:
```json
{
  "first_name": "Priya",
  "last_name": "Patel",
  "email": "priya.patel@paydesk.internal",
  "department": "Product",
  "job_title": "Product Lead",
  "country": "India",
  "currency": "INR",
  "base_salary": 1400000,
  "hire_date": "2026-10-15"
}
```

### 2.3 Cascading Delete Employee
- **Method**: `DELETE`
- **Path**: `/api/v1/employees/:id`
- **Description**: Atomically removes employee, child deductions, payroll runs, salary records, and audit logs.

---

## 3. Salary & Compensation Endpoints (`/salaries`)

### 3.1 Get Paginated Salary Directory
- **Method**: `GET`
- **Path**: `/api/v1/salaries`
- **Query Parameters**: `month` (e.g. `2026-10`), `department`, `search`, `page`, `limit`
- **Calculations Included**: Monthly Basic, HRA, Special Allowance, Gross, EPF, PT, Health, LOP, Net Take-Home.

### 3.2 Get Employee Salary Structure
- **Method**: `GET`
- **Path**: `/api/v1/salaries/structure/:employee_id`

### 3.3 Revise Compensation (Annual vs. Monthly)
- **Method**: `POST`
- **Path**: `/api/v1/salaries/revise`
- **Request Body**:
```json
{
  "employee_id": 1,
  "increment_type": "monthly",
  "bonus_amount": 5000,
  "reason": "Q3 Performance Bonus",
  "effective_date": "2026-10-01"
}
```

---

## 4. Payroll & Payslip Endpoints (`/payroll`)

### 4.1 Process Monthly Payroll Run
- **Method**: `POST`
- **Path**: `/api/v1/payroll/process`

### 4.2 Download Standalone HTML Salary Slip
- **Method**: `GET`
- **Path**: `/api/v1/payroll/payslip/:id/download`
- **Response Headers**: `Content-Type: text/html`, `Content-Disposition: attachment; filename="Salary_Slip_EMP-000001_October_2026.html"`

---

## 5. Analytics & AI Endpoints

### 5.1 Compensation Overview KPI
- **Method**: `GET`
- **Path**: `/api/v1/analytics/overview`

### 5.2 Natural Language AI Assistant
- **Method**: `POST`
- **Path**: `/api/v1/ai/ask`
- **Request Body**:
```json
{
  "prompt": "What is our total payroll budget and how does Engineering compare to Sales?"
}
```
