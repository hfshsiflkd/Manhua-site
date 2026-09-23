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

Quota is enforced in PostgreSQL (`arc.editor_quota_ledger`) with `pg_advisory_xact_lock`, reservation/commit/release, and idempotency keys. Finalize commits the actual object byte size. Parallel presign/retry/abort cannot double-count a reserved key. Expired reservations are ignored.

## Deploy sequence (review first)

Do **not** apply this to production until reviewed.

1. Apply `supabase/migrations/20260923120000_self_serve_editor.sql` to isolated/staging PostgreSQL.
2. Deploy backend, then frontend.
3. Smoke with an isolated `@pgitest.local` user only.
4. Production schema + deploy only after approval.

## Rollback

1. Keep serving the previous backend/frontend deploy (role stays `user` for anyone who did not submit).
2. If the migration was applied: new tables can remain unused; do not drop `arc.users.role` values already set to `editor` unless a deliberate data rollback is approved.
3. To stop self-serve: undeploy the `/api/user/become-editor` route / previous SHA. Existing self-serve editors remain editors until an admin changes role.

## Secrets

No new secret env vars. Do not put `DATABASE_URL`, JWT, or R2 keys in this document or in git.
