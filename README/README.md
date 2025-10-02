# FHS Tech Backend API Documentation

This directory contains comprehensive documentation for all API endpoints in the FHS Tech Backend system.

## 📋 System Overview

This is a complete employee authentication and authorization system with:

- **JWT-based Authentication** (Access + Refresh tokens)
- **Role-based Access Control** (Admin/User roles)
- **Granular Permissions** (Brand, Marketplace, Shipping access)
- **Login History Tracking** (IP, Network type, Session duration)
- **Bulk Data Import** (CSV/Excel file support)
- **MVC Architecture** with Prisma ORM

## 📁 Documentation Files

### Core APIs
1. **[Authentication APIs](01_Authentication_APIs.md)** - User registration, login, logout, profile
2. **[Admin APIs](02_Admin_APIs.md)** - User management, role updates, access control

### Resource Management APIs  
3. **[Brands APIs](03_Brands_APIs.md)** - Brand CRUD operations
4. **[Marketplaces APIs](04_Marketplaces_APIs.md)** - Marketplace CRUD operations
5. **[Shipping APIs](05_Shipping_APIs.md)** - Shipping company CRUD operations

### Permission & History APIs
6. **[Permissions APIs](06_Permissions_APIs.md)** - User access management
7. **[Login History APIs](07_Login_History_APIs.md)** - Session tracking

## 🔑 Key Features

### Authentication Flow
- **First Admin Registration**: No token required for the very first admin user
- **Subsequent Registrations**: Admin token required for all new user registrations  
- **Access Token**: 15-minute lifetime, stored in memory/Zustand
- **Refresh Token**: 1-day lifetime, HttpOnly cookie with rotation

### User Management
- **Username Field**: Added to all user records for better identification
- **Role-based Access**: Admin (full access) vs User (limited access)
- **Granular Permissions**: Toggle access to specific brands, marketplaces, shipping companies

### Data Filtering
- **User APIs**: Return only data user has access to
- **Admin APIs**: Return all data regardless of permissions
- **Access Control**: Automatic filtering based on user permissions

### File Uploads
- **Bulk Import**: CSV/Excel files processed from memory
- **Supported Formats**: .csv, .xlsx, .xls files
- **Memory Processing**: No temporary file storage required

## 🚀 Quick Start

### Base URL
```
http://192.168.0.23:5000/api
```

### First Time Setup
1. Register first admin (no token required):
```bash
curl -X POST http://192.168.0.23:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin_user",
    "email": "admin@company.com", 
    "password": "securepassword123",
    "role": "ADMIN"
  }'
```

2. Login to get access token:
```bash
curl -X POST http://192.168.0.23:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "securepassword123",
    "networkType": "wifi"
  }'
```

3. Use the returned access token for subsequent API calls

## 📊 Admin Dashboard APIs

For admin dashboards, use these comprehensive APIs:

- **`GET /api/admin/users/basic`** - Basic user details only
- **`GET /api/admin/users/history`** - Users with login history
- **`GET /api/admin/users/access`** - Users with complete access details (brands, marketplaces, shipping)

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt
- **JWT Tokens**: Signed with secret key
- **Refresh Token Rotation**: New token on each refresh
- **Token Hashing**: Database stores hashed refresh tokens
- **HttpOnly Cookies**: Secure refresh token storage
- **CORS Configuration**: Development/production modes
- **Permission Validation**: All endpoints validate user access

## 🛠️ Environment Variables

```env
DATABASE_URL="postgresql://username:password@localhost:5432/dbname"
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="1d"
PORT=5000
NODE_ENV="development"
```

## 📱 Frontend Integration

### Token Storage
- **Access Token**: Store in Zustand with persistence
- **Refresh Token**: Automatic HttpOnly cookie
- **Auto-refresh**: Call `/api/auth/refresh` every 13 minutes

### CORS Setup
```javascript
// Development: All origins allowed
// Production: Specific frontend URL only
credentials: true // Required for cookies
```

## 🚨 Error Handling

All APIs return consistent error responses:

```json
{
  "error": "Error message",
  "details": ["Additional error details"]
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Validation Error
- `401` - Authentication Required
- `403` - Access Denied
- `404` - Not Found
- `500` - Server Error

---

**Note**: All timestamps are in ISO 8601 format (UTC). All APIs require proper authentication headers except for the first admin registration and login endpoints.
