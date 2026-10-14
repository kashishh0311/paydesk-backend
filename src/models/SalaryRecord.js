const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/dbConnection');

class SalaryRecord extends Model {}

SalaryRecord.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    base_salary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    bonuses: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      allowNull: false
    },
    deductions: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      allowNull: false
    },
    net_salary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    effective_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    reason: {
      type: DataTypes.STRING(255),
      defaultValue: 'Initial Hiring Structure',
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'SalaryRecord',
    tableName: 'salary_records',
    underscored: true,
    timestamps: true
  }
);

module.exports = SalaryRecord;
