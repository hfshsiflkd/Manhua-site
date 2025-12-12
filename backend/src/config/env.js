// src/config/env.js
const required = ["MONGO_URI"]; // өөрийнхөө шаардлагатайг нэм

for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing env: ${key}`);
    process.exit(1);
  }
}
