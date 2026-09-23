# Production cutover plan (not executed)

**Do not cut over until this plan is approved.** Production (`api.arc-read.com`) is still MongoDB. Hosted Supabase `qkxftogqjjdigocfdqmn` is a staging copy only. This document does not change Vercel env or production Mongo.

Cutover is a **frozen truncating remigrate**, not a first import and not upsert-only.

## Deploy commit

Record `git rev-parse HEAD` after this postgres/freeze/reverse commit lands on the branch you deploy. That SHA is the only freeze-capable production deploy. Current `origin/main` before this work (`1f3563f`) does **not** include freeze.

1. Deploy that SHA to production **while still on Mongo** so `API_READ_ONLY` exists before you flip the flag.
2. Do **not** set `DB_DRIVER=postgres` on that first deploy.

Redeploy the same SHA later with Postgres env. Wrong SHA + new DB, or right SHA + Mongo-only freeze code missing, both fail.

## Maintenance window

Reads stay up. Writes freeze for **~30–40 minutes** (dump + Vercel dominate; hosted remigrate is no longer the long pole).

Row-by-row INSERT over laptop→hosted DIRECT RTT caused the first remigrate to take **~24.4 min** (`17:19:17Z`–`17:43:27Z`): ~1712 chapter pages + 1670 audit logs + existence `SELECT`s, each a separate statement.

After batched `VALUES` + existence cache (verified):

| Run | Duration |
| --- | --- |
| Isolated Docker PG | **~0.35 s** |
| Hosted Manhua-site DIRECT `:5432` (2026-09-23, `insertMode=batch`) | **40.2 s** (`elapsedMs=40196`) |
| `verify-source-target` + placeholder report | ~1 min |

Remaining hosted time is leftover per-row collections (`trialdevices` ~7.5 s, editor stats ~9 s). Not worth another pass before cutover.

Budget when you actually cut over:

| Step | Budget |
| --- | --- |
| Announce + pause crons + Redis freeze + `API_READ_ONLY=1` | 5 min |
| Confirm SHA + `GET / readOnly` + Atlas app-write idle | 5–10 min (not a fixed 10s sleep) |
| Mongo oplog dump + isolated restore-verify | 10 min |
| Final truncating sync → hosted PG | **~1 min** (measured 40 s) |
| Verify + placeholders | 2 min |
| Deploy same SHA with `DB_DRIVER=postgres` (still frozen) | 5 min |
| Smoke (reads only) | 5 min |
| Unset freeze / write smoke | 5 min |

If dump or deploy slips, keep the freeze; do not open writes.

## Freeze is not “wait 10 seconds”

A fixed sleep is **not** the drain signal. View-counter flush is already no-op while frozen (and mongoose `bulkWrite` is gated). Do this instead:

1. **Deploy this SHA on Mongo first** (`API_READ_ONLY` unset). Old deployments do not contain `writeGate`; Redis/env cannot freeze them.
2. Confirm every live instance serves this SHA: `GET /` → `{ commit: "<deploy SHA>", readOnly: false, inflightMutations: 0 }`. If `commit` is missing or different, an old instance is still up.
3. `SET arc:write-freeze 1` (if Redis is used), then set `API_READ_ONLY=1` and restart/redeploy.
4. Confirm `GET /` → `readOnly: true` on the same SHA. Mutating HTTP → `503 READ_ONLY`.
5. **Atlas idle**: no application inserts/updates/deletes in oplog (not a wall-clock wait). In-flight requests that passed the gate before freeze can finish; `inflightMutations` is per-instance only, so Atlas is the global signal.
6. Pause operator crons. Jobs in this SHA refuse before `connect` / `syncIndexes`.

Mongo **TTL still runs during freeze** (`chapterreadmonths.expireAt` expireAfterSeconds 0; `registerattempts` 24h). The app cannot insert/update/delete those rows; the mongod TTL monitor can. That is source-of-truth expiry. Capture it with an **oplog dump after Atlas app-writes are idle**. Do not wait for TTL to “settle.” After cutover, Postgres does not auto-delete `expire_at` rows (no TTL equivalent).

