// src/middleware/deviceIdCheck.js
const { logAudit } = require("../utils/auditLogger");

exports.checkDeviceId = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: "Authentication required" 
    });
  }

  const deviceId = String(req.headers["x-device-id"] || "").trim();
  
  if (!deviceId) {
    return res.status(400).json({
      success: false,
      message: "Device мэдээлэл дутуу байна. (x-device-id шаардлагатай)",
      code: "MISSING_DEVICE_ID"
    });
  }

  // req.user is already populated by protect middleware — no extra DB query needed
  const userDeviceId = req.user.deviceId || "";
  const userLastDeviceId = req.user.lastDeviceId || "";

  if (deviceId !== userDeviceId && deviceId !== userLastDeviceId) {
    if (req.audit) {
      req.audit.user = {
        id: req.user._id,
        username: req.user.username,
        role: req.user.role,
      };
      logAudit(req, {
        level: "WARN",
        category: "device",
        action: "device_mismatch",
        message: `Device ID mismatch for user: ${user.username}`,
        meta: {
          expectedDeviceId: userDeviceId ? "***" : null,
          providedDeviceId: "***",
        },
      });
    }

    return res.status(403).json({
      success: false,
      message: "Device ID таарахгүй байна. Зөвхөн бүртгэлтэй төхөөрөмжөөс хандах боломжтой.",
      code: "DEVICE_ID_MISMATCH"
    });
  }

  next();
};

