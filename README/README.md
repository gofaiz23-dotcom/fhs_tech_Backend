# FHS Tech Backend - Complete API Documentation

## 📋 Overview

Welcome to the comprehensive API documentation for the FHS Tech Backend authentication and permission management system. This system provides a complete solution for user management, role-based access control, and detailed activity tracking.

## 🚀 Quick Start

### Base URL
```
http://192.168.0.23:5000/api
```

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_access_token>
```

## 📚 Documentation Structure

### 1. [Authentication APIs](./01_Authentication_APIs.md)
Complete user authentication system with JWT tokens
- User Registration (Admin only)
- User Login with session tracking
- Token Refresh mechanism
- Secure Logout
- User Profile management

### 2. [Admin APIs](./02_Admin_APIs.md)
Administrative functions for user management
- View all users with statistics
- Update user details (email, password, role)
- Comprehensive user analytics
- Login history monitoring

### 3. [Brands APIs](./03_Brands_APIs.md)
Brand management with multiple creation methods
- CRUD operations for brands
- Single brand creation
- Multiple brands creation
- Bulk CSV/Excel file upload
- Access control filtering

### 4. [Marketplaces APIs](./04_Marketplaces_APIs.md)
Marketplace management system
- Complete marketplace CRUD
- Bulk import capabilities
- File upload support (CSV/Excel)
- User access filtering

### 5. [Shipping APIs](./05_Shipping_APIs.md)
Shipping company management
- Shipping company CRUD operations
- Multiple creation methods
- File upload processing
- Access-based data filtering

### 6. [Permissions APIs](./06_Permissions_APIs.md)
Granular permission management system
- Brand access control
- Marketplace permissions
- Shipping company access
- Toggle-based permission system
- Audit trail maintenance

### 7. [Login History & Analytics](./07_Login_History_APIs.md)
Comprehensive user activity tracking
- Session monitoring
- Work hour calculations
- IP and network tracking
- Productivity analytics
- Security monitoring

## 🔐 Security Features

### JWT Token System
- **Access Tokens:** 15-minute lifespan for API calls
- **Refresh Tokens:** 7-day lifespan stored in HttpOnly cookies
- **Automatic Refresh:** Seamless token renewal
- **Secure Storage:** HttpOnly cookies prevent XSS attacks

### Role-Based Access Control
- **Admin Role:** Full system access and user management
- **User Role:** Limited access based on granted permissions
- **Permission Filtering:** Users only see authorized data

### Activity Tracking
- **Login/Logout Monitoring:** Complete session tracking
- **IP Address Logging:** Network security monitoring
- **Work Hour Calculation:** Productivity analytics
- **Device Tracking:** Browser and device information

## 📊 System Architecture

### Database Tables (9 Total)
1. **users** - User accounts and roles
2. **brands** - Brand entities
3. **marketplaces** - Marketplace entities
4. **shipping_companies** - Shipping company entities
5. **refresh_tokens** - JWT refresh token storage
6. **user_brand_access** - Brand permissions
7. **user_marketplace_access** - Marketplace permissions
8. **user_shipping_access** - Shipping permissions
9. **user_login_history** - Session tracking

### API Endpoints (25 Total)
- **5 Authentication APIs** - Login, logout, registration, profile
- **5 Admin APIs** - User management and analytics
- **5 Brand APIs** - Brand CRUD with bulk operations
- **5 Marketplace APIs** - Marketplace management
- **5 Shipping APIs** - Shipping company management
- **9 Permission APIs** - Granular access control

## 🛠️ Technical Specifications

### Technology Stack
- **Runtime:** Node.js with Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT tokens with bcrypt hashing
- **File Processing:** Direct memory processing (CSV/Excel)
- **Security:** Helmet, CORS, Rate limiting

### File Upload Support
- **Formats:** CSV, Excel (.xlsx, .xls)
- **Size Limit:** 10MB per file
- **Processing:** Direct memory processing (no disk storage)
- **Validation:** Real-time data validation and error reporting

### Performance Features
- **Memory Processing:** No temporary file storage
- **Efficient Queries:** Optimized database operations
- **Rate Limiting:** 100 requests per 15 minutes
- **Connection Pooling:** Prisma connection management

## 🎯 Use Cases

### Employee Management
- Create user accounts with specific permissions
- Track work hours and productivity
- Monitor login patterns and security
- Manage access to different brands and marketplaces

### E-commerce Operations
- Control access to specific brands
- Manage marketplace permissions
- Restrict shipping company access
- Bulk import brand/marketplace data

### Security & Compliance
- Complete audit trail of user activities
- IP-based security monitoring
- Session management and tracking
- Role-based data access control

## 📱 Frontend Integration

### Authentication Flow
```javascript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ email, password, networkType })
});

// API Calls
const data = await fetch('/api/brands', {
  headers: { 'Authorization': `Bearer ${accessToken}` },
  credentials: 'include'
});

// Logout
await fetch('/api/auth/logout', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}` },
  credentials: 'include'
});
```

### File Upload
```javascript
const formData = new FormData();
formData.append('file', csvFile);

const response = await fetch('/api/brands', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}` },
  body: formData
});
```

## 🚨 Error Handling

### Standard Error Codes
- **400:** Bad Request - Invalid data or format
- **401:** Unauthorized - Missing or invalid token
- **403:** Forbidden - Insufficient permissions
- **404:** Not Found - Resource doesn't exist
- **500:** Internal Server Error - Server-side error

### Error Response Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error information"
}
```

## 📋 Getting Started Checklist

### 1. Environment Setup
- [ ] Install Node.js and npm
- [ ] Set up PostgreSQL database
- [ ] Configure environment variables
- [ ] Run database migrations

### 2. First Admin User
- [ ] Create initial admin account
- [ ] Test login functionality
- [ ] Verify token generation

### 3. Basic Configuration
- [ ] Add brands, marketplaces, shipping companies
- [ ] Create regular user accounts
- [ ] Assign permissions to users
- [ ] Test access control

### 4. Integration Testing
- [ ] Test all API endpoints
- [ ] Verify file upload functionality
- [ ] Check permission filtering
- [ ] Monitor login history

## 🔗 Additional Resources

### API Testing
- Use Postman or similar tools for API testing
- Import the provided cURL examples
- Test with both admin and user tokens

### Database Management
- Use Prisma Studio for database visualization
- Monitor query performance
- Regular backup procedures

### Security Best Practices
- Use strong JWT secrets in production
- Enable HTTPS for all communications
- Regular security audits
- Monitor for suspicious activities

## 📞 Support

For technical support or questions about the API documentation:
- Review the specific API documentation files
- Check the error codes and responses
- Verify authentication and permissions
- Test with the provided examples

---

**Last Updated:** January 2024  
**API Version:** 1.0.0  
**Documentation Version:** 1.0.0
