const { Op } = require('sequelize');
const { AuditLog, Employee, User } = require('../models');


class AuditService {
  
  async listAuditLogs({ page = 1, limit = 15, search }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
    const offset = (pageNum - 1) * limitNum;

    const where = {};

    if (search && search.trim() !== '') {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { action: { [Op.like]: q } },
        { reason: { [Op.like]: q } }
      ];
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [['id', 'DESC']],
      include: [
        {
          model: Employee,
          as: 'employee',
          required: false,
          attributes: ['id', 'employee_code', 'first_name', 'last_name', 'department', 'currency']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    const serializedRows = rows.map((r) => {
      const json = r.toJSON ? r.toJSON() : r;
      const timestamp = json.createdAt || json.created_at || new Date().toISOString();
      return {
        ...json,
        created_at: timestamp,
        createdAt: timestamp
      };
    });

    return {
      rows: serializedRows,
      count,
      page: pageNum,
      totalPages: Math.ceil(count / limitNum)
    };
  }
}

module.exports = new AuditService();
