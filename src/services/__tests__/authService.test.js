const { describe, it, expect, beforeEach } = require('@jest/globals');

// Mock models and token util
jest.mock('../../models', () => {
  return {
    User: {
      findOne: jest.fn()
    },
    Role: {}
  };
});

jest.mock('../../utils/token', () => {
  return {
    generateToken: jest.fn().mockReturnValue('mock-jwt-token')
  };
});

const AuthService = require('../authService');
const { User } = require('../../models');

describe('AuthService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws 400 when email or password is missing', async () => {
    await expect(AuthService.login('', '')).rejects.toMatchObject({
      statusCode: 400,
      message: 'Email and password are required.'
    });

    await expect(AuthService.login('hr@paydesk.internal', '')).rejects.toMatchObject({
      statusCode: 400,
      message: 'Password is required.'
    });

    await expect(AuthService.login('', 'pass123')).rejects.toMatchObject({
      statusCode: 400,
      message: 'Email is required.'
    });
  });

  it('throws 401 when user is not found in database', async () => {
    User.findOne.mockResolvedValue(null);

    await expect(AuthService.login('unknown@company.com', 'Pass123!')).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid email or password.'
    });
  });

  it('throws 401 when password does not match', async () => {
    const mockUser = {
      comparePassword: jest.fn().mockResolvedValue(false)
    };
    User.findOne.mockResolvedValue(mockUser);

    await expect(AuthService.login('hr@company.com', 'WrongPass')).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid email or password.'
    });
  });

  it('successfully returns user profile and generated token on valid credentials', async () => {
    const mockUser = {
      id: 1,
      name: 'HR Lead',
      email: 'hr@paydesk.internal',
      role: { id: 1, name: 'HR_MANAGER' },
      comparePassword: jest.fn().mockResolvedValue(true)
    };
    User.findOne.mockResolvedValue(mockUser);

    const result = await AuthService.login('hr@paydesk.internal', 'CorrectPassword');
    expect(result).toHaveProperty('token', 'mock-jwt-token');
    expect(result.user).toMatchObject({
      id: 1,
      name: 'HR Lead',
      email: 'hr@paydesk.internal',
      role: 'HR_MANAGER'
    });
  });
});
