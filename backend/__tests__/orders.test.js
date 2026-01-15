const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const db = require('../db');
const orderService = require('../services/orderService');

describe('Order Endpoints', () => {
  const testTenant = { tenantId: 1, email: 'test@example.com' };
  let authToken;

  beforeAll(() => {
    authToken = jwt.sign(testTenant, process.env.JWT_SECRET, { expiresIn: '1d' });
  });

  const testOrder = {
    customer_id: 1,
    items: [
      { product_id: 1, quantity: 2 }
    ]
  };

  describe('GET /api/orders', () => {
    it('should return orders for authenticated tenant', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });
      orderService.getOrders.mockResolvedValueOnce({
        orders: [
          {
            id: 1,
            customer_id: 1,
            customer_name: 'John Doe',
            status: 'pending',
            total: 59.98,
            created_at: new Date().toISOString()
          }
        ],
        total: 1,
        page: 1,
        totalPages: 1
      });

      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('orders');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/orders');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/orders', () => {
    it('should create a new order with valid data', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });
      orderService.createOrder.mockResolvedValueOnce({
        order: { id: 1, customer_id: 1, status: 'pending', total: 59.98 },
        items: [{ product_id: 1, quantity: 2, price: 29.99 }]
      });

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testOrder);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('order');
    });

    it('should reject order with empty items', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ customer_id: 1, items: [] });

      expect(response.status).toBe(400);
    });

    it('should reject order without customer_id', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ items: [{ product_id: 1, quantity: 2 }] });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return order details with items', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });
      orderService.getOrderById.mockResolvedValueOnce({
        id: 1,
        customer_id: 1,
        customer_name: 'John Doe',
        status: 'pending',
        total: 59.98,
        items: [{ id: 1, product_id: 1, product_name: 'Product 1', quantity: 2, price: 29.99 }]
      });

      const response = await request(app)
        .get('/api/orders/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('items');
    });

    it('should return 404 for non-existent order', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });
      orderService.getOrderById.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/orders/999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/orders/:id/status', () => {
    it('should update order status', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });
      orderService.updateOrderStatus.mockResolvedValueOnce({
        id: 1, customer_id: 1, status: 'processing', total: 59.98
      });

      const response = await request(app)
        .put('/api/orders/1/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'processing' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'processing');
    });

    it('should reject invalid status', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });

      const response = await request(app)
        .put('/api/orders/1/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid-status' });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent order', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', store_name: 'Test' }] });
      orderService.updateOrderStatus.mockResolvedValueOnce(null);

      const response = await request(app)
        .put('/api/orders/999/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'processing' });

      expect(response.status).toBe(404);
    });
  });
});
