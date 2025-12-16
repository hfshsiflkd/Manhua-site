# Audit Log System - Implementation Summary

## Overview
Comprehensive audit logging system implemented end-to-end (backend + frontend) to track all actions across the site: auth, device, payment/VIP, content CRUD, reading, comments, and admin actions.

## Backend Implementation

### 1. AuditLog Model (`backend/src/models/AuditLog.js`)
- **Fields:**
  - `ts` (Date, indexed) - Timestamp
  - `level` (INFO|WARN|ERROR, indexed)
  - `category` (auth|device|payment|content|reader|comment|admin|system, indexed)
  - `action` (string, indexed)
  - `message` (string)
  - `user` ({ id, username, role }, indexed by user.id)
  - `ip` (string, indexed)
  - `deviceIdHash` (string, indexed) - SHA256 hash of deviceId
  - `method`, `path`, `statusCode`, `durationMs`
  - `requestId` (string, indexed) - Unique per request
  - `meta` (mixed JSON, sanitized)

- **Indexes:**
  - `ts` (descending)
  - `category + action + ts`
  - `user.id + ts`
  - `ip + ts`
  - `requestId`

### 2. Request Middleware (`backend/src/middleware/auditMiddleware.js`)
- **`auditContext`**: Attaches audit context to every request
  - Generates unique `requestId` (crypto.randomUUID or fallback)
  - Captures start time, IP, deviceId, method, path
  - User info added by `protect` middleware

- **`auditRequestEnd`**: Logs request completion
  - Only logs admin and auth routes
  - Captures status code and duration
  - Logs asynchronously (non-blocking)

### 3. Logging Helper (`backend/src/utils/auditLogger.js`)
- **`logAudit(req, { level, category, action, message, meta })`**
  - Sanitizes metadata (masks sensitive keys)
  - Hashes deviceId before storing
  - Logs asynchronously (non-blocking)
  - Handles errors gracefully

- **Sensitive keys masked:** password, token, authorization, cookie, resetToken, otp, secret, apiKey, etc.

### 4. Error Handler Integration (`backend/src/middleware/errorHandler.js`)
- Logs all errors with level "ERROR"
- Trims stack trace (first 5 lines only)
- Includes error code, name, and status

### 5. Explicit Logging Points

#### Auth (`backend/src/controllers/authController.js`)
- ✅ `register_success` - User registration
- ✅ `login_success` - Successful login
- ✅ `login_fail` - Failed login attempt
- ✅ `forgot_password_requested` - Password reset requested
- ✅ `reset_password_success` - Password reset completed
- ✅ `reset_password_fail` - Invalid/expired token

#### Device (`backend/src/middleware/deviceIdCheck.js`)
- ✅ `device_mismatch` - Device ID doesn't match user's registered device

#### Reader (`backend/src/controllers/chapter.public.controller.js`)
- ✅ `chapter_view` - Chapter viewed (with slug, chapterNumber, VIP status)

#### Comment (`backend/src/controllers/commentController.js`)
- ✅ `comment_create` - Comment created
- ✅ `comment_delete` - Comment deleted

#### System
- ✅ `request` - Admin/auth route requests (auto-logged)
- ✅ `error` - System errors (auto-logged)

### 6. API Endpoints (`backend/src/controllers/admin/auditLogController.js`)

#### `GET /api/admin/audit-logs`
**Query params:**
- `q` - Search in message/action/user/ip/path
- `level` - INFO|WARN|ERROR
- `category` - auth|device|payment|content|reader|comment|admin|system
- `action` - Action string (regex)
- `userId` - Filter by user ID
- `ip` - Filter by IP
- `from`, `to` - Date range (ISO strings)
- `page`, `limit` - Pagination

**Response:**
```json
{
  "items": [...],
  "total": 1000,
  "page": 1,
  "limit": 50,
  "totalPages": 20
}
```

#### `GET /api/admin/audit-logs/:id`
Returns single log details.

