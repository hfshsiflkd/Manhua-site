# Self-serve editor

Regular users can become editors from Profile and publish their own manhua and chapters immediately. There is no admin approval, review queue, or trusted-editor ladder.

Auth stays Express JWT. Data stays in schema `arc` on PostgreSQL. This is not Mongo/Mongoose-only.

## User flow

1. Register as a normal `user`.
2. Open Profile. The card says: “Өөрийн орчуулсан манхвагаа нийтэлж, уншигчдад хүргээрэй.”
3. Tap **Editor болох** → `/profile/become-editor`.
4. Fill pen name, bio, skills, experience, languages, accept publishing terms (optional HTTPS portfolio).
5. Submit **Editor болоод эхлэх**. The API returns a new JWT with `role=editor`. The client stores it immediately; logout/login is not required. After a full page load the navbar and `/editor/*` gate hydrate from the token so the new role is visible without a second login.
6. Success screen → **Манхва нэмэх** or **Editor удирдлага** (`/editor/*`, existing dashboard).
7. Create manhua, upload cover/chapter images, save draft, preview, publish.

Existing `admin` / `editor` / `translator` accounts are not demoted. They keep their current dashboard links. Legacy editors without an onboarding row stay able to publish; they are not self-serve-quota enrolled.

## Product quotas (self-serve only)

These apply only when `arc.editor_profiles.self_serve = true` (users who used this onboarding). Existing admin/editor/translator rows are not auto-enrolled.

| Limit | Default | Env |
| --- | --- | --- |
| New manhua / rolling window | 5 | `SELF_SERVE_EDITOR_MANHUA_LIMIT_PER_DAY` |
| Upload bytes / rolling window | 500 MiB | `SELF_SERVE_EDITOR_UPLOAD_BYTES_PER_DAY` |
| Window length | 24 hours | `SELF_SERVE_EDITOR_QUOTA_WINDOW_HOURS` |
| Terms version string | `2026-09-23` | `EDITOR_TERMS_VERSION` |
| New Profile onboarding | enabled | `SELF_SERVE_EDITOR_SIGNUP` (`true`/`false`) |

Quota is enforced in PostgreSQL (`arc.editor_quota_ledger`) with `pg_advisory_xact_lock`, reservation/commit/release, and idempotency keys. Finalize commits the actual object byte size. Parallel presign/retry/abort cannot double-count a reserved key. Expired reservations are ignored.

`published_uploads` records who finalized a cover/page. Self-serve attach rules:

- New URLs must belong to the current user, or to a teammate with owner/admin/editor access on that manhua.
- URLs already stored on **this** manhua/chapter may be kept, reordered, and published even if they predate the table.
- An untracked CDN URL is not accepted as “legacy.”

## Frontend build (Vercel)

Production Vercel Root Directory is `frontend`. Install is `npm ci`. Build is `npm run build` (`next build`).

`frontend/next.config.ts` sets `turbopack.root` and `outputFileTracingRoot` to the frontend folder so a parent lockfile cannot steal the workspace and break `next/font/google`. `frontend/vercel.json` records the same install/build commands. `--webpack` is not part of the production command.

## Deploy sequence (review first)

Do **not** apply this to production until reviewed.

1. Apply `supabase/migrations/20260923120000_self_serve_editor.sql` then `20260923131500_self_serve_editor_grants.sql` to isolated/staging PostgreSQL.
2. Confirm `pg_trgm`, table REVOKE from PUBLIC/anon/authenticated, and that RLS is not enabled (same pattern as other `arc` tables).
3. Deploy backend, then frontend (`frontend` root, `npm ci`, `npm run build`).
4. Smoke with an isolated `@pgitest.local` user only, including a real browser cover/page PUT to R2.
5. Production schema + deploy only after approval.

## Rollback

Rolling the backend back to a SHA from before this feature **drops quota enforcement**. Users who already have `role=editor` keep publishing, and the 5 manhua / 500MiB / 24h limits are no longer checked.

To stop **new** Profile onboarding without dropping those limits:

1. Set `SELF_SERVE_EDITOR_SIGNUP=false` on the **current** backend. `POST /api/user/become-editor` returns 403 `SELF_SERVE_SIGNUP_DISABLED` for users who are not already editors. `GET /api/user/editor-onboarding` sets `signupEnabled: false` and `eligible: false`.
2. Keep serving this backend so `editor_quota_ledger` and `published_uploads` checks still run.
3. Frontend hides the “Editor болох” action from that GET flag, but hiding the UI is not authorization.

If only the frontend is rolled back, the become-editor endpoint stays open unless the server flag or an older backend is used.

If the migrations were applied: leave the new tables in place. Do not drop `arc.users.role` values already set to `editor` unless a deliberate data rollback is approved.

## Secrets

No new secret env vars. Do not put `DATABASE_URL`, JWT, or R2 keys in this document or in git.
