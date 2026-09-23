-- Additive team recruitment board. Does not alter existing team/editor/manhua rows.
-- Express uses the DB owner role. PostgREST anon/authenticated must not read these tables.
-- Do not apply to production until reviewed.

CREATE TABLE IF NOT EXISTS arc.team_recruitment_listings (
  id text PRIMARY KEY,
  team_id text NOT NULL REFERENCES arc.teams (id) ON DELETE CASCADE,
  created_by text NOT NULL REFERENCES arc.users (id),
  manhua_id text REFERENCES arc.manhuas (id) ON DELETE SET NULL,
  title text NOT NULL,
  work_role text NOT NULL CHECK (work_role IN ('translation', 'cleanup', 'typesetting', 'proofreading')),
  compensation text NOT NULL CHECK (compensation IN ('volunteer', 'paid', 'negotiable')),
  compensation_note text,
  description text NOT NULL,
  languages text[] NOT NULL DEFAULT '{}',
  skills text[] NOT NULL DEFAULT '{}',
  weekly_hours_note text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'closed')),
  hidden_at timestamptz,
  hidden_by text REFERENCES arc.users (id),
  expires_at timestamptz NOT NULL,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_recruitment_title_len CHECK (char_length(title) BETWEEN 5 AND 100),
  CONSTRAINT team_recruitment_description_len CHECK (char_length(description) BETWEEN 50 AND 2000),
  CONSTRAINT team_recruitment_hours_len CHECK (weekly_hours_note IS NULL OR char_length(weekly_hours_note) BETWEEN 1 AND 80),
  CONSTRAINT team_recruitment_note_len CHECK (compensation_note IS NULL OR char_length(compensation_note) BETWEEN 5 AND 500),
  CONSTRAINT team_recruitment_paid_note CHECK (
    compensation <> 'paid' OR (compensation_note IS NOT NULL AND char_length(compensation_note) BETWEEN 5 AND 500)
  )
);

CREATE INDEX IF NOT EXISTS team_recruitment_listings_public_idx
  ON arc.team_recruitment_listings (created_at DESC)
  WHERE status = 'open' AND hidden_at IS NULL;
CREATE INDEX IF NOT EXISTS team_recruitment_listings_team_idx
  ON arc.team_recruitment_listings (team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS team_recruitment_listings_role_idx
  ON arc.team_recruitment_listings (work_role, compensation, created_at DESC);
CREATE INDEX IF NOT EXISTS team_recruitment_listings_manhua_idx
  ON arc.team_recruitment_listings (manhua_id)
  WHERE manhua_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS team_recruitment_listings_expires_idx
  ON arc.team_recruitment_listings (expires_at)
  WHERE status = 'open' AND hidden_at IS NULL;

CREATE TABLE IF NOT EXISTS arc.team_recruitment_applications (
  id text PRIMARY KEY,
  listing_id text NOT NULL REFERENCES arc.team_recruitment_listings (id) ON DELETE CASCADE,
  team_id text NOT NULL REFERENCES arc.teams (id) ON DELETE CASCADE,
  applicant_id text NOT NULL REFERENCES arc.users (id),
  intro text NOT NULL,
  experience text NOT NULL CHECK (experience IN ('beginner', 'experienced')),
  weekly_hours_note text NOT NULL,
  portfolio_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  decision_note text,
  decided_by text REFERENCES arc.users (id),
  decided_at timestamptz,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_recruitment_app_intro_len CHECK (char_length(intro) BETWEEN 20 AND 1000),
  CONSTRAINT team_recruitment_app_hours_len CHECK (char_length(weekly_hours_note) BETWEEN 1 AND 80),
  CONSTRAINT team_recruitment_app_note_len CHECK (decision_note IS NULL OR char_length(decision_note) BETWEEN 1 AND 300),
  CONSTRAINT team_recruitment_app_portfolio_len CHECK (portfolio_url IS NULL OR char_length(portfolio_url) <= 200),
  CONSTRAINT team_recruitment_app_unique UNIQUE (listing_id, applicant_id)
);

CREATE INDEX IF NOT EXISTS team_recruitment_apps_listing_status_idx
  ON arc.team_recruitment_applications (listing_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS team_recruitment_apps_applicant_idx
  ON arc.team_recruitment_applications (applicant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS team_recruitment_apps_team_status_idx
  ON arc.team_recruitment_applications (team_id, status, created_at DESC);

REVOKE ALL ON TABLE arc.team_recruitment_listings FROM PUBLIC;
REVOKE ALL ON TABLE arc.team_recruitment_applications FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE arc.team_recruitment_listings FROM anon;
    REVOKE ALL ON TABLE arc.team_recruitment_applications FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE arc.team_recruitment_listings FROM authenticated;
    REVOKE ALL ON TABLE arc.team_recruitment_applications FROM authenticated;
  END IF;
END $$;

INSERT INTO arc.migration_checkpoints (id, phase, status, detail, updated_at)
VALUES (
  '20260923153000_team_recruitment',
  'schema',
  'applied',
  '{"tables":["team_recruitment_listings","team_recruitment_applications"],"rls":"not-enabled"}'::jsonb,
  now()
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail, updated_at = now();

ALTER TABLE arc.team_recruitment_listings
  DROP CONSTRAINT IF EXISTS team_recruitment_expires_after_create;
