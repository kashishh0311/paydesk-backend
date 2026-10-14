const sequelize = require('../config/dbConnection');
const Role = require('./Role');
const User = require('./User');
const Employee = require('./Employee');
const SalaryRecord = require('./SalaryRecord');
const AuditLog = require('./AuditLog');
const PayrollRecord = require('./PayrollRecord');
const PayrollDeduction = require('./PayrollDeduction');

// Role & User
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

// Employee & SalaryRecord
Employee.hasMany(SalaryRecord, { foreignKey: 'employee_id', as: 'salaryRecords' });
SalaryRecord.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// Employee & AuditLog
Employee.hasMany(AuditLog, { foreignKey: 'employee_id', as: 'auditLogs' });
AuditLog.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// User & AuditLog
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Employee & PayrollRecord
Employee.hasMany(PayrollRecord, { foreignKey: 'employee_id', as: 'payrollRecords' });
Employee.hasMany(PayrollRecord, { foreignKey: 'employee_id', as: 'payroll_records' });
PayrollRecord.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// PayrollRecord & PayrollDeduction
PayrollRecord.hasMany(PayrollDeduction, { foreignKey: 'payroll_record_id', as: 'deductions' });
PayrollRecord.hasMany(PayrollDeduction, { foreignKey: 'payroll_record_id', as: 'deduction_items' });
PayrollDeduction.belongsTo(PayrollRecord, { foreignKey: 'payroll_record_id', as: 'payrollRecord' });
PayrollDeduction.belongsTo(PayrollRecord, { foreignKey: 'payroll_record_id', as: 'payroll_record' });

// Employee & PayrollDeduction
Employee.hasMany(PayrollDeduction, { foreignKey: 'employee_id', as: 'payrollDeductions' });
Employee.hasMany(PayrollDeduction, { foreignKey: 'employee_id', as: 'deductions' });
PayrollDeduction.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// User & PayrollRecord (Approver)
User.hasMany(PayrollRecord, { foreignKey: 'approved_by', as: 'approvedPayrolls' });
PayrollRecord.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

module.exports = {
  sequelize,
  Role,
  User,
  Employee,
  SalaryRecord,
  AuditLog,
  PayrollRecord,
  PayrollDeduction
};