Isolated proof: freeze rehearsal blocks mongoose deletes and still allows a native-driver delete (TTL equivalent). `GET /` reports `readOnly`.

## Final sync is truncate + reload

`migrate.js` begins a transaction, `TRUNCATE`s every `arc.*` table in **one** statement, reloads from frozen isolated Mongo `:27018`, rebuilds placeholders, then `COMMIT`. Failure `ROLLBACK`s the previous hosted copy.

Upsert-only is **not** a complete sync: source-deleted rows and leftover placeholders/pgitest rows would remain.

Hosted rehearsal (populated Manhua-site project, not Atlas, not Vercel): inserted stale manhua `ffffffffffffffffffffffff`, remigrated, row gone, leftover `@pgitest.local` gone.

```
truncatedTarget=true quarantine=0 verify ok diffs=[]
views manhua 325/325 chapter 324/324 pages 1712/1712
placeholders: 2 manhua + 8 synthetic chapters (soft-deleted, public leak=0)
publishedOnDeletedParent=0
```

Hosted command (laptop DIRECT `:5432` only):

```bash
cd backend
ALLOW_SUPABASE_MIGRATE=staging npm run test:pg-hosted-resync
# or the same migrate.js flags as below
```

## PG → Mongo reverse (post-open-writes rollback)

`backend/scripts/mongo-pg/reverse.js` copies Postgres back to Mongo with native driver (password hashes **not** re-bcrypted). It upserts then `deleteMany({ _id: { $nin: pgIds } })` so PG deletes win. Rows with `extra.quarantinePlaceholder` are **not** written to Mongo (`bbbbbbbbbbbbbbbbbbbbbb01`, `quarantine-missing-*`, the eight synthetic chapter ids).

The script **refuses** Mongo `:27017` and databases `test` / `admin` / `local` / `config`. Production rollback never points it at live Atlas `test`.

Restore the reverse dump into a **new database name** on the cluster (or isolated `:27018`), verify, then switch `MONGO_URI` path. Do not `mongorestore --drop` onto `test`.

Isolated rehearsal (`:27018/arc_reverse_rehearsal` then `:27018/arc_rollback_switch`):

```bash
cd backend && npm run test:pg-reverse-rehearsal
```

Passed: create/update/delete, bcrypt hash byte-identical, placeholder manhua/chapter **documents** absent, **real** chapter/pages/read-months/favorites/stats attached to placeholder parents kept, dump restored into a new db name without overwriting `test`.

## Hosted vs production

| Surface | Today | Cutover target |
| --- | --- | --- |
| Production API | `MONGO_URI`, default driver Mongo | `DB_DRIVER=postgres` + pooler `DATABASE_URL` `:6543` |
| Hosted Supabase | Staging `arc` (truncating-resync copy) | Same project after **frozen** final sync |
| Isolated Docker | Mongo `:27018`, PG `:55433` | Backup verify + reverse rehearsal |
| Direct PG `:5432` | Laptop migrate/schema/tests | Never on Vercel |
| Undrah / other refs | Blocked | Stay blocked |

Runtime pool: Vercel `PG_POOL_MAX=1`, transaction pooler, SSL. Direct URL stays on the operator laptop in `backend/.env.supabase.local` (gitignored). Auth stays Express JWT, not Supabase Auth. R2/Redis unchanged.

## Sequence (execute only after approval)

### 0. Preconditions

