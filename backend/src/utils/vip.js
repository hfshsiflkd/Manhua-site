function computeIsVIP(user) {
  if (!user.vipExpiresAt) return false;
  const d = user.vipExpiresAt instanceof Date ? user.vipExpiresAt : new Date(user.vipExpiresAt);
  return d.getTime() > Date.now();
}

module.exports = { computeIsVIP };
