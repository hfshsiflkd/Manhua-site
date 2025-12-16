// src/middleware/deviceIdCheck.js
// Middleware to enforce deviceId header matches user's deviceId
const User = require("../models/User");
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

  // Fetch user to get current deviceId
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Хэрэглэгч олдсонгүй"
    });
  }

  // Check if deviceId matches user's deviceId or lastDeviceId
  const userDeviceId = user.deviceId || "";
  const userLastDeviceId = user.lastDeviceId || "";

  if (deviceId !== userDeviceId && deviceId !== userLastDeviceId) {
    // Log device mismatch
    if (req.audit) {
      req.audit.user = {
        id: user._id,
        username: user.username,
        role: user.role,
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

