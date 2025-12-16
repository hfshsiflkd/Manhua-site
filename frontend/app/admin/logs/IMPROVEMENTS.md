# Admin Logs - Suggested Improvements (Optional)

This document lists optional enhancements that can be implemented incrementally without breaking existing functionality.

## 1. Log Levels + Categories

**Backend Changes:**
- Add `level` field to ActionLog model: `"INFO" | "WARN" | "ERROR"`
- Add `category` field: `"auth" | "payment" | "content" | "admin" | "system"`
- Update `logAction` utility to accept level and category

**Frontend Changes:**
- Update filters to include category dropdown
- Add category badges to log rows/cards
- Color-code by category

## 2. Trace ID for Grouping Related Events

**Backend Changes:**
- Add `requestId` or `traceId` field to ActionLog model
- Generate unique trace ID per request (middleware)
- Add endpoint: `GET /admin/logs/trace/:traceId` to get all logs for a trace

**Frontend Changes:**
- Show trace ID in log details
- Add "View related logs" button that filters by trace ID
- Group logs by trace ID in a collapsible view

## 3. Export Functionality

**Backend Changes:**
- Add endpoint: `GET /admin/logs/export?format=csv|json&...filters`
- Return CSV or JSON file with filtered logs

**Frontend Changes:**
- Add "Export" button in filters bar
- Show export modal with format selection (CSV/JSON)
- Download file on click

## 4. Alerts for Error Spikes

**Backend Changes:**
- Add endpoint: `GET /admin/logs/stats?timeWindow=10m`
- Return error count in last N minutes
- Optional: WebSocket for real-time alerts

**Frontend Changes:**
- Add alert banner when error count > threshold
- Show error spike indicator in header
- Optional: Real-time updates via WebSocket

## 5. Auto-Retention (Cron Job)

**Backend Changes:**
- Add cron job to delete logs older than X days
- Configurable retention period (env variable)
- Optional: Archive old logs before deletion

**Implementation:**
```javascript
// backend/src/jobs/cleanupLogs.js
const cron = require('node-cron');
const ActionLog = require('../models/ActionLog');

cron.schedule('0 2 * * *', async () => {
  const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || '90');
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  await ActionLog.deleteMany({ createdAt: { $lt: cutoffDate } });
});
```

## 6. Security: Mask Sensitive Data

**Backend Changes:**
- Add utility function to mask tokens/passwords in log payloads
- Update `logAction` to sanitize metadata before saving

**Implementation:**
```javascript
// backend/src/utils/sanitizeLog.js
function sanitizeLogData(data) {
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'authToken'];
  const sanitized = { ...data };
  
  for (const key of sensitiveKeys) {
    if (sanitized[key]) {
      sanitized[key] = '***MASKED***';
    }
  }
  
  return sanitized;
}
```

## 7. Admin Quick Actions

**Frontend Changes Only (if features exist):**
- Add "Quick Actions" dropdown in LogDetails component
- Show actions based on log type:
  - For user-related logs: "View User Profile", "Block User", "Disable User"
  - For IP-related logs: "Block IP" (if IP blocking exists)
- Link to existing admin pages/APIs

**Example:**
```tsx
{log.user && (
  <div className="mt-4 pt-4 border-t border-slate-800">
    <h4 className="text-xs font-semibold text-slate-300 mb-2">Quick Actions</h4>
    <div className="flex gap-2">
      <Link href={`/admin/users/${log.user._id}`} className="text-xs text-cyan-400 hover:text-cyan-300">
        View User
      </Link>
      <button onClick={() => handleBlockUser(log.user._id)} className="text-xs text-red-400 hover:text-red-300">
        Block User
      </button>
    </div>
  </div>
)}
```

## Implementation Priority

1. **High Priority:**
   - Log levels + categories (improves filtering)
   - Security: Mask sensitive data (critical for security)

2. **Medium Priority:**
   - Export functionality (useful for compliance/audits)
   - Trace ID (helps debug issues)

3. **Low Priority:**
   - Alerts (nice to have)
   - Auto-retention (can be done manually for now)
   - Quick actions (depends on existing features)

## Notes

- All backend changes should be optional and backward-compatible
- Frontend should gracefully handle missing fields
- Test thoroughly before deploying to production
- Consider database indexes for new filterable fields

