# MongoDB → PostgreSQL mapping

Application database name on Atlas: `test`. The cluster also contains `sample_mflix` (tutorial data). This migration moves **only** `test`. `sample_mflix` is left on MongoDB.

Production site stays on MongoDB until an explicit cutover. MongoDB is not deleted.

## ID strategy

**Choice: keep Mongo ObjectId as `text` primary key (`id`).**

| Option | API impact | FK complexity | Verdict |
| --- | --- | --- | --- |
| ObjectId hex as `text` PK | `_id` stays 24-char hex; JWT `id` unchanged | Direct 1:1 | **Selected** — least breakage |
| UUID PK + `mongo_id` unique | Must keep exposing `mongo_id` as `_id` or rewrite frontend | Every insert needs a map lookup | Rejected for this cutover |

Frontend, JWT, chapter URLs, favorite/bookmark rows, and R2 object metadata already use ObjectId strings. Rewriting them would be a second project.

## Storage that does **not** move

- Cloudflare R2 images and public/canonical URLs stay. No Supabase Storage.
- Redis cache, chapter-read cache, upload idempotency keys stay (`REDIS_URL`).
- JWT secret, bcrypt hashes, `tokenVersion`, `sessionToken`, device lock fields stay as-is.
- Auth stays in the Express backend. **Supabase Auth is not used.**

## Collection → tables

| Mongo collection | Postgres (`arc` schema) | Nested / map handling |
| --- | --- | --- |
| `users` | `users` | Extra profile arrays → `users.extra` jsonb. Embedded `bookmarks` / `recentlyViewed` → `user_list_bookmarks`, `user_recently_viewed` (live data currently empty). Password field → `password_hash` with **no rehash**. |
| `trialdevices` | `trial_devices` | `deviceId` unique |
| `appsettings` | `app_settings` | `value` jsonb (VIP plans live here as `vip.plans`, not in `vipplans`) |
| `vipplans` | `vip_plans` | Collection is empty; table still created |
| `teams` | `teams` + `team_members` | Members array → relational rows (`_id: false` in Mongoose) |
| `teaminvites` | `team_invites` | Enum status/role preserved |
| `manhuas` | `manhuas` + `manhua_genres` + `manhua_owners` + `manhua_daily_views` | `dailyViews` Map → rows so monthly finance/view math is unchanged. Soft-delete `deleted_at` |
| `chapters` | `chapters` + `chapter_pages` + `chapter_daily_views` + `chapter_monthly_views` | Pages are a real table (order, originalName, width/height, imageUrl). Partial unique `(manhua, chapter_number, language) WHERE deleted_at IS NULL` |
| `bookmarks` | `reading_bookmarks` | Distinct from user-list favorites |
| `favorites` | `favorites` | Unique `(user_id, manhua_id)` |
| `comments` | `comments` | XOR check: chapter **or** manhua |
| `requests` | `requests` + `request_monthly_votes` + `request_voters` | Maps exploded so vote uniqueness can be enforced |
| `feedbacks` | `feedback` | Empty today |
| `financemonths` | `finance_months` + `finance_revenue_events` | Empty today; amounts `numeric(14,2)`, never recalculated |
| `editormonthstats` | `editor_month_stats` | Historical view totals copied as-is |
| `editormanhuamonthstats` | `editor_manhua_month_stats` | Historical breakdown copied as-is |
| `chapterreads` | `chapter_reads` | Empty today |
| `chapterreadmonths` | `chapter_read_months` | TTL `expireAt` stored; cleanup job replaces Mongo TTL |
| `auditlogs` | `audit_logs` | `meta` jsonb; extra `__v` → `mongo_v` |
| `actionlogs` | `action_logs` | Empty today |
| `registerattempts` | `register_attempts` | Collection absent (TTL). Table created for runtime |

Unknown fields are copied into `extra` jsonb and listed in the migration report. They are not dropped.

## Live extras vs models (2026-09-22 inventory)

