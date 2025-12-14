function computeIsVIP(user) {
  if (!user.vipExpiresAt) return false;
  return user.vipExpiresAt.getTime() > Date.now();
}

module.exports = { computeIsVIP };
