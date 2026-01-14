const Joi = require("joi");

// Validation schemas
const schemas = {
  // Tenant validation
  signup: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
    password: Joi.string().min(8).required().messages({
      "string.min": "Password must be at least 8 characters long",
      "any.required": "Password is required",
    }),
    store_name: Joi.string().min(2).max(100).required().messages({
      "string.min": "Store name must be at least 2 characters",
      "string.max": "Store name cannot exceed 100 characters",
      "any.required": "Store name is required",
    }),
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
    password: Joi.string().required().messages({
      "any.required": "Password is required",
    }),
  }),

  // Inventory validation
  createInventory: Joi.object({
    name: Joi.string().min(1).max(200).required().messages({
      "string.min": "Product name is required",
      "string.max": "Product name cannot exceed 200 characters",
      "any.required": "Product name is required",
    }),
    sku: Joi.string().min(1).max(100).required().messages({
      "string.min": "SKU is required",
      "string.max": "SKU cannot exceed 100 characters",
      "any.required": "SKU is required",
    }),
    quantity: Joi.number().integer().min(0).required().messages({
      "number.base": "Quantity must be a number",
      "number.integer": "Quantity must be a whole number",
      "number.min": "Quantity cannot be negative",
      "any.required": "Quantity is required",
    }),
    price: Joi.number().positive().precision(2).required().messages({
      "number.base": "Price must be a number",
      "number.positive": "Price must be greater than zero",
      "any.required": "Price is required",
    }),
  }),

  updateInventory: Joi.object({
    name: Joi.string().min(1).max(200).optional().messages({
      "string.min": "Product name cannot be empty",
      "string.max": "Product name cannot exceed 200 characters",
    }),
    sku: Joi.string().min(1).max(100).optional().messages({
      "string.min": "SKU cannot be empty",
      "string.max": "SKU cannot exceed 100 characters",
    }),
    quantity: Joi.number().integer().min(0).optional().messages({
      "number.base": "Quantity must be a number",
      "number.integer": "Quantity must be a whole number",
      "number.min": "Quantity cannot be negative",
    }),
    price: Joi.number().positive().precision(2).optional().messages({
      "number.base": "Price must be a number",
      "number.positive": "Price must be greater than zero",
    }),
  }).min(1).messages({
    "object.min": "At least one field must be provided for update",
  }),

  // ID parameter validation
  idParam: Joi.object({
    id: Joi.number().integer().positive().required().messages({
      "number.base": "Invalid ID format",
      "number.integer": "ID must be a whole number",
      "number.positive": "ID must be positive",
      "any.required": "ID is required",
    }),
  }),
};

// Validation middleware factory
const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json({
        error: "Validation failed",
        details: errors,
      });
    }

    // Replace request property with validated and sanitized value
    req[property] = value;
    next();
  };
};

module.exports = {
  validate,
  schemas,
};
