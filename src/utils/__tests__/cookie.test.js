const { COOKIE_NAME, setAuthCookie, clearAuthCookie } = require('../cookie');

describe('Cookie Utility Unit Tests', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      cookie: jest.fn(),
      clearCookie: jest.fn()
    };
  });

  test('setAuthCookie should set cookie with httpOnly and maxAge options', () => {
    const token = 'sample_test_token';
    setAuthCookie(mockRes, token);

    expect(mockRes.cookie).toHaveBeenCalledTimes(1);
    expect(mockRes.cookie).toHaveBeenCalledWith(
      COOKIE_NAME,
      token,
      expect.objectContaining({
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
    );
  });

  test('clearAuthCookie should clear the auth cookie with httpOnly option', () => {
    clearAuthCookie(mockRes);

    expect(mockRes.clearCookie).toHaveBeenCalledTimes(1);
    expect(mockRes.clearCookie).toHaveBeenCalledWith(
      COOKIE_NAME,
      expect.objectContaining({
        httpOnly: true
      })
    );
  });
});
