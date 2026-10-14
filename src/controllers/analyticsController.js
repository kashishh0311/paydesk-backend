const analyticsService = require('../services/analyticsService');

/**
 * GET /api/v1/analytics/overview
 * Real-time, verified database aggregations across MySQL records
 */
const getOverview = async (req, res) => {
  try {
    const data = await analyticsService.getOverviewAnalytics();

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('getOverview error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate payroll analytics overview'
    });
  }
};

module.exports = {
  getOverview
};
