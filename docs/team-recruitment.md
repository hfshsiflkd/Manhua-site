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

1. Isolated/staging Postgres: `supabase/migrations/20260923153000_team_recruitment.sql`
2. Deploy backend, then frontend.
3. Smoke with `@pgitest.local` users only.

## Rollback

- Set `TEAM_RECRUITMENT_ENABLED=false` on the current backend to stop new applications/acceptance without dropping members.
- Rolling the backend/frontend to a pre-feature SHA hides the board; leave the new tables in place. Do not `DELETE FROM arc.team_members` created by this feature unless a data rollback is explicitly approved.

## Rate limits

- Create listing: `TEAM_RECRUITMENT_CREATE_MAX` / window (default 10 / hour / user)
- Apply: `TEAM_RECRUITMENT_APPLY_MAX` / window (default 20 / hour / user)
