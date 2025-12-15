const { body, param, query } = require("express-validator");

const listUsersValidator = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("q").optional().isString().trim().isLength({ max: 120 }),
  query("role").optional().isIn(["user", "translator", "admin", "editor"]),
  query("vip").optional().isBoolean().toBoolean(),
  query("blocked").optional().isBoolean().toBoolean(),
  query("sort").optional().isString(),
];

const updateUserValidator = [
  param("id").isMongoId(),
  body("username").optional().isString().isLength({ min: 3, max: 50 }),
  body("email").optional().isEmail().normalizeEmail(),
  body("phone").optional().isString().isLength({ max: 30 }),
  body("role").optional().isIn(["user", "translator", "admin", "editor"]),
  body("vipExpiresAt").optional().isISO8601(),
  body("vipLevel").optional().isInt({ min: 0, max: 10 }),
  body("blocked").optional().isBoolean(),
  body("preferredActivities").optional().isArray({ max: 20 }),
  body("workValues").optional().isArray({ max: 20 }),
  body("energyBoosts").optional().isArray({ max: 20 }),
  body("goingOut").optional().isArray({ max: 20 }),
  body("weekend").optional().isArray({ max: 20 }),
  body("hobby").optional().isArray({ max: 20 }),
  body("isActive").optional().isBoolean(),
];

const resetPasswordValidator = [
  param("id").isMongoId(),
  body("newPassword").optional().isString().isLength({ min: 8, max: 100 }),
  body("generateRandom").optional().isBoolean().toBoolean(),
];

module.exports = {
  listUsersValidator,
  updateUserValidator,
  resetPasswordValidator,
};

