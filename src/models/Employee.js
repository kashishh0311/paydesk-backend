const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/dbConnection');

class Employee extends Model {}

Employee.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    employee_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    first_name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    department: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    job_title: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    country: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    hire_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('Active', 'On Leave', 'Terminated'),
      defaultValue: 'Active',
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'Employee',
    tableName: 'employees',
    underscored: true,
    timestamps: true
  }
);

module.exports = Employee;
