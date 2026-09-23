-- Additive index for public creator profile manhua lists.
-- Does not change tables, RLS, or grants. Safe to re-run.

CREATE INDEX IF NOT EXISTS manhuas_created_by_updated_idx
  ON arc.manhuas (created_by, updated_at DESC)
  WHERE deleted_at IS NULL;

INSERT INTO arc.migration_checkpoints (id, phase, status, detail, updated_at)
VALUES (
  '20260923140000_creator_public_indexes',
  'schema',
  'applied',
  '{"indexes":["manhuas_created_by_updated_idx"]}'::jsonb,
  now()
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail, updated_at = now();
