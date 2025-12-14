const {
  SWITCH_WINDOW_MS,
  SWITCH_THRESHOLD,
  getLockDurationMs,
} = require("../config/authPolicy");

function nowMs() {
  return Date.now();
}

async function applyDeviceSwitchPolicy({ user, deviceId }) {
  const prevDevice = user.lastDeviceId || "";
  const isSwitch = prevDevice && prevDevice !== deviceId;

  const wStart = user.deviceSwitchWindowStart
    ? user.deviceSwitchWindowStart.getTime()
    : 0;

  const inWindow = wStart && nowMs() - wStart <= SWITCH_WINDOW_MS;

  if (isSwitch) {
    if (!inWindow) {
      user.deviceSwitchWindowStart = new Date(nowMs());
      user.deviceSwitchCount = 1;
    } else {
      user.deviceSwitchCount = (user.deviceSwitchCount || 0) + 1;
    }

    const count = user.deviceSwitchCount || 0;
    const lockMs = getLockDurationMs(count);

    if (lockMs > 0 && count >= SWITCH_THRESHOLD) {
      user.lockUntil = new Date(nowMs() + lockMs);
      user.lockReason = `device_switch_${count}`;

      await user.save();

      return {
        locked: true,
        switched: true,
        switchCount: count,
        windowStart: user.deviceSwitchWindowStart,
        lockUntil: user.lockUntil,
        reason: user.lockReason,
      };
    }
  }

  // lock биш бол lastDeviceId шинэчилнэ
  user.lastDeviceId = deviceId;

  return {
    locked: false,
    switched: isSwitch,
    switchCount: user.deviceSwitchCount || 0,
    windowStart: user.deviceSwitchWindowStart,
  };
}

module.exports = { applyDeviceSwitchPolicy };
