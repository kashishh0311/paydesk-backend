const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('../../services/authService', () => ({
  login: jest.fn(),
  updateProfile: jest.fn()
}));

jest.mock('../../utils/cookie', () => ({
  setAuthCookie: jest.fn(),
  clearAuthCookie: jest.fn()
}));

const AuthController = require('../authController');
const AuthService = require('../../services/authService');
const { setAuthCookie, clearAuthCookie } = require('../../utils/cookie');

describe('AuthController Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('login', () => {
    it('sets cookie and returns 200 with user and token on valid login', async () => {
      req.body = { email: 'hr@paydesk.internal', password: 'Password123!' };
      const mockResult = {
        user: { id: 1, name: 'HR Manager', email: 'hr@paydesk.internal' },
        token: 'mock-token'
      };
      AuthService.login.mockResolvedValue(mockResult);

      await AuthController.login(req, res);

      expect(setAuthCookie).toHaveBeenCalledWith(res, 'mock-token');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful.',
        data: mockResult
      });
    });

    it('returns custom error status and message when AuthService throws client error', async () => {
      req.body = { email: 'wrong@paydesk.internal', password: 'bad' };
      const clientError = new Error('Invalid email or password.');
      clientError.statusCode = 401;
      AuthService.login.mockRejectedValue(clientError);

      await AuthController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email or password.'
      });
    });
  });

  describe('logout', () => {
    it('clears cookie and returns 200', async () => {
      await AuthController.logout(req, res);
      expect(clearAuthCookie).toHaveBeenCalledWith(res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully.'
      });
    });
  });
});
