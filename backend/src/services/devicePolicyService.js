const DEVICE_SWITCH_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours rolling window

function nowMs() {
  return Date.now();
}

// Progressive lock durations (in minutes)
const LOCK_DURATIONS_MINUTES = {
  3: 15, // 3rd switch: 15 minutes
  4: 30, // 4th switch: 30 minutes
  5: 60, // 5th switch: 60 minutes
  6: 120, // 6+ switches: 120 minutes (capped)
};

function getLockDurationMinutes(count) {
  if (count < 3) return 0;
  if (count === 3) return LOCK_DURATIONS_MINUTES[3];
  if (count === 4) return LOCK_DURATIONS_MINUTES[4];
  if (count === 5) return LOCK_DURATIONS_MINUTES[5];
  return LOCK_DURATIONS_MINUTES[6]; // 6 or more
}

// Check if user should be exempt from device switch policy
function isExemptFromDevicePolicy(user) {
  // Exempt admin and editor roles
  if (user.role === "admin" || user.role === "editor") {
    return true;
  }
  // Exempt if DEV_MODE and user email/username in whitelist
  if (process.env.DEV_MODE === "true") {
    const devWhitelist = (process.env.DEV_WHITELIST || "")
      .split(",")
      .map((s) => s.trim().toLowerCase());
    if (devWhitelist.length > 0) {
      const userEmail = (user.email || "").toLowerCase();
      const username = (user.username || "").toLowerCase();
      if (devWhitelist.includes(userEmail) || devWhitelist.includes(username)) {
        return true;
      }
    }
  }
  return false;
}

async function applyDeviceSwitchPolicy({ user, deviceId }) {
  // Skip device policy for exempt users
  if (isExemptFromDevicePolicy(user)) {
    user.lastDeviceId = deviceId;
    await user.save();
    return {
      locked: false,
      switched: false,
      switchCount: 0,
      windowStart: null,
      exempt: true,
      devicePolicy: null,
    };
  }

  const prevDevice = user.lastDeviceId || "";
  const isSwitch = prevDevice && prevDevice !== deviceId;
  const now = nowMs();

  // Reset rolling window if > 24h passed since first switch
  if (user.deviceSwitchFirstAt) {
    const windowStartMs = new Date(user.deviceSwitchFirstAt).getTime();
    const windowElapsed = now - windowStartMs;
    if (windowElapsed > DEVICE_SWITCH_WINDOW_MS) {
      user.deviceSwitchFirstAt = new Date(now);
      user.deviceSwitchCount = 0;
    }
  }

  if (isSwitch) {
    // First switch in window - initialize
    if (!user.deviceSwitchFirstAt) {
      user.deviceSwitchFirstAt = new Date(now);
      user.deviceSwitchCount = 1;
    } else {
      user.deviceSwitchCount = (user.deviceSwitchCount || 0) + 1;
    }

    const count = user.deviceSwitchCount || 0;
    const lockMinutes = getLockDurationMinutes(count);

    // Count 1-2: Warning only (no lock)
    if (count <= 2) {
      user.lastDeviceId = deviceId;
      await user.save();
      return {
        locked: false,
        switched: true,
        switchCount: count,
        windowStart: user.deviceSwitchFirstAt,
        devicePolicy: {
          status: "warning",
          count,
          remainingBeforeLock: 3 - count,
          windowHours: 24,
        },
      };
    }

    // Count 3+: Apply progressive lock
    if (lockMinutes > 0) {
      const lockMs = lockMinutes * 60 * 1000;
      user.lockUntil = new Date(now + lockMs);
      user.lockReason = "Too many device switches";
      user.lastDeviceId = deviceId; // Still update device ID
      await user.save();

      const lockUntil = new Date(user.lockUntil);
      const remainingSeconds = Math.ceil((lockUntil.getTime() - now) / 1000);

      return {
        locked: true,
        switched: true,
        switchCount: count,
        windowStart: user.deviceSwitchFirstAt,
        lockUntil: user.lockUntil,
        reason: user.lockReason,
        devicePolicy: {
          status: "locked",
          count,
          minutesLocked: lockMinutes,
        },
        remainingSeconds,
      };
    }
  }

  // No switch or no lock needed - just update device ID
  user.lastDeviceId = deviceId;
  await user.save();

  return {
    locked: false,
    switched: isSwitch,
    switchCount: user.deviceSwitchCount || 0,
    windowStart: user.deviceSwitchFirstAt,
    devicePolicy: null,
  };
}

module.exports = { applyDeviceSwitchPolicy };
