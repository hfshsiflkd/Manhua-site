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

## Production PostgreSQL (`arc` schema)

Live API data is on hosted Postgres (`qkxftogqjjdigocfdqmn`), schema `arc`. Mongo dumps above do **not** include writes after the Mongo → Postgres cutover.

Do not restore this dump onto production. Do not store dumps in git, Vercel, or a public bucket. Scripts never print connection strings, passwords, or row contents.

### Location and key

Default root (mode `700`): `~/Library/Application Support/arc-read-db-backups/`

| Path | Purpose |
| --- | --- |
| `pg.archive.key` | 32-byte AES key, mode `600`. Lives in the **root**, not inside a dump folder. |
| `LATEST_PG` | Absolute path of the newest Postgres dump directory |
| `pg-<timestamp>/arc.dump.enc` | Encrypted custom-format `pg_dump` |
| `pg-<timestamp>/MANIFEST.json` | Table/row counts, per-table data SHA-256, constraint/index names, dump checksums |
| `pg-<timestamp>/RESTORE_REPORT.json` | Isolated restore comparison |

Plaintext `arc.dump` is deleted after a passing restore check.

**Key storage:** keep `pg.archive.key` on this machine (root of the backup dir) **and** a copy in a password manager or encrypted disk that is **not** stored next to `arc.dump.enc` (different volume / 1Password / Keychain). Mongo dumps use a separate `archive.key`. Losing `pg.archive.key` makes the ciphertext unreadable. Do not commit the key, do not put it in the timestamp folder, iCloud Shared, Slack, or git.

### Commands

From repo root (uses gitignored `backend/.env.supabase.local`, session pooler `:5432`, read-only):

```bash
ALLOW_PROD_PG_DUMP=1 node backend/scripts/mongo-pg/pg-backup.js
ALLOW_PG_RESTORE_VERIFY=1 node backend/scripts/mongo-pg/pg-restore-verify.js
```

Backup holds a `REPEATABLE READ READ ONLY` transaction, checksums `arc` in that snapshot, then `pg_dump --snapshot` (custom format, schema `arc`, extensions `citext` / `pg_trgm` / `pgcrypto` created on restore). Restore spins a throwaway `postgres:17` on `127.0.0.1:55434` (not production, not isolated test `:55433`), compares, then removes the container and the plaintext dump.

Decrypt + restore by hand (isolated only):

```bash
cd "$BACKUP_ROOT/pg-<timestamp>"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -in arc.dump.enc -out arc.dump -pass file:../pg.archive.key
# new local Postgres 17, then:
#   CREATE EXTENSION IF NOT EXISTS citext;
#   CREATE EXTENSION IF NOT EXISTS pg_trgm;
#   CREATE EXTENSION IF NOT EXISTS pgcrypto;
pg_restore --no-owner --no-privileges --exit-on-error --dbname=arc_restore arc.dump
```

### 2026-09-23 production dump (verified)

| Field | Value |
| --- | --- |
| Stamp | `pg-2026-09-23T04-49-05-922Z` |
| Generated (UTC) | `2026-09-23T04:49:33.999Z` |
| Mode | `repeatable-read-snapshot` |
| Tables / rows | 38 / 4567 |
| Constraints / FKs / indexes / sequences | 110 / 48 / 87 / 1 |
| Dump SHA-256 | `f2260bcd091f489e636b93fc0d63571f1ec1a026c784bce2aafd8c71b7361786` |
| Encrypted SHA-256 | `7f928b0e84d693a79b588cf802fec572f7f5fd2a01d1ca1fc830611f1663c749` |
| Data SHA-256 (normalized row hashes) | `9f5a8b3f99dbdec9410be6c6fbd730abb897b495fc2e2fb91e8922b451bb590f` |
| Encrypted size | 297952 bytes |
| Restore | `postgres:17-alpine` `127.0.0.1:55434` `arc_restore` — PASSED, then container removed |

Per-table counts and checksums are in that folder’s `MANIFEST.json`. Constraint/index **names and counts** are compared after restore (`pg_get_constraintdef` quoting can differ); row checksums must match exactly.

### Daily automation (proposal only — not enabled)

Do not turn on paid Supabase PITR without a separate approval. Dashboard daily backups / PITR remain **unverified** (no management-API token).

| Option | Retention | Cost | Notes |
| --- | --- | --- | --- |
| Local launchd/cron: the two commands above | 7 daily + 4 weekly folders | $0 compute; ~300 KiB/day encrypted (~10 MiB/month) | Best next step. Copy `pg.archive.key` off-box separately. |
| Encrypted `.enc` copy to a private disk or Backblaze B2 | same | B2 ~$0.006/GB-month (negligible at this size) | Upload ciphertext only; key never in the bucket. |
| Supabase Pro included daily backups | 7 days | $25/mo Pro (only if the org is already Pro) | Restore is in Dashboard and causes downtime. Confirm plan first. |
| Supabase PITR add-on | 7 / 14 / 28 days | ~$100 / $200 / $400 per month + Small compute | Replaces daily backups; not covered by Spend Cap. Do not enable now. |

Suggested local retention prune (run after a passing verify): keep the last 7 `pg-*` directories; keep one per week for a month; delete older folders (not the key file).

Example `launchd` interval (not installed): `StartCalendarInterval` hour 3 minute 15, `WorkingDirectory` repo root, environment `ALLOW_PROD_PG_DUMP=1` then `ALLOW_PG_RESTORE_VERIFY=1`. Logs must not capture stdout that could include paths you consider sensitive; the scripts already omit secrets.
