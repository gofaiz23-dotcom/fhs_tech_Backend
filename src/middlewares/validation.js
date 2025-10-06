import { body, param, validationResult } from 'express-validator';

// Handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// User validation rules
export const validateUserRegistration = [
  body('username')
    .isLength({ min: 2, max: 50 })
    .withMessage('Username must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['USER', 'ADMIN'])
    .withMessage('Role must be either USER or ADMIN'),
  handleValidationErrors
];

export const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('networkType')
    .optional()
    .isString()
    .withMessage('Network type must be a string'),
  handleValidationErrors
];

export const validateEmailUpdate = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  handleValidationErrors
];

export const validatePasswordUpdate = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

export const validateRoleUpdate = [
  body('role')
    .isIn(['USER', 'ADMIN'])
    .withMessage('Role must be either USER or ADMIN'),
  handleValidationErrors
];

export const validateUsernameUpdate = [
  body('username')
    .isLength({ min: 2, max: 50 })
    .withMessage('Username must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  handleValidationErrors
];

// Brand validation rules
export const validateBrand = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Brand name is required')
    .isLength({ max: 100 })
    .withMessage('Brand name must not exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  handleValidationErrors
];

// Marketplace validation rules
export const validateMarketplace = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Marketplace name is required')
    .isLength({ max: 100 })
    .withMessage('Marketplace name must not exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  handleValidationErrors
];

// Shipping company validation rules
export const validateShippingCompany = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Shipping company name is required')
    .isLength({ max: 100 })
    .withMessage('Shipping company name must not exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  handleValidationErrors
];

// Permission validation rules
export const validatePermissionGrant = [
  body('brandId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Brand ID must be a positive integer'),
  body('marketplaceId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Marketplace ID must be a positive integer'),
  body('shippingCompanyId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Shipping company ID must be a positive integer'),
  handleValidationErrors
];

// ID parameter validation
export const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  handleValidationErrors
];

export const validateBrandId = [
  param('brandId')
    .isInt({ min: 1 })
    .withMessage('Brand ID must be a positive integer'),
  handleValidationErrors
];

export const validateMarketplaceId = [
  param('marketplaceId')
    .isInt({ min: 1 })
    .withMessage('Marketplace ID must be a positive integer'),
  handleValidationErrors
];

export const validateShippingId = [
  param('shippingId')
    .isInt({ min: 1 })
    .withMessage('Shipping ID must be a positive integer'),
  handleValidationErrors
];
