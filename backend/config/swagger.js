const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "QommerceHub API",
      version: "1.0.0",
      description: "Enterprise multi-tenant e-commerce platform API with advanced analytics",
      contact: {
        name: "QommerceHub Support",
        email: "support@qommercehub.com",
      },
    },
    servers: [
      {
        url: "http://localhost:5001",
        description: "Development server",
      },
      {
        url: "https://api.qommercehub.com",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT token obtained from /api/tenants/login",
        },
      },
      schemas: {
        Tenant: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            email: { type: "string", format: "email", example: "user@example.com" },
            store_name: { type: "string", example: "My Awesome Store" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        InventoryItem: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            tenant_id: { type: "integer", example: 1 },
            name: { type: "string", example: "Car Wrap - Matte Black" },
            sku: { type: "string", example: "WRAP-MB-001" },
            quantity: { type: "integer", minimum: 0, example: 25 },
            price: { type: "number", format: "decimal", minimum: 0, example: 499.99 },
            created_at: { type: "string", format: "date-time" },
            deleted_at: { type: "string", format: "date-time", nullable: true },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string", example: "Error message" },
          },
        },
        ValidationError: {
          type: "object",
          properties: {
            error: { type: "string", example: "Validation failed" },
            details: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string", example: "email" },
                  message: { type: "string", example: "Email is required" },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Authentication",
        description: "Tenant authentication and registration",
      },
      {
        name: "Inventory",
        description: "Inventory management operations",
      },
    ],
  },
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
