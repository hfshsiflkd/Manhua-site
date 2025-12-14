const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const JWT_SECRET = process.env.JWT_SECRET || "secret";

function genSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function genJwt(user) {
  return jwt.sign(
    { id: user._id, sessionToken: user.sessionToken || null },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

module.exports = { genSessionToken, genJwt, hashToken };
