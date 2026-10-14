const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/dbConnection');

class PayrollDeduction extends Model {}

PayrollDeduction.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    payroll_record_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'payroll_records',
        key: 'id'
      }
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'employees',
        key: 'id'
      }
    },
    deduction_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    source_record: {
      type: DataTypes.STRING(100),
      defaultValue: 'Automated Attendance Rule',
      allowNull: true
    },
    approval_status: {
      type: DataTypes.ENUM('Approved', 'Pending', 'Rejected'),
      defaultValue: 'Approved',
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'PayrollDeduction',
    tableName: 'payroll_deductions',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['payroll_record_id']
      },
      {
        fields: ['employee_id']
      }
    ]
  }
);

module.exports = PayrollDeduction;
