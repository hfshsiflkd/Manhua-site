// src/config/env.js
const required =
  process.env.DB_DRIVER === "postgres" ? ["DATABASE_URL"] : ["MONGO_URI"];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing env: ${key}`);
    process.exit(1);
  }
}
