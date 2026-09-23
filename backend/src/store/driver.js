"use strict";

function isPostgres() {
  return process.env.DB_DRIVER === "postgres";
}

let guardsInstalled = false;

function installPostgresGuards() {
  if (guardsInstalled || !isPostgres()) return;
  guardsInstalled = true;
  const mongoose = require("mongoose");
  const fail = (name) => {
    const err = new Error(`${name} is forbidden while DB_DRIVER=postgres`);
    err.code = "PG_MONGO_LEAK";
    throw err;
  };
  mongoose.connect = async function connectForbidden() {
    fail("mongoose.connect");
  };
  mongoose.createConnection = function createConnectionForbidden() {
    fail("mongoose.createConnection");
  };
}

function bindModel(mongoModel, pgLoader) {
  if (!isPostgres()) return mongoModel;
  installPostgresGuards();
  return pgLoader();
}

module.exports = { isPostgres, bindModel, installPostgresGuards };