- [x] Dedicated Manhua-site project (not Undrah).
- [x] Schema `arc` on DIRECT `:5432`.
- [x] Isolated restore → hosted migrate, verify `missingInPg=0`, `publishedOnDeletedParent=0`.
- [x] Hosted truncating remigrate rehearsal: stale row dropped, checksums match.
- [x] Isolated freeze rehearsal + HTTP freeze tests.
- [x] Isolated PG→Mongo reverse rehearsal (hashes, finance, CUD, real rows on placeholder parents kept, restore into a new db name).
- [x] Hosted batched remigrate (~40 s) + source-target verify.
- [ ] Commit protections; record deploy SHA.
- [ ] Deploy that SHA to production **on Mongo** (`API_READ_ONLY` unset, `DB_DRIVER` unset).
- [ ] Operator approval of the ~30–40 minute window.

### 1. Announce and freeze writes

1. Banner: site read-only (window below).
2. Pause crons: `pruneDailyViews`, `resetWeeklyViews`, `cleanupAuditLogs`, `mockViews`.
3. Confirm `GET /` `commit` equals the freeze-capable SHA on every instance (no old deployment).
4. If production Redis is configured: `SET arc:write-freeze 1`. Confirm with `GET`.
5. Set production `API_READ_ONLY=1` (Mongo still primary). Redeploy/restart.
6. Confirm `GET /` → `readOnly: true` and the same `commit`; `POST`/`PUT`/`PATCH`/`DELETE` → `503 READ_ONLY`; `GET /api/manhuas` still 200.
7. Wait until Atlas oplog has **no application writes** (views, audit, users, chapters). Do not treat a 10-second sleep as proof. TTL deletes may still appear and are included in the oplog dump.

### 2. Mongo backup + isolated restore

From repo root (never prints URIs):

```bash
node backend/scripts/mongo-pg/backup.js
node backend/scripts/mongo-pg/restore-verify.js
```

Requires oplog dump (`--oplog` / `--oplogReplay`). Restore on `127.0.0.1:27018`. Counts and `_id` checksums must match the manifest for database `test` only.

### 3. Final sync → hosted Postgres

Source is the **frozen** isolated restore, not live Atlas.

```bash
MIGRATE_TARGET=hosted-staging \
MIGRATE_MONGO_URI='mongodb://127.0.0.1:27018/test?directConnection=true' \
ORPHAN_MODE=placeholder \
ALLOW_SUPABASE_MIGRATE=staging \
node backend/scripts/mongo-pg/migrate.js --env-file=backend/.env.supabase.local

MIGRATE_MONGO_URI='mongodb://127.0.0.1:27018/test?directConnection=true' \
ALLOW_SUPABASE_MIGRATE=staging \
node backend/scripts/mongo-pg/verify-source-target.js --env-file=backend/.env.supabase.local

ALLOW_SUPABASE_MIGRATE=staging \
node backend/scripts/mongo-pg/placeholder-report.js --env-file=backend/.env.supabase.local
```

Pass criteria:

- `insertMode=batch`
- `truncatedTarget=true`
- `quarantine=0`
- verify `ok=true`, `diffs=[]` (placeholders excluded; no unexplained extras)
- views: manhua/chapter/pages match
- `publishedOnDeletedParent=0`, `publicPlaceholderLeak=0`
- migrate uses DIRECT `:5432` only (`statement_timeout=0`)

### 4. Backend env / deploy switch (still read-only)

Same SHA as step 0. Vercel production (pooler, not direct):

| Key | Action |
| --- | --- |
| `DB_DRIVER` | set `postgres` |
| `DATABASE_URL` | transaction pooler `:6543` + `sslmode=require` (Manhua-site ref only) |
| `MONGO_URI` | **keep** (unused, rollback) |
| `API_READ_ONLY` | stay `1` |
| `PG_POOL_MAX` | `1` |
| `DATABASE_URL_DIRECT` | do **not** put on Vercel |
| JWT, R2, Redis | unchanged; leave `arc:write-freeze=1` until step 6 |

### 5. Smoke test (writes still frozen)

