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

const updateAuditLog = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await auditService.updateAuditLog(id, req.body, req.user?.id || null);

    return res.status(200).json({
      success: true,
      message: 'Increment/bonus audit record updated and compensation recalculated successfully',
      data: result
    });
  } catch (error) {
    console.error('updateAuditLog error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to update audit log'
    });
  }
};

const deleteAuditLog = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await auditService.deleteAuditLog(id, req.user?.id || null);

    return res.status(200).json({
      success: true,
      message: 'Increment/bonus audit record deleted and compensation reverted successfully',
      data: result
    });
  } catch (error) {
    console.error('deleteAuditLog error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to delete audit log'
    });
  }
};

module.exports = {
  getAuditLogs,
  updateAuditLog,
  deleteAuditLog
};