- `users` extra keys (arrays): `energyBoosts`, `goingOut`, `hobby`, `preferredActivities`, `weekend`, `workValues` → `users.extra`. Not secrets.
- `auditlogs` extra: `__v` → `mongo_v`.
- Chapter pages in production have `pageNumber`, `imageUrl`, `originalName`, `width`, `height`. No `sourceUrl` stored (canonicalized on write).
- `vipplans` and `financemonths` are empty. VIP catalog is `appsettings.vip`.
- Soft-delete indexes exist; chapter unique index is partial `{ deletedAt: null }`.

## Query notes (Mongo vs Postgres)

- Manhua search is case-insensitive regex on `title` / `titleEn`. Postgres uses `ILIKE` + `pg_trgm`. Mongolian collation can differ from Mongo's default Unicode regex; isolated tests must compare ranking for Cyrillic queries.
- Map iteration order is not significant; day/month keys are stored explicitly.
- Mongoose `Number` view counters → `bigint`. Money → `numeric(14,2)` (no IEEE float).
- Missing Mongo field vs explicit `null`: SQL NULL. Mongoose defaults are applied only where the schema default is required for NOT NULL columns (booleans, counters, empty strings).

## Runtime access

- Backend uses `pg` against transaction-mode pooler on Vercel (`prepare: false`, small pool). Direct `5432` is for migrations only.
- Schema `arc` is not in PostgREST `public`. `anon` / `authenticated` are revoked.
- Service-role / DB password stay server-side. Browser never queries these tables.

## Local env (never chat, never git, never Vercel production yet)

Copy names into **`backend/.env`** only (`backend/.env.example` lists them). Frontend `.env` must not get these. Production `MONGO_URI` stays as-is.

| Variable | Where it goes | Which URL |
| --- | --- | --- |
| `SUPABASE_URL` | `backend/.env` | Project API URL: `https://<PROJECT_REF>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | `backend/.env` | Publishable (`sb_publishable_…`). Not `NEXT_PUBLIC_*`. |
| `SUPABASE_SECRET_KEY` | `backend/.env` | Secret (`sb_secret_…`). Server only. Replaces old `service_role` JWT for this project. |
| `SUPABASE_JWKS_URL` | `backend/.env` | `https://<PROJECT_REF>.supabase.co/auth/v1/.well-known/jwks.json` (unused while Express JWT stays) |
| `DATABASE_URL` | `backend/.env` for **local/staging Express** | **Transaction pooler `:6543`**: `postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres?sslmode=require` |
| `DATABASE_URL_DIRECT` | `backend/.env` for **migrations only** | **Direct `:5432`**: `postgresql://postgres:<DB_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require` |
| `DB_DRIVER` | local/staging only | `postgres` to use `pg` stores. Omit or `mongo` in production. |
| `ALLOW_SUPABASE_MIGRATE` | local only when applying schema to hosted staging | `staging`. Never set on production Vercel. |

The publishable/secret keys are **not** a Postgres connection string. Schema and `migrate.js` need `DATABASE_URL` / `DATABASE_URL_DIRECT` from **Project Settings → Database**. Isolated Docker still uses `127.0.0.1:55433` and does not need the hosted pooler.

`@supabase/server` is installed on the backend. Express table access stays on `pg` + schema `arc`. Do not put these keys on the browser client.

## Orphan / quarantine

Default migrate mode quarantines rows with missing FKs. Isolated remigrate can use `ORPHAN_MODE=placeholder` (or `--orphan-mode=placeholder`): insert **soft-deleted** placeholder `manhuas` / `chapters` (`deleted_at` set) so orphan pages, monthly reads, and related favorite/stat rows can load. Public lists hide them via `deleted_at`. Production Mongo is not rewritten.

## Jobs / Redis / R2

- `cleanupAuditLogs` and `pruneDailyViews` / `resetWeeklyViews` need SQL equivalents before cutover.
- `emailQueue` is in-process nodemailer, not BullMQ. `package.json` `worker` script is unused.
- Chapter create idempotency remains Redis.
- R2 presign/finalize unchanged.
