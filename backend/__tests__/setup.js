// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';

// Mock the database module
jest.mock('../db', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn(),
    end: jest.fn()
  }
}));

// Mock the email service
jest.mock('../services/emailService', () => ({
  sendOrderConfirmation: jest.fn().mockResolvedValue({ success: true }),
  sendOrderStatusUpdate: jest.fn().mockResolvedValue({ success: true }),
  sendLowStockAlert: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true })
}));

// Mock the customer service
jest.mock('../services/customerService', () => ({
  createCustomer: jest.fn(),
  getCustomers: jest.fn(),
  updateCustomer: jest.fn(),
  deleteCustomer: jest.fn()
}));

// Mock the inventory service
jest.mock('../services/inventoryService', () => ({
  createInventory: jest.fn(),
  getInventory: jest.fn(),
  updateInventory: jest.fn(),
  deleteInventory: jest.fn(),
  restoreInventory: jest.fn()
}));

// Mock the order service
jest.mock('../services/orderService', () => ({
  createOrder: jest.fn(),
  getOrders: jest.fn(),
  getOrderById: jest.fn(),
  updateOrderStatus: jest.fn()
}));

// Clear mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
