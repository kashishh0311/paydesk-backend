const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('../../services/salaryService', () => ({
  listSalaries: jest.fn(),
  reviseSalary: jest.fn(),
  getSalaryStructure: jest.fn()
}));

jest.mock('../../services/payrollService', () => ({
  getEmployeeHistory: jest.fn(),
  getPayslipHtml: jest.fn(),
  addDeductionToPayslip: jest.fn(),
  updatePayslipEarnings: jest.fn(),
  removeDeductionFromPayslip: jest.fn()
}));

const {
  getSalaries,
  reviseSalary,
  getSalaryStructure,
  getPayslipHtml
} = require('../salaryController');

const salaryService = require('../../services/salaryService');
const payrollService = require('../../services/payrollService');

describe('salaryController Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      query: {},
      params: {},
      body: {},
      user: { id: 1, role: { name: 'HR_MANAGER' } }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn()
    };
  });

  describe('getSalaries', () => {
    it('returns 200 with salary list', async () => {
      const mockResult = { count: 10, rows: [] };
      salaryService.listSalaries.mockResolvedValue(mockResult);

      await getSalaries(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockResult });
    });
  });

  describe('reviseSalary', () => {
    it('returns 403 when user is an admin', async () => {
      req.user = { id: 2, role: { name: 'ADMIN' } };

      await reviseSalary(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Only HR Managers are authorized')
      }));
    });

    it('returns 200 and audit message on successful revision', async () => {
      req.body = { employee_id: 1, increment_type: 'monthly', bonus_amount: 5000 };
      const mockRecord = { id: 1, bonus_amount: 5000 };
      salaryService.reviseSalary.mockResolvedValue(mockRecord);

      await reviseSalary(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Compensation structure revised and audit trail recorded successfully.',
        data: mockRecord
      });
    });
  });

  describe('getSalaryStructure', () => {
    it('returns 200 with structure data', async () => {
      req.params = { employee_id: '10' };
      const mockStructure = { base_salary: 1200000 };
      salaryService.getSalaryStructure.mockResolvedValue(mockStructure);

      await getSalaryStructure(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockStructure });
    });
  });

  describe('getPayslipHtml', () => {
    it('sets Content-Type text/html and returns 200', async () => {
      req.params = { id: '1' };
      payrollService.getPayslipHtml.mockResolvedValue('<html>Payslip</html>');

      await getPayslipHtml(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('<html>Payslip</html>');
    });
  });
});
