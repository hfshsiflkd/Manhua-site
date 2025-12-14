function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function normalizeUsername(username) {
  return String(username || "").trim();
}

module.exports = { normalizeEmail, normalizeUsername };
