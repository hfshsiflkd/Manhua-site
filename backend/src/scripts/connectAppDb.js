"use strict";

const connectDB = require("../config/db");
const { isPostgres } = require("../store/driver");

async function connectAppDb() {
  return connectDB();
}

async function disconnectAppDb() {
  if (isPostgres()) {
    const { closePool } = require("../db/postgres");
    await closePool();
    return;
  }
  const mongoose = require("mongoose");
  if (mongoose.connection.readyState) await mongoose.disconnect();
}

module.exports = { connectAppDb, disconnectAppDb, isPostgres };
