const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const db = require('../db');
const inventoryService = require('../services/inventoryService');

describe('Inventory Endpoints', () => {
  const testTenant = { tenantId: 1, email: 'test@example.com' };
  let authToken;

  beforeAll(() => {
    authToken = jwt.sign(testTenant, process.env.JWT_SECRET, { expiresIn: '1d' });
  });

  const testProduct = {
    name: 'Test Product',
    sku: 'TEST-001',
    quantity: 100,
    price: 29.99,
    description: 'A test product'
  };

  describe('GET /api/inventory', () => {
    it('should return inventory for authenticated tenant', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });
      inventoryService.getInventory.mockResolvedValueOnce({
        items: [{ id: 1, ...testProduct, tenant_id: 1 }],
        total: 1,
        page: 1,
        totalPages: 1
      });

      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/inventory');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/inventory', () => {
    it('should create a new product', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });
      inventoryService.createInventory.mockResolvedValueOnce({ id: 1, ...testProduct, tenant_id: 1 });

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testProduct);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('name', testProduct.name);
    });

    it('should reject product with missing required fields', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Incomplete Product' });

      expect(response.status).toBe(400);
    });

    it('should reject product with negative quantity', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...testProduct, quantity: -5 });

      expect(response.status).toBe(400);
    });

    it('should reject product with negative price', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...testProduct, price: -10 });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/inventory/:id', () => {
    it('should update an existing product', async () => {
      const updatedProduct = { ...testProduct, name: 'Updated Product', price: 39.99 };
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });
      inventoryService.updateInventory.mockResolvedValueOnce({ id: 1, ...updatedProduct, tenant_id: 1 });

      const response = await request(app)
        .put('/api/inventory/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedProduct);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Updated Product');
    });

    it('should return 404 for non-existent product', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });
      inventoryService.updateInventory.mockResolvedValueOnce(null);

      const response = await request(app)
        .put('/api/inventory/999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testProduct);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/inventory/:id', () => {
    it('should delete an existing product', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });
      inventoryService.deleteInventory.mockResolvedValueOnce({ id: 1, ...testProduct });

      const response = await request(app)
        .delete('/api/inventory/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent product', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });
      inventoryService.deleteInventory.mockResolvedValueOnce(null);

      const response = await request(app)
        .delete('/api/inventory/999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
