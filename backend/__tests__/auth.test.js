const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = require('../app');
const db = require('../db');

describe('Authentication Endpoints', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'SecurePassword123!',
    store_name: 'Test Store'
  };

  describe('POST /api/tenants/signup', () => {
    it('should create a new tenant successfully', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: testUser.email,
          store_name: testUser.store_name,
          created_at: new Date().toISOString()
        }]
      });

      const response = await request(app)
        .post('/api/tenants/signup')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Tenant created successfully');
      expect(response.body.tenant).toHaveProperty('email', testUser.email);
      expect(response.body.tenant).toHaveProperty('store_name', testUser.store_name);
    });

    it('should reject signup with invalid email', async () => {
      const response = await request(app)
        .post('/api/tenants/signup')
        .send({ ...testUser, email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject signup with short password', async () => {
      const response = await request(app)
        .post('/api/tenants/signup')
        .send({ ...testUser, password: 'short' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject signup without store name', async () => {
      const response = await request(app)
        .post('/api/tenants/signup')
        .send({ email: testUser.email, password: testUser.password });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/tenants/login', () => {
    it('should login successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash(testUser.password, 10);

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: testUser.email,
          password_hash: hashedPassword,
          store_name: testUser.store_name
        }]
      });

      const response = await request(app)
        .post('/api/tenants/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('token');
      expect(response.body.tenant).toHaveProperty('email', testUser.email);

      // Verify JWT token is valid
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded).toHaveProperty('tenantId', 1);
      expect(decoded).toHaveProperty('email', testUser.email);
    });

    it('should reject login with wrong password', async () => {
      const hashedPassword = await bcrypt.hash(testUser.password, 10);

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: testUser.email,
          password_hash: hashedPassword,
          store_name: testUser.store_name
        }]
      });

      const response = await request(app)
        .post('/api/tenants/login')
        .send({ email: testUser.email, password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject login with non-existent email', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/tenants/login')
        .send({ email: 'nonexistent@example.com', password: testUser.password });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject login with missing fields', async () => {
      const response = await request(app)
        .post('/api/tenants/login')
        .send({ email: testUser.email });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/tenants/me', () => {
    it('should return tenant info for authenticated user', async () => {
      const token = jwt.sign(
        { tenantId: 1, email: testUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: testUser.email,
          store_name: testUser.store_name
        }]
      });

      const response = await request(app)
        .get('/api/tenants/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tenant');
    });

    it('should reject request without token', async () => {
      const response = await request(app).get('/api/tenants/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/tenants/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/tenants/forgot-password', () => {
    it('should return success message for existing email', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1, email: testUser.email }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/tenants/forgot-password')
        .send({ email: testUser.email });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should return same message for non-existent email (prevent enumeration)', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/tenants/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject request without email', async () => {
      const response = await request(app)
        .post('/api/tenants/forgot-password')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/tenants/reset-password', () => {
    it('should reject reset without token', async () => {
      const response = await request(app)
        .post('/api/tenants/reset-password')
        .send({ password: 'NewPassword123!' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject reset with short password', async () => {
      const response = await request(app)
        .post('/api/tenants/reset-password')
        .send({ token: 'sometoken', password: 'short' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject reset with invalid/expired token', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/tenants/reset-password')
        .send({ token: 'invalidtoken', password: 'NewPassword123!' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid or expired reset token');
    });
  });
});
