const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const salaryRoutes = require('./routes/salaryRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const aiRoutes = require('./routes/aiRoutes');
const exportRoutes = require('./routes/exportRoutes');
const payrollRoutes = require('./routes/payrollRoutes');

app.get(['/api/health', '/api/v1/health'], (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/salaries', salaryRoutes);
app.use('/api/v1/payroll', payrollRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/export', exportRoutes);

module.exports = app;
