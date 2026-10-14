const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/dbConnection');

class PayrollRecord extends Model {}

PayrollRecord.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'employees',
        key: 'id'
      }
    },
    payroll_month: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 12 }
    },
    payroll_year: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    basic_salary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    allowances: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      allowNull: false
    },
    gross_salary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    attendance_days: {
      type: DataTypes.INTEGER,
      defaultValue: 22,
      allowNull: false
    },
    unpaid_leave_days: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    lop_deduction: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      allowNull: false
    },
    statutory_deductions: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      allowNull: false
    },
    other_deductions: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      allowNull: false
    },
    total_deductions: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      allowNull: false
    },
    bonus_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      allowNull: false
    },
    net_salary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('Draft', 'Under Review', 'Approved', 'Processing', 'Paid', 'Failed'),
      defaultValue: 'Draft',
      allowNull: false
    },
    payment_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    payment_reference: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    payment_method: {
      type: DataTypes.STRING(50),
      defaultValue: 'Bank Transfer',
      allowNull: true
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'PayrollRecord',
    tableName: 'payroll_records',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['employee_id', 'payroll_month', 'payroll_year']
      },
      {
        fields: ['payroll_month', 'payroll_year']
      },
      {
        fields: ['status']
      }
    ]
  }
);

module.exports = PayrollRecord;
