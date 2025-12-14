const SWITCH_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 цаг
const SWITCH_THRESHOLD = 3; // 3 дахь switch-ээс lock эхэлнэ

const LOCK_DURATIONS_MS = {
  3: 1 * 24 * 60 * 60 * 1000, // 3rd -> 1 day
  4: 3 * 24 * 60 * 60 * 1000, // 4th -> 3 days
  5: 7 * 24 * 60 * 60 * 1000, // 5+ -> 7 days
};

function getLockDurationMs(switchCount) {
  if (switchCount <= 2) return 0;
  if (switchCount === 3) return LOCK_DURATIONS_MS[3];
  if (switchCount === 4) return LOCK_DURATIONS_MS[4];
  return LOCK_DURATIONS_MS[5];
}

module.exports = {
  SWITCH_WINDOW_MS,
  SWITCH_THRESHOLD,
  getLockDurationMs,
};