- `GET /` → `{ message: "Manhua API is running", readOnly: true, commit: "<deploy SHA>" }`.
- `GET /api/manhuas`, home sections, one public chapter GET (no page leak on hidden/deleted parents).
- `GET /api/upload/limits`.
- `POST /api/auth/login` still `503 READ_ONLY`.
- Hosted row counts still match the frozen verify (no view/audit increment from smoke GETs).

If smoke fails: **rollback before opening writes**. Do not unset `API_READ_ONLY`.

### 6. Re-open writes

1. `DEL arc:write-freeze` (if set).
2. Remove `API_READ_ONLY` (or set `0`) on Vercel. Redeploy/restart.
3. Write smoke (operator): login, `/api/auth/me`, one editor/admin path if needed, chapter start/confirm on a known published title.
4. Watch 5xx, Postgres connections, and Atlas (should stay idle).
5. Keep Mongo **read-only unused** 7–14 days. Do not drop Atlas.

## Rollback

### Before writes reopen (`API_READ_ONLY` still 1)

Postgres has not served user writes. Atlas dump is the source of truth.

1. Vercel: unset `DB_DRIVER`, traffic back to Mongo (`MONGO_URI` already present). Leave or remove `DATABASE_URL`.
2. `DEL arc:write-freeze`. Unset `API_READ_ONLY` after Mongo is healthy.
3. Redeploy the previous Mongo commit only if the postgres-capable SHA misbehaves on Mongo.
4. Resume crons.
5. Hosted Postgres is leftover staging; truncating-remigrate later.

**Data loss: none.**

### After writes reopen

New chapter uploads, votes, VIP grants, comments live only in Postgres. Mongo is stale.

1. Set `API_READ_ONLY=1` and `SET arc:write-freeze 1` immediately.
2. Prefer **stay on Postgres** and fix forward if the issue is app/config.
3. If you must return to Mongo **without losing post-cutover writes**:
   1. Keep PG frozen.
   2. Reverse into **isolated** Mongo only:
      ```bash
      REVERSE_MONGO_URI='mongodb://127.0.0.1:27018/arc_rollback_<timestamp>?directConnection=true' \
      ALLOW_SUPABASE_MIGRATE=staging \
      node backend/scripts/mongo-pg/reverse.js --env-file=backend/.env.supabase.local
      ```
   3. Check: new users/chapters present, deleted rows absent, bcrypt hashes unchanged, finance amounts numeric, **no** placeholder manhua/chapter **documents**, but real chapters/reads/stats/favorites that pointed at those ids **are** present.
   4. `mongodump` that isolated db. Restore into a **new Atlas database name** (same cluster is fine):
      ```bash
      mongorestore --uri="$ATLAS_URI" --nsFrom='arc_rollback_*<timestamp>.*' --nsTo='arc_prod_rollback_<date>.*'
      ```
      Do not `--drop` onto `test`. Point `MONGO_URI` at `/arc_prod_rollback_<date>` after counts match. Leave `test` untouched until you choose to drop it later.
   5. Vercel: unset `DB_DRIVER`, set `MONGO_URI` to the new db, deploy, then unset freeze.
4. Never run `reverse.js` against `:27017` or database `test`.
5. Never treat PG placeholders as source documents.

## Integration / rehearsal commands (laptop, not Vercel)

```bash
cd backend
npm run test:pg-freeze-rehearsal
npm run test:pg-integration
npm run test:pg-reverse-rehearsal
# Hosted copy (DIRECT). Cleans leftover pgitest via truncating reload:
ALLOW_SUPABASE_MIGRATE=staging npm run test:pg-hosted-resync
```

## Access still needed from you at cutover time

1. Approval of the ~30–40 minute window.
2. Vercel env edits (pooler URL pasted in Vercel, **not chat**).
3. Redis `SET`/`DEL` of `arc:write-freeze` if production Redis is in use.

Placeholders stay in Postgres only: 2 soft-deleted manhua, 8 synthetic chapters, 1 real chapter hidden because its parent is missing. They are not applied back to production Mongo.
