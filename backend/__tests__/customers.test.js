const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const db = require('../db');
const customerService = require('../services/customerService');

describe('Customer Endpoints', () => {
  const testTenant = { tenantId: 1, email: 'test@example.com' };
  let authToken;

  beforeAll(() => {
    authToken = jwt.sign(testTenant, process.env.JWT_SECRET, { expiresIn: '1d' });
  });

  const testCustomer = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '555-0123',
    address: '123 Main St, City, ST 12345'
  };

  describe('GET /api/customers', () => {
    it('should return customers for authenticated tenant', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });
      customerService.getCustomers.mockResolvedValueOnce({
        customers: [{ id: 1, ...testCustomer, tenant_id: 1 }],
        total: 1,
        page: 1,
        totalPages: 1
      });

      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('customers');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/customers');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/customers', () => {
    it('should create a new customer', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });
      customerService.createCustomer.mockResolvedValueOnce({ id: 1, ...testCustomer, tenant_id: 1 });

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testCustomer);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('name', testCustomer.name);
      expect(response.body).toHaveProperty('email', testCustomer.email);
    });

    it('should reject customer with missing name', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: testCustomer.email });

      expect(response.status).toBe(400);
    });

    it('should reject customer with invalid email', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...testCustomer, email: 'not-an-email' });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/customers/:id', () => {
    it('should update an existing customer', async () => {
      const updatedCustomer = { ...testCustomer, name: 'Jane Doe' };
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });
      customerService.updateCustomer.mockResolvedValueOnce({ id: 1, ...updatedCustomer, tenant_id: 1 });

      const response = await request(app)
        .put('/api/customers/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedCustomer);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Jane Doe');
    });

    it('should return 404 for non-existent customer', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });
      customerService.updateCustomer.mockResolvedValueOnce(null);

      const response = await request(app)
        .put('/api/customers/999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testCustomer);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/customers/:id', () => {
    it('should delete an existing customer', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });
      customerService.deleteCustomer.mockResolvedValueOnce({ id: 1, ...testCustomer });

      const response = await request(app)
        .delete('/api/customers/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent customer', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });
      customerService.deleteCustomer.mockResolvedValueOnce(null);

      const response = await request(app)
        .delete('/api/customers/999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
