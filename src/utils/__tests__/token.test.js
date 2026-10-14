const { generateToken, verifyToken } = require('../token');

describe('Token Utility Unit Tests', () => {
  const mockPayload = {
    id: 1,
    email: 'hr@paydesk.com',
    role: 'hr_manager'
  };

  test('should successfully generate a valid JWT string', () => {
    const token = generateToken(mockPayload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);
  });

  test('should verify and decode valid token accurately', () => {
    const token = generateToken(mockPayload);
    const decoded = verifyToken(token);

    expect(decoded.id).toBe(mockPayload.id);
    expect(decoded.email).toBe(mockPayload.email);
    expect(decoded.role).toBe(mockPayload.role);
  });

  test('should throw error when verifying an invalid or tampered token', () => {
    expect(() => {
      verifyToken('invalid.jwt.token');
    }).toThrow();
  });
});
