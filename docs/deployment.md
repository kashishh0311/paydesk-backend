# PayDesk HRMS — Backend Deployment Guide

## 1. Environment Variables Configuration

Create a `.env` file in `paydesk-backend/` (refer to `.env.example`):

```bash
# Server Port
PORT=5000
NODE_ENV=production

# Database Connection (MySQL 8.0+)
DB_HOST=your-mysql-host.render.com
DB_PORT=3306
DB_NAME=paydesk_db
DB_USER=root
DB_PASSWORD=your_secure_password
DATABASE_URL=mysql://root:password@your-mysql-host.render.com:3306/paydesk_db

# Security & Authentication
JWT_SECRET=super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Cross-Origin Whitelist (comma-separated frontend URLs)
CLIENT_URL=https://<your-frontend-app>.onrender.com,http://localhost:5173

# AI Assistant Integration (Optional)
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 2. Local Setup & Execution

### 2.1 Prerequisites
- Node.js v18.0.0 or higher
- MySQL 8.0+ running locally or in Docker

### 2.2 Installation & Database Migration
```bash
# Navigate to backend directory
cd paydesk-backend

# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Seed 10,000 employees into database
npm run db:seed:employees

# Synchronize statutory deductions
npm run db:sync:deductions
```

### 2.3 Starting the Server
```bash
# Production start
npm start

# Development mode with Nodemon
npm run dev
```
The server will bind to `http://localhost:5000`.

---

## 3. Automated Testing Verification

```bash
# Run unit and integration tests
npm test

# Run tests with code coverage analysis
npx jest --coverage
```

---

## 4. Render Deployment (Web Service)

- **Service Type**: Web Service
- **Environment**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/api/v1/health`
- **Database**: Managed MySQL instance on Render or Aiven linked via `DATABASE_URL`.
