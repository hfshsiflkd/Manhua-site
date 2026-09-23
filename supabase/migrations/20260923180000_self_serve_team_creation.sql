-- Self-serve team creation indexes. Does not add a second membership model.
-- Display names stay non-unique. Teams are addressed by 24-hex id (no slug column).
-- Do not apply to production until reviewed.

-- Active ownership = current team_members.role='owner' rows.
-- Teams are hard-deleted (no deleted_at). Deleted teams drop out of the count.
CREATE INDEX IF NOT EXISTS team_members_owner_user_idx
  ON arc.team_members (user_id)
  WHERE role = 'owner';

-- Replay double-submit / retry for the same creator + Idempotency-Key.
CREATE UNIQUE INDEX IF NOT EXISTS teams_creator_idempotency_idx
  ON arc.teams (created_by, (extra->>'idempotencyKey'))
  WHERE extra->>'idempotencyKey' IS NOT NULL;

INSERT INTO arc.migration_checkpoints (id, phase, status, detail, updated_at)
VALUES (
  '20260923180000_self_serve_team_creation',
  'schema',
  'applied',
  '{"indexes":["team_members_owner_user_idx","teams_creator_idempotency_idx"],"softDelete":false,"ownershipCount":"team_members.role=owner on existing teams"}'::jsonb,
  now()
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail, updated_at = now();