### 7. Retention Job (`backend/src/jobs/cleanupAuditLogs.js`)
- Deletes logs older than X days (default: 60)
- Configurable via `LOG_RETENTION_DAYS` env variable
- Can be run manually or via cron

**Usage:**
```bash
node backend/src/jobs/cleanupAuditLogs.js
```

## Frontend Implementation

### 1. API Client (`frontend/lib/api.ts`)
- `adminGetAuditLogs(params)` - List logs with filters
- `adminGetAuditLogById(id)` - Get single log
- TypeScript interfaces: `AuditLog`, `AuditLogsResponse`

### 2. Logs Page (`frontend/app/admin/logs/page.tsx`)
- **Header:** "Logs" + subtitle "БҮХ хийсэн үйлдлийн лог"
- **Filters:**
  - Search (debounced 300ms)
  - Level dropdown (INFO/WARN/ERROR)
  - Category dropdown
  - Date range pills (24h/7d/30d)
  - Clear button (shown when filters active)
- **Table (Desktop):**
  - Level badge (color-coded)
  - Time (relative + exact on hover)
  - Category/Action
  - Message (2-line clamp)
  - Actor (user/role)
  - IP/Path
  - Expandable details
- **Cards (Mobile):**
  - Compact layout
  - All essential info
  - Expandable details
- **Features:**
  - Pagination
  - Loading skeletons
  - Empty state
  - Error banner

### 3. Components

#### `LogFilters.tsx`
- Search input with icon
- Level and category dropdowns
- Date range pills
- Clear filters button

#### `LogRow.tsx` (Desktop)
- Table row with expandable details
- Color-coded level badges
- Relative time formatting
- Click to expand

#### `LogCard.tsx` (Mobile)
- Card layout
- All essential info
- Expandable details

#### `LogDetails.tsx`
- Full message
- Request info (requestId, path, status, duration)
- Metadata JSON (pretty-printed)
- Copy buttons (message, JSON, IP, requestId)
- Quick actions (view user logs)

#### `LogSkeleton.tsx`
- Loading skeletons for table and cards

## Security Features

1. **Data Sanitization:**
   - All sensitive keys masked in metadata
   - Passwords, tokens, secrets never logged

2. **Device ID Hashing:**
   - Device IDs hashed (SHA256) before storage
   - Cannot be reverse-engineered

3. **Admin-Only Access:**
   - All audit log endpoints protected by `adminOnly` middleware
   - Frontend page should use existing admin auth guard

## Performance

1. **Async Logging:**
   - All logs written asynchronously (non-blocking)
   - Uses `setImmediate` for request logging

2. **Indexes:**
   - All queryable fields indexed
   - Compound indexes for common queries

3. **Pagination:**
   - Default limit: 50
   - Max limit: 200 (backend enforced)

## Usage Examples

### Backend: Log an action
```javascript
const { logAudit } = require("../utils/auditLogger");

logAudit(req, {
  level: "INFO",
  category: "content",
  action: "manhua_create",
  message: "Manhua created: My Manhua",
  meta: {
    manhuaId: "123",
    title: "My Manhua",
  },
});
```

### Frontend: Filter logs
```typescript
const logs = await adminGetAuditLogs({
  level: "ERROR",
  category: "auth",
  from: "2024-01-01T00:00:00Z",
  page: 1,
  limit: 50,
});
```

## Environment Variables

- `LOG_RETENTION_DAYS` - Days to keep logs (default: 60)

## Future Enhancements

See `frontend/app/admin/logs/IMPROVEMENTS.md` for optional enhancements:
- Export functionality (CSV/JSON)
- Real-time alerts for error spikes
- Trace ID grouping
- Quick actions (block IP, view user)

## Notes

- Existing `ActionLog` model and `/admin/logs` endpoint kept for backward compatibility
- New audit system uses `/admin/audit-logs` endpoint
- All logging is non-blocking and error-tolerant
- Missing user/device info handled gracefully

