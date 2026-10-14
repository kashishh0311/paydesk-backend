const { verifyToken } = require('../utils/token');
const { User, Role } = require('../models');
const { COOKIE_NAME } = require('../utils/cookie');

const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      });
    }

    const decoded = verifyToken(token);
    const user = await User.findByPk(decoded.id, {
      include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session. User no longer exists.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please log in again.'
    });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.'
      });
    }

    const userRole = (req.user.role.name || '').toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

    if (userRole.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: Administrator access is disabled. Only HR role is authorized.'
      });
    }

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: Only authorized HR role is permitted.'
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize
};
