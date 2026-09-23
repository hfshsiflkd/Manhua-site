#!/usr/bin/env node
"use strict";
const bcrypt = require("bcryptjs");
const { Client } = require("pg");

(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const r = await pg.query(
    "SELECT username, role, password_hash, token_version FROM arc.users WHERE email=$1",
    ["pg-migrate-test@test.local"]
  );
  if (r.rowCount !== 1) throw new Error("test user missing");
  const ok = await bcrypt.compare("migrate-test-pass-9", r.rows[0].password_hash);
  if (!ok) throw new Error("bcrypt compare failed");
  if (r.rows[0].password_hash.includes("migrate-test-pass-9")) {
    throw new Error("password stored in plaintext");
  }
  console.log("isolated_test_user_bcrypt_ok", true, "role", r.rows[0].role, "token_version", r.rows[0].token_version);
  await pg.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
