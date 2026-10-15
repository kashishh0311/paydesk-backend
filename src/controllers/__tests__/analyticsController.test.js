const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('../../services/analyticsService', () => ({
  getOverviewAnalytics: jest.fn()
}));

const { getOverview } = require('../analyticsController');
const analyticsService = require('../../services/analyticsService');

describe('analyticsController Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  it('returns 200 with verified database analytics data', async () => {
    const mockOverview = {
      totalEmployees: 10000,
      monthlyPayroll: 240000000,
      departmentBreakdown: []
    };
    analyticsService.getOverviewAnalytics.mockResolvedValue(mockOverview);

    await getOverview(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockOverview
    });
  });

  it('returns 500 when analytics aggregation fails', async () => {
    analyticsService.getOverviewAnalytics.mockRejectedValue(new Error('DB Timeout'));

    await getOverview(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: expect.stringContaining('Failed to generate payroll analytics')
    }));
  });
});
