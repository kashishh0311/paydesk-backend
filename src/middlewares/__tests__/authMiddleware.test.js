const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('../../utils/token', () => ({
  verifyToken: jest.fn()
}));

jest.mock('../../models', () => ({
  User: {
    findByPk: jest.fn()
  },
  Role: {}
}));

const { authenticate, authorize } = require('../authMiddleware');
const { verifyToken } = require('../../utils/token');
const { User } = require('../../models');

describe('authMiddleware Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      cookies: {},
      headers: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('authenticate middleware', () => {
    it('returns 401 when no token is supplied in header, cookie, or query', async () => {
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Authentication required')
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('extracts token from Authorization: Bearer header and attaches user to req', async () => {
      req.headers.authorization = 'Bearer valid-jwt-token';
      verifyToken.mockReturnValue({ id: 10 });
      const mockUser = { id: 10, name: 'HR Manager', role: { id: 1, name: 'HR_MANAGER' } };
      User.findByPk.mockResolvedValue(mockUser);

      await authenticate(req, res, next);
      expect(verifyToken).toHaveBeenCalledWith('valid-jwt-token');
      expect(req.user).toBe(mockUser);
      expect(next).toHaveBeenCalled();
    });

    it('returns 401 when token verification fails or token is expired', async () => {
      req.cookies.paydesk_token = 'expired-token';
      verifyToken.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('expired session')
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authorize middleware', () => {
    it('returns 403 when req.user has no role', () => {
      req.user = {};
      const mw = authorize('hr_manager');
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows access when user role matches allowed roles', () => {
      req.user = { role: { name: 'HR_MANAGER' } };
      const mw = authorize('hr_manager');
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('denies access when user role is not allowed', () => {
      req.user = { role: { name: 'GUEST' } };
      const mw = authorize('hr_manager');
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
