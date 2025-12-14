const crypto = require("crypto");

module.exports = function hashToken(raw) {
  return crypto.createHash("sha256").update(String(raw).trim()).digest("hex");
};
