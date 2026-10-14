const request = require('supertest');
const app = require('../../app');

describe('Health Check Route Tests', () => {
  test('GET /api/health should return status OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body).toHaveProperty('uptime');
  });

  test('GET /api/v1/health should return status OK', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('OK');
  });
});
