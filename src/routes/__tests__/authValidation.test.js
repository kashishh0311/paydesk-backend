const request = require('supertest');
const app = require('../../app');

describe('Auth Route Validation Tests', () => {
  test('POST /api/v1/auth/login with empty body should return 400 with validation message', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: '', password: '' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Email and password are required.');
  });

  test('POST /api/v1/auth/login with missing email should return 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: '', password: 'SomePassword123' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Email is required.');
  });

  test('POST /api/v1/auth/login with missing password should return 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'hr@paydesk.com', password: '' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Password is required.');
  });
});
