# Backup and restore

Production MongoDB is not deleted. Dumps stay outside git, mode `700`, AES-256-CBC encrypted.

## Location

Default: `~/Library/Application Support/arc-read-db-backups/`

Contents:

- `archive.key` — 32-byte key, mode `600`
- `<timestamp>/dump.archive.gz` — mongodump gzip archive (plaintext; delete after restore check if you want only ciphertext)
- `<timestamp>/dump.archive.gz.enc` — encrypted archive
- `<timestamp>/MANIFEST.json` — counts, `_id` sha256 per collection, dump checksums, oplog flag
- `<timestamp>/RESTORE_REPORT.json`

Do not copy these into the repo, Vercel, or a public bucket.

## Commands

From repo root (uses `backend/.env` `MONGO_URI`, never prints it):

```bash
node backend/scripts/mongo-pg/backup.js
node backend/scripts/mongo-pg/restore-verify.js
```

Restore verification brings the archive up in Docker Mongo on `127.0.0.1:27018` and compares **collection counts and sorted `_id` checksums**. A successful `mongodump` exit is not treated as a restore pass.

## Consistency

The Atlas cluster is a replica set (`hello.setName` present, 3 hosts). Backup uses `mongodump --oplog`; restore uses `--oplogReplay`. That captures writes that happened during the dump.

`--oplog` dumps the **whole mongod instance**, not only `test`. The cluster also has `sample_mflix` (tutorial). Application verification is scoped to database `test` only. `sample_mflix` is not migrated.

If oplog permission is missing, the script retries without `--oplog` and the manifest records point-in-time-per-collection semantics. That retry was **not** needed for the 2026-09-22 backup.

## Rollback onto a new database (do not overwrite `test`)

Post-cutover reverse must not `mongorestore --drop` onto the live `test` database.

1. Reverse PG → isolated Mongo db `arc_rollback_<timestamp>` (`reverse.js` refuses `test` and `:27017`).
2. `mongodump` that db (no URI printed).
3. `mongorestore --nsFrom='arc_rollback_<timestamp>.*' --nsTo='arc_prod_rollback_<date>.*'` into a **new** database on the Atlas cluster (or isolated `:27018/arc_rollback_switch` in rehearsal).
4. Compare collection counts / `_id` checksums.
5. Switch `MONGO_URI` path to the new database name. Old `test` stays until you explicitly drop it.

Isolated rehearsal: `npm run test:pg-reverse-rehearsal` copies `arc_reverse_rehearsal` into `arc_rollback_switch` without touching `test`. On Atlas, use `mongorestore --nsFrom/--nsTo` the same way (new database name, never `--drop` onto `test`).

## Restore isolated Postgres

```bash
export MIGRATE_TARGET=isolated
export MIGRATE_MONGO_URI='mongodb://127.0.0.1:27018/test?directConnection=true'
# DATABASE_URL from pg-isolated.env (local Docker only)
node backend/scripts/mongo-pg/migrate.js
node backend/scripts/mongo-pg/verify-isolated-login.js
```

`MIGRATE_TARGET` must be `isolated`. Remote Mongo/Postgres is refused unless extra flags are set. The undrah attendance database is hard-blocked.
