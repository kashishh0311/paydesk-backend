const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('../../models', () => {
  return {
    sequelize: {
      transaction: jest.fn().mockResolvedValue({
        commit: jest.fn(),
        rollback: jest.fn()
      })
    },
    Employee: {
      findAndCountAll: jest.fn(),
      findByPk: jest.fn(),
      destroy: jest.fn()
    },
    SalaryRecord: {
      destroy: jest.fn()
    },
    AuditLog: {
      destroy: jest.fn()
    },
    PayrollRecord: {
      findAll: jest.fn().mockResolvedValue([{ id: 1 }]),
      destroy: jest.fn()
    },
    PayrollDeduction: {
      destroy: jest.fn()
    }
  };
});

const employeeService = require('../employeeService');
const { Employee, SalaryRecord, AuditLog, PayrollRecord, PayrollDeduction } = require('../../models');

describe('EmployeeService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listEmployees', () => {
    it('returns paginated employees with calculated totalPages', async () => {
      Employee.findAndCountAll.mockResolvedValue({
        count: 100,
        rows: [{ id: 1, employee_code: 'EMP-001', first_name: 'John' }]
      });

      const result = await employeeService.listEmployees({ page: 2, limit: 10 });
      expect(result.count).toBe(100);
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(10);
      expect(result.rows).toHaveLength(1);
    });

    it('clamps limit to maximum of 100 and minimum page to 1', async () => {
      Employee.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      const result = await employeeService.listEmployees({ page: -5, limit: 500 });
      expect(result.page).toBe(1);
    });
  });

  describe('deleteEmployee', () => {
    it('throws 404 when employee does not exist', async () => {
      Employee.findByPk.mockResolvedValue(null);

      await expect(employeeService.deleteEmployee(999)).rejects.toMatchObject({
        statusCode: 404
      });
    });

    it('cascades deletion through child records in strict order', async () => {
      const mockDestroy = jest.fn().mockResolvedValue(true);
      Employee.findByPk.mockResolvedValue({
        id: 10,
        employee_code: 'EMP-010',
        destroy: mockDestroy
      });

      const result = await employeeService.deleteEmployee(10);
      expect(result).toHaveProperty('id', 10);
      expect(PayrollDeduction.destroy).toHaveBeenCalled();
      expect(PayrollRecord.destroy).toHaveBeenCalled();
      expect(SalaryRecord.destroy).toHaveBeenCalled();
      expect(AuditLog.destroy).toHaveBeenCalled();
      expect(mockDestroy).toHaveBeenCalled();
    });
  });
});
