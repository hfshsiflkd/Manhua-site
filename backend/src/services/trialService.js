const TrialDevice = require("../models/TrialDevice");
const { getSetting } = require("../services/settingsService");

async function applyTrialVIP({ user, deviceId, ip }) {
  const trialEnabled = await getSetting("trial.enabled", true);
  const trialDays = await getSetting("trial.days", 3);

  let trialGranted = false;

  if (trialEnabled && !user.hasUsedTrial) {
    const existed = await TrialDevice.findOne({ deviceId });

    if (!existed) {
      user.vipExpiresAt = new Date(
        Date.now() + Number(trialDays) * 24 * 60 * 60 * 1000
      );
      user.hasUsedTrial = true;
      user.trialGrantedAt = new Date();
      trialGranted = true;

      await TrialDevice.create({
        deviceId,
        firstUserId: user._id,
        firstGrantedAt: user.trialGrantedAt,
        ip,
      });
    } else {
      user.hasUsedTrial = true; // optional: энэ device өмнө trial авсан тул
      trialGranted = false;
    }
  }

  return { trialGranted };
}

module.exports = { applyTrialVIP };
