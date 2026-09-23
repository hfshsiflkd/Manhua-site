"use strict";

const { Pool } = require("pg");
const { writesFrozen, isMutatingSql, freezeError } = require("../config/writeGate");

let pool;

function usesTransactionPooler(url) {
  return /:6543\b/.test(url || "") || process.env.PG_POOL_MODE === "transaction";
}

function getPool() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const serverless = process.env.VERCEL === "1" || usesTransactionPooler(url);
  const hosted = /supabase/i.test(url);
  let connectionString = url;
  if (hosted) {
    try {
      const u = new URL(url);
      u.searchParams.delete("sslmode");
      connectionString = u.toString();
    } catch {
      connectionString = url;
    }
  }
  pool = new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX || (serverless ? 1 : 5)),
    ssl: hosted ? { rejectUnauthorized: false } : false,
    allowExitOnIdle: Boolean(serverless),
    idleTimeoutMillis: serverless ? 5000 : 30000,
  });
  return pool;
}

async function query(text, params) {
  if (writesFrozen() && isMutatingSql(text)) throw freezeError("postgres.query");
  const client = getPool();
  if (!client) throw new Error("DATABASE_URL missing");
  return client.query(text, params);
}

async function withTransaction(fn) {
  if (writesFrozen()) throw freezeError("postgres.transaction");
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function closePool() {
  if (!pool) return;
  const current = pool;
  pool = null;
  await current.end();
}

module.exports = { getPool, query, withTransaction, closePool };
