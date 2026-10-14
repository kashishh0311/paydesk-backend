const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/dbConnection');

class AuditLog extends Model {}

AuditLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    previous_value: {
      type: DataTypes.JSON,
      allowNull: true
    },
    new_value: {
      type: DataTypes.JSON,
      allowNull: false
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    underscored: true,
    timestamps: true
  }
);

module.exports = AuditLog;
