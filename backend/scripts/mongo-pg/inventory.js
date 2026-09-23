#!/usr/bin/env node
"use strict";

/**
 * Read-only Mongo inventory. Prints collection names, counts, indexes,
 * extra/missing field names, and id checksums. Never prints document
 * values, emails, hashes, URIs, or hostnames.
 */
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { EXPECTED } = require("./expectedCollections");

function die(msg) {
  console.error(msg);
  process.exit(1);
}

if (process.env.DB_DRIVER === "postgres") die("refusing Mongo inventory while DB_DRIVER=postgres");
if (!process.env.MONGO_URI) die("MONGO_URI missing");

function bsonTypeName(value) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return "array";
  if (value instanceof Date) return "date";
  if (typeof value === "object" && value._bsontype) return value._bsontype;
  return typeof value;
}

async function fieldNames(coll, sample) {
  const rows = await coll
    .aggregate([
      { $limit: sample },
      { $project: { keys: { $objectToArray: "$$ROOT" } } },
      { $unwind: "$keys" },
      { $group: { _id: "$keys.k" } },
    ])
    .toArray();
  return rows.map((r) => r._id).sort();
}

async function nestedFieldNames(coll, arrayField, sample) {
  const rows = await coll
    .aggregate([
      { $limit: sample },
      { $unwind: { path: `$${arrayField}`, preserveNullAndEmptyArrays: true } },
      {
        $project: {
          keys: {
            $cond: [
              { $eq: [{ $type: `$${arrayField}` }, "object"] },
              { $objectToArray: `$${arrayField}` },
              [],
            ],
          },
        },
      },
      { $unwind: "$keys" },
      { $group: { _id: "$keys.k" } },
    ])
    .toArray();
  return rows.map((r) => r._id).sort();
}

async function extraFieldTypeSamples(coll, extraFields, sample) {
  if (!extraFields.length) return {};
  const docs = await coll.find({}, { projection: Object.fromEntries(extraFields.map((f) => [f, 1])) }).limit(sample).toArray();
  const types = {};
  for (const field of extraFields) {
    const seen = new Set();
    for (const doc of docs) {
      if (Object.prototype.hasOwnProperty.call(doc, field)) {
        seen.add(bsonTypeName(doc[field]));
      }
    }
    types[field] = [...seen].sort();
  }
  return types;
}

async function idChecksum(coll) {
  const ids = await coll.find({}, { projection: { _id: 1 } }).sort({ _id: 1 }).toArray();
  const hash = crypto.createHash("sha256");
  for (const doc of ids) hash.update(String(doc._id));
  return { count: ids.length, sha256: hash.digest("hex") };
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
  });
  const db = mongoose.connection.db;
  const hello = await db.admin().command({ hello: 1 });
  const collections = await db.listCollections().toArray();
  const report = {
    generatedAt: new Date().toISOString(),
    dbName: db.databaseName,
    topology: {
      replicaSet: Boolean(hello.setName),
      hasSetName: Boolean(hello.setName),
      hostCount: Array.isArray(hello.hosts) ? hello.hosts.length : hello.setName ? null : 1,
      isWritablePrimary: Boolean(hello.isWritablePrimary || hello.ismaster),
      msg: hello.msg || null,
    },
    collections: [],
    unexpectedCollections: [],
    missingExpectedCollections: [],
  };

  const names = collections.map((c) => c.name).filter((n) => !n.startsWith("system.")).sort();
  const expectedNames = Object.keys(EXPECTED);
  report.unexpectedCollections = names.filter((n) => !EXPECTED[n]);
  report.missingExpectedCollections = expectedNames.filter((n) => !names.includes(n));

  for (const name of names) {
    const coll = db.collection(name);
    const count = await coll.estimatedDocumentCount();
    const exact = await coll.countDocuments();
    const indexes = await coll.indexes();
    const stats = await db.command({ collStats: name, scale: 1 }).catch(() => null);
    const fields = exact > 0 ? await fieldNames(coll, Math.min(exact, 20000)) : [];
    const expected = EXPECTED[name];
    const expectedFields = expected ? expected.fields : [];
    const extraFields = fields.filter((f) => expectedFields.length && !expectedFields.includes(f));
    const missingFields = expectedFields.filter((f) => !fields.includes(f));
    const nested = {};
    if (expected?.nested && exact > 0) {
      for (const arrayField of Object.keys(expected.nested)) {
        const found = await nestedFieldNames(coll, arrayField, Math.min(exact, 5000));
        nested[arrayField] = {
          found,
          extra: found.filter((f) => !expected.nested[arrayField].includes(f)),
          missing: expected.nested[arrayField].filter((f) => !found.includes(f)),
        };
      }
    }
    const checksum = await idChecksum(coll);
    report.collections.push({
      name,
      estimatedCount: count,
      count: exact,
      sizeBytes: stats?.size ?? null,
      storageBytes: stats?.storageSize ?? null,
      indexBytes: stats?.totalIndexSize ?? null,
      indexes: indexes.map((idx) => ({
        name: idx.name,
        key: idx.key,
        unique: Boolean(idx.unique),
        sparse: Boolean(idx.sparse),
        expireAfterSeconds: idx.expireAfterSeconds,
        partialFilterExpression: idx.partialFilterExpression || null,
      })),
      fields,
      extraFields,
      missingFields,
      extraFieldBsonTypes: extraFields.length ? await extraFieldTypeSamples(coll, extraFields, 50) : {},
      nested,
      idChecksum: checksum,
    });
  }

  const outDir = process.env.INVENTORY_OUT
    ? process.env.INVENTORY_OUT
    : path.join(__dirname, "../../../docs/mongo-to-postgres");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "live-inventory.json");
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(`wrote ${path.relative(process.cwd(), outFile)}`);
  console.log(`db=${report.dbName} replicaSet=${report.topology.replicaSet} collections=${report.collections.length}`);
  for (const c of report.collections) {
    console.log(
      `${c.name}\tcount=${c.count}\textra=${c.extraFields.length}\tmissing=${c.missingFields.length}\tidsha=${c.idChecksum.sha256.slice(0, 12)}`
    );
  }
  if (report.unexpectedCollections.length) {
    console.log("unexpected", report.unexpectedCollections.join(","));
  }
  if (report.missingExpectedCollections.length) {
    console.log("missing_expected", report.missingExpectedCollections.join(","));
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("inventory failed:", err.name, err.message);
  process.exit(1);
});
