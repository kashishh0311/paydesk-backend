const express = require('express');
const router = express.Router();
const { getAuditLogs, updateAuditLog, deleteAuditLog } = require('../controllers/auditLogController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/', getAuditLogs);
router.put('/:id', updateAuditLog);
router.delete('/:id', deleteAuditLog);

module.exports = router;
