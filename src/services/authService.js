const { User, Role } = require('../models');
const { generateToken } = require('../utils/token');

class AuthService {
  static async login(email, password) {
    const trimmedEmail = typeof email === 'string' ? email.trim() : '';
    const trimmedPassword = typeof password === 'string' ? password.trim() : '';

    if (!trimmedEmail && !trimmedPassword) {
      const error = new Error('Email and password are required.');
      error.statusCode = 400;
      throw error;
    }

    if (!trimmedEmail) {
      const error = new Error('Email is required.');
      error.statusCode = 400;
      throw error;
    }

    if (!trimmedPassword) {
      const error = new Error('Password is required.');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findOne({
      where: { email: trimmedEmail },
      include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }]
    });

    if (!user) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      throw error;
    }

    const roleName = (user.role?.name || '').toLowerCase();
    if (roleName.includes('admin')) {
      const error = new Error('Administrator access is disabled. Only authorized HR accounts may log in.');
      error.statusCode = 403;
      throw error;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role ? user.role.name : null
    });

    const userProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role ? user.role.name : null
    };

    return { user: userProfile, token };
  }
}

module.exports = AuthService;
