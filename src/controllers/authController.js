const AuthService = require('../services/authService');
const { setAuthCookie, clearAuthCookie } = require('../utils/cookie');

class AuthController {
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      const { user, token } = await AuthService.login(email, password);

      setAuthCookie(res, token);

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: {
          user,
          token
        }
      });
    } catch (error) {
      if (error.statusCode && error.statusCode < 500) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }

      console.error('Login error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Authentication service is temporarily unavailable. Please check database connection or try again later.'
      });
    }
  }

  static async logout(req, res) {
    try {
      clearAuthCookie(res);
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully.'
      });
    } catch (error) {
      console.error('Logout error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to log out.'
      });
    }
  }

  static async getMe(req, res) {
    try {
      return res.status(200).json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (error) {
      console.error('GetMe error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve user profile.'
      });
    }
  }
}

module.exports = AuthController;
