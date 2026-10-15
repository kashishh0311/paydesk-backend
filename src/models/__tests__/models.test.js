const { describe, it, expect } = require('@jest/globals');
const {
  User,
  Role,
  Employee,
  SalaryRecord,
  PayrollRecord,
  PayrollDeduction,
  AuditLog
} = require('../index');

describe('Database Models & Associations Unit Tests', () => {
  it('exports all 7 core Sequelize models', () => {
    expect(User).toBeDefined();
    expect(Role).toBeDefined();
    expect(Employee).toBeDefined();
    expect(SalaryRecord).toBeDefined();
    expect(PayrollRecord).toBeDefined();
    expect(PayrollDeduction).toBeDefined();
    expect(AuditLog).toBeDefined();
  });

  it('defines correct associations on Employee model', () => {
    expect(Employee.associations).toHaveProperty('salaryRecords');
    expect(Employee.associations).toHaveProperty('payrollRecords');
    expect(Employee.associations).toHaveProperty('payrollDeductions');
    expect(Employee.associations).toHaveProperty('auditLogs');
  });

  it('defines correct associations on PayrollRecord and User', () => {
    expect(PayrollRecord.associations).toHaveProperty('employee');
    expect(PayrollRecord.associations).toHaveProperty('deductions');
    expect(User.associations).toHaveProperty('role');
  });
});
