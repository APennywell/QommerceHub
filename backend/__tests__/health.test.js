const request = require('supertest');
const app = require('../app');

describe('Health Check Endpoints', () => {
  describe('GET /', () => {
    it('should return API running message', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'API running');
    });
  });

  describe('GET /health', () => {
    it('should return health status with timestamp', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('time');
      expect(new Date(response.body.time)).toBeInstanceOf(Date);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for undefined routes', async () => {
      const response = await request(app).get('/undefined-route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Route not found');
    });
  });
});
