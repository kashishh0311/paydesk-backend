const auditService = require('../services/auditService');

/**
 * GET /api/v1/audit-logs
 * Paginated compliance audit log entries with server-side search filter
 */
const getAuditLogs = async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const result = await auditService.listAuditLogs({ page, limit, search });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('getAuditLogs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance audit logs'
    });
  }
};

module.exports = {
  getAuditLogs
};
