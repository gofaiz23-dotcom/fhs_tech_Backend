# Login History & User Tracking Documentation

Base URL: `http://192.168.0.23:5000/api`

## 📋 Overview
Comprehensive user activity tracking system that monitors login sessions, tracks work hours, and provides detailed analytics for admin oversight.

---

## 📊 Login History Features

### Automatic Tracking
- **Login Time:** Recorded when user authenticates
- **Logout Time:** Recorded when user logs out
- **Session Duration:** Calculated in minutes
- **IP Address:** User's network IP address
- **Network Type:** WiFi, 4G, 3G, etc. (from frontend)
- **User Agent:** Browser and device information

### Analytics Provided
- **Total Login Hours:** Cumulative time across all sessions
- **Total Sessions:** Number of login instances
- **Current Session:** Active session details
- **Last Login:** Most recent login timestamp
- **Work Patterns:** Login/logout patterns for productivity tracking

---

## 🔍 Admin Analytics Endpoints

### 1. Get All Users with Login Statistics

**Endpoint:** `GET /api/admin/users`

**Description:** Get comprehensive user list with login analytics (Admin only)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_access_token>"
}
```

**Response (Success - 200):**
```json
{
  "message": "Users retrieved successfully",
  "users": [
    {
      "id": 1,
      "email": "employee1@company.com",
      "role": "USER",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "totalLoginHours": 45.75,
      "totalSessions": 25,
      "lastLogin": "2024-01-20T14:30:00.000Z",
      "currentSession": {
        "loginTime": "2024-01-20T14:30:00.000Z",
        "isActive": true,
        "ipAddress": "192.168.1.100",
        "networkType": "wifi",
        "currentDuration": 120
      }
    },
    {
      "id": 2,
      "email": "employee2@company.com",
      "role": "USER",
      "createdAt": "2024-01-10T09:00:00.000Z",
      "totalLoginHours": 32.25,
      "totalSessions": 18,
      "lastLogin": "2024-01-19T16:45:00.000Z",
      "currentSession": null
    },
    {
      "id": 3,
      "email": "admin@company.com",
      "role": "ADMIN",
      "createdAt": "2024-01-01T08:00:00.000Z",
      "totalLoginHours": 120.5,
      "totalSessions": 75,
      "lastLogin": "2024-01-20T08:00:00.000Z",
      "currentSession": {
        "loginTime": "2024-01-20T08:00:00.000Z",
        "isActive": true,
        "ipAddress": "192.168.1.50",
        "networkType": "ethernet",
        "currentDuration": 480
      }
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET http://192.168.0.23:5000/api/admin/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 2. Get Detailed User Login History

**Endpoint:** `GET /api/admin/users/:id`

**Description:** Get detailed login history for a specific user (Admin only)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_access_token>"
}
```

**URL Parameters:**
- `id` (integer): User ID

**Response (Success - 200):**
```json
{
  "message": "User details retrieved successfully",
  "user": {
    "id": 1,
    "email": "employee1@company.com",
    "role": "USER",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z",
    "brandAccess": [
      {
        "id": 1,
        "name": "Nike",
        "description": "Sports brand",
        "isActive": true,
        "grantedAt": "2024-01-16T10:00:00.000Z"
      }
    ],
    "marketplaceAccess": [
      {
        "id": 1,
        "name": "Amazon",
        "description": "E-commerce platform",
        "isActive": true,
        "grantedAt": "2024-01-16T10:00:00.000Z"
      }
    ],
    "shippingAccess": [
      {
        "id": 1,
        "name": "FedEx",
        "description": "Courier service",
        "isActive": true,
        "grantedAt": "2024-01-16T10:00:00.000Z"
      }
    ],
    "loginHistory": [
      {
        "id": 15,
        "loginTime": "2024-01-20T14:30:00.000Z",
        "logoutTime": null,
        "sessionDuration": null,
        "ipAddress": "192.168.1.100",
        "networkType": "wifi",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "createdAt": "2024-01-20T14:30:00.000Z"
      },
      {
        "id": 14,
        "loginTime": "2024-01-19T09:15:00.000Z",
        "logoutTime": "2024-01-19T17:30:00.000Z",
        "sessionDuration": 495,
        "ipAddress": "192.168.1.100",
        "networkType": "wifi",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "createdAt": "2024-01-19T09:15:00.000Z"
      },
      {
        "id": 13,
        "loginTime": "2024-01-18T08:45:00.000Z",
        "logoutTime": "2024-01-18T16:20:00.000Z",
        "sessionDuration": 455,
        "ipAddress": "192.168.1.100",
        "networkType": "4g",
        "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        "createdAt": "2024-01-18T08:45:00.000Z"
      }
    ]
  }
}
```

**cURL Example:**
```bash
curl -X GET http://192.168.0.23:5000/api/admin/users/1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 📱 User Session Tracking

### Login Process (Automatic)

When a user logs in via `POST /api/auth/login`, the system automatically:

1. **Records Login Time:** Current timestamp
2. **Captures IP Address:** From request headers
3. **Stores Network Type:** From frontend (wifi, 4g, etc.)
4. **Logs User Agent:** Browser/device information
5. **Creates Session Record:** In user_login_history table

**Login Request Example:**
```json
{
  "email": "user@company.com",
  "password": "password123",
  "networkType": "wifi"
}
```

### Logout Process (Automatic)

When a user logs out via `POST /api/auth/logout`, the system automatically:

1. **Records Logout Time:** Current timestamp
2. **Calculates Session Duration:** In minutes
3. **Updates Session Record:** Completes the login history entry
4. **Invalidates Tokens:** Removes refresh token

---

## 📊 Analytics Data Explanation

### User Statistics

#### Total Login Hours
- **Calculation:** Sum of all session durations converted to hours
- **Format:** Decimal hours (e.g., 45.75 = 45 hours 45 minutes)
- **Includes:** Only completed sessions (with logout time)

#### Total Sessions
- **Count:** Number of login instances
- **Includes:** Both completed and active sessions

#### Current Session
- **Active Session:** Currently logged-in session details
- **Duration:** Minutes since login (real-time calculation)
- **Null:** If user is not currently logged in

#### Last Login
- **Timestamp:** Most recent login time
- **Timezone:** UTC format
- **Null:** If user has never logged in

### Session Details

#### Network Type Detection
Frontend sends network information:
```javascript
// Frontend code to detect network type
const networkType = navigator.connection?.effectiveType || 'unknown';

// Possible values: 'wifi', '4g', '3g', '2g', 'ethernet', 'unknown'
```

#### IP Address Tracking
Server automatically captures:
- **IPv4/IPv6:** User's network IP
- **Proxy Detection:** Real IP behind proxies
- **VPN Awareness:** Shows VPN IP if used

#### User Agent Analysis
Captures browser and device information:
- **Browser:** Chrome, Firefox, Safari, Edge
- **OS:** Windows, macOS, Linux, iOS, Android
- **Device:** Desktop, Mobile, Tablet

---

## 🔍 Monitoring & Analytics Use Cases

### 1. Employee Productivity Tracking
```bash
# Get all employees with work hours
curl -X GET http://192.168.0.23:5000/api/admin/users \
  -H "Authorization: Bearer <admin_token>"

# Response shows:
# - Total hours worked
# - Number of sessions
# - Current activity status
```

### 2. Security Monitoring
```bash
# Check specific user's login patterns
curl -X GET http://192.168.0.23:5000/api/admin/users/1 \
  -H "Authorization: Bearer <admin_token>"

# Look for:
# - Unusual IP addresses
# - Different network types
# - Suspicious login times
```

### 3. Remote Work Analytics
- **Network Types:** Track wifi vs mobile usage
- **IP Patterns:** Identify work-from-home vs office
- **Session Duration:** Monitor work patterns
- **Device Usage:** Desktop vs mobile access

### 4. Attendance Tracking
- **Daily Login Times:** When employees start work
- **Session Duration:** How long they work
- **Logout Patterns:** When they finish work
- **Break Analysis:** Multiple sessions per day

---

## 📈 Sample Analytics Reports

### Daily Activity Report
```json
{
  "date": "2024-01-20",
  "activeUsers": 15,
  "totalSessions": 18,
  "averageSessionDuration": 385,
  "totalWorkHours": 115.5,
  "networkBreakdown": {
    "wifi": 12,
    "4g": 4,
    "ethernet": 2
  }
}
```

### User Productivity Summary
```json
{
  "userId": 1,
  "period": "last_7_days",
  "totalHours": 42.25,
  "averageDaily": 6.04,
  "sessionsCount": 7,
  "averageSessionLength": 362,
  "mostActiveDay": "2024-01-18",
  "preferredNetwork": "wifi"
}
```

### Security Alert Example
```json
{
  "userId": 1,
  "alertType": "unusual_ip",
  "message": "User logged in from new IP address",
  "details": {
    "newIP": "203.45.67.89",
    "previousIP": "192.168.1.100",
    "location": "Different city detected",
    "action": "Monitor closely"
  }
}
```

---

## 🚨 Privacy & Compliance

### Data Collection
- **Purpose:** Work hour tracking and security monitoring
- **Retention:** Configurable (default: 1 year)
- **Access:** Admin-only access to detailed logs

### Privacy Considerations
- **IP Anonymization:** Option to mask last octet
- **Data Minimization:** Only collect necessary information
- **User Consent:** Inform users about tracking
- **Right to Deletion:** Ability to purge user data

### Compliance Features
- **GDPR Ready:** Data export and deletion capabilities
- **Audit Trail:** Complete login/logout history
- **Data Encryption:** Sensitive data encrypted at rest
- **Access Logging:** Track who views login data

---

## 🛠️ Frontend Integration

### Real-time Session Tracking
```javascript
class SessionTracker {
  constructor() {
    this.startTime = null;
    this.isActive = false;
  }

  // Start session tracking after login
  startSession() {
    this.startTime = new Date();
    this.isActive = true;
    this.updateSessionDisplay();
    
    // Update every minute
    setInterval(() => {
      if (this.isActive) {
        this.updateSessionDisplay();
      }
    }, 60000);
  }

  // Calculate current session duration
  getCurrentDuration() {
    if (!this.startTime) return 0;
    return Math.floor((new Date() - this.startTime) / (1000 * 60));
  }

  // Update UI with session info
  updateSessionDisplay() {
    const duration = this.getCurrentDuration();
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    document.getElementById('session-time').textContent = 
      `${hours}h ${minutes}m`;
  }

  // End session tracking
  endSession() {
    this.isActive = false;
    this.startTime = null;
  }
}

// Usage
const sessionTracker = new SessionTracker();

// After successful login
sessionTracker.startSession();

// Before logout
sessionTracker.endSession();
```

### Network Type Detection
```javascript
// Detect and send network type during login
function getNetworkType() {
  const connection = navigator.connection || 
                    navigator.mozConnection || 
                    navigator.webkitConnection;
  
  if (connection) {
    return connection.effectiveType; // '4g', 'wifi', etc.
  }
  
  return 'unknown';
}

// Include in login request
const loginData = {
  email: email,
  password: password,
  networkType: getNetworkType()
};
```
