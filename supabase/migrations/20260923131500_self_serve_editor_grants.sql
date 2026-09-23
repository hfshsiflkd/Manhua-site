-- Match arc_init: Express uses the DB owner role. PostgREST anon/authenticated must not read these tables.
-- Additive. Safe to re-run. Does not enable RLS (other arc tables also rely on schema/table revoke).

REVOKE ALL ON TABLE arc.editor_profiles FROM PUBLIC;
REVOKE ALL ON TABLE arc.published_uploads FROM PUBLIC;
REVOKE ALL ON TABLE arc.editor_quota_ledger FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE arc.editor_profiles FROM anon;
    REVOKE ALL ON TABLE arc.published_uploads FROM anon;
    REVOKE ALL ON TABLE arc.editor_quota_ledger FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE arc.editor_profiles FROM authenticated;
    REVOKE ALL ON TABLE arc.published_uploads FROM authenticated;
    REVOKE ALL ON TABLE arc.editor_quota_ledger FROM authenticated;
  END IF;
END $$;

INSERT INTO arc.migration_checkpoints (id, phase, status, detail, updated_at)
VALUES (
  '20260923131500_self_serve_editor_grants',
  'schema',
  'applied',
  '{"revoke":["editor_profiles","published_uploads","editor_quota_ledger"],"rls":"not-enabled"}'::jsonb,
  now()
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail, updated_at = now();
