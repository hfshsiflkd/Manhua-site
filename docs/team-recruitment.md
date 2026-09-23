# Team recruitment board

Editors who already own or admin a team can post “find people” listings. Logged-in readers apply. Accepting an application adds the applicant as a **team `editor` member** using the existing `arc.team_members` table. It does **not** create a second membership/invite system, change site `admin`/`editor`/`translator` roles, or enroll anyone in self-serve publisher quota.

Job titles on a listing (`translation`, `cleanup`, `typesetting`, `proofreading`) are work types, not authorization roles.

## Membership / role

- Accept runs in one PostgreSQL transaction: `application.status='accepted'` + `INSERT … ON CONFLICT DO NOTHING` into `arc.team_members` with team role `editor`.
- Pending `arc.team_invites` for the same team+user are marked `accepted` so invite and application cannot both stay pending.
- Site `users.role` is unchanged. A regular `user` can work on that team’s manhua because `/api/editor/manhuas/*` (except **create manhua**) and chapter routes allow staff **or** team members.
- `POST /api/editor/manhuas` still requires `admin`/`editor`/`translator`. Team-only members cannot publish personal manhua or skip Profile → Editor болох / quota.
- Applicant JWT is not returned to the approver. The applicant keeps their session; `GET /api/user/workspace` (DB) sets `teamMember` so the next page load shows Editor access without a new token.

## Public vs private

Public `/api/recruitment` returns listing fields only (no applicant list, email, device, VIP, finance). Application bodies are visible to the applicant, that team’s owner/admin, and site admin.

Draft/hidden/deleted manhua (`deleted_at`, quarantine placeholder, or no published chapter) never contribute title/cover on the public board.

Expired `open` rows are treated as closed in query (`expires_at > now()`). No cron is required to stop applications.

## Feature flag

`TEAM_RECRUITMENT_ENABLED` (default on). `false`/`0`/`off` blocks create/apply/accept/withdraw. Existing memberships stay. Public GET still works for already-published listings.

## Deploy (review first — do not apply to production in this change)

1. Isolated/staging Postgres: `supabase/migrations/20260923153000_team_recruitment.sql` (already in production).
2. For editor self-serve team create (review only, not production in this change): `supabase/migrations/20260923180000_self_serve_team_creation.sql`
3. Deploy backend, then frontend.
4. Smoke with `@pgitest.local` users only.

## Rollback

- Set `TEAM_RECRUITMENT_ENABLED=false` on the current backend to stop new applications/acceptance without dropping members.
- Rolling the backend/frontend to a pre-feature SHA hides the board; leave the new tables in place. Do not `DELETE FROM arc.team_members` created by this feature unless a data rollback is explicitly approved.

## Team-only uploads

A recruited `role=user` member may presign/finalize **chapter** and **cover** images only when `manhuaId` or `slug` is sent and they currently belong to that manhua’s team. Staff (`admin`/`editor`/`translator`) keep unscoped upload. After the member is removed, the same JWT, an old upload token, and chapter mutations all 403.

Team-only members are not unlimited: they share the self-serve daily upload byte cap (`SELF_SERVE_EDITOR_UPLOAD_BYTES_PER_DAY`, default 500MiB / 24h). Self-serve editors (`editor_profiles.self_serve=true`) keep that upload cap and the 5 manhua/24h cap even after joining a team — do not skip by `role=editor` alone. Legacy staff (`admin` / non-self-serve `editor` / `translator`) skip these caps. Attaching a page URL still requires `published_uploads` provenance (own or teammate).

## Team create

Active site `editor` and `admin` may `POST /api/editor/teams`. Regular `user`, team-only members, and `translator` stay blocked. The Teams page shows **Баг үүсгэх** to editors/admins; other visitors see Profile → Editor болох.

`SELF_SERVE_TEAM_CREATION_ENABLED` (default on) is separate from `TEAM_RECRUITMENT_ENABLED`. `false`/`0`/`off` blocks **new self-serve creates only**. Site admin can still create. Existing teams keep working.

Create runs in one PostgreSQL transaction: `arc.teams` row + creator `team_members.role='owner'`. Owner is always `req.user`. Body `ownerId` / `role` / `members` are ignored. `Idempotency-Key` plus `pg_advisory_xact_lock(hashtext('team-create:'||userId))` stop double-submit and concurrent cap bypass.

Non-admin editors may own at most `SELF_SERVE_TEAM_ACTIVE_LIMIT` (default 2) **active** teams. Active = current `team_members.role='owner'` on existing `arc.teams` rows. Teams are **hard-deleted** (no `deleted_at`); deleting a team drops it from the count. Editors already over the cap keep old teams and cannot create more. Site admin is exempt. Rate limit: `SELF_SERVE_TEAM_CREATE_MAX` / window (default 5 / hour / user; admin skipped).

Creating a team does **not** skip self-serve 500MiB/24h upload, 5 manhua/24h, team-only upload quota, or legacy staff exemption.

Display names are not unique. URLs keep the 24-hex team id (no slug column).

## Rate limits

- Create listing: `TEAM_RECRUITMENT_CREATE_MAX` / window (default 10 / hour / user)
- Apply: `TEAM_RECRUITMENT_APPLY_MAX` / window (default 20 / hour / user)
- Create team: `SELF_SERVE_TEAM_CREATE_MAX` / window (default 5 / hour / user; site admin skipped)
