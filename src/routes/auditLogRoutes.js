const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditLogController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/', getAuditLogs);

module.exports = router;
