const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');

describe('Middleware Tests', () => {
  describe('Authentication Middleware', () => {
    it('should reject requests without Authorization header', async () => {
      const response = await request(app).get('/api/inventory');
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject requests with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', 'NotBearer token');
      expect(response.status).toBe(401);
    });

    it('should reject requests with expired token', async () => {
      const expiredToken = jwt.sign(
        { tenantId: 1, email: 'test@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(response.status).toBe(401);
    });

    it('should reject requests with token signed by wrong secret', async () => {
      const wrongSecretToken = jwt.sign(
        { tenantId: 1, email: 'test@example.com' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${wrongSecretToken}`);
      expect(response.status).toBe(401);
    });
  });

  describe('Validation Middleware', () => {
    it('should validate signup with proper schema', async () => {
      const response = await request(app)
        .post('/api/tenants/signup')
        .send({ email: 'invalid', password: 'x', store_name: '' });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate login with proper schema', async () => {
      const response = await request(app)
        .post('/api/tenants/login')
        .send({ email: 'valid@email.com' });
      expect(response.status).toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for undefined routes', async () => {
      const response = await request(app).get('/api/undefined-endpoint');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Route not found');
    });

    it('should handle JSON parsing errors gracefully', async () => {
      const response = await request(app)
        .post('/api/tenants/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      expect(response.status).toBe(400);
    });
  });
});
