const express = require('express');
const router = express.Router();
const {
  exportEmployees,
  exportSalaries,
  exportAuditLogs
} = require('../controllers/exportController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/employees', exportEmployees);
router.get('/salaries', exportSalaries);
router.get('/audit-logs', exportAuditLogs);

module.exports = router;
