-- Self-serve editor onboarding (Express JWT + schema arc).
-- Existing editors/admins/translators without a profile row stay fully able to publish.
-- Do not apply to production until reviewed. Isolated/hosted staging first.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS arc.editor_profiles (
  user_id text PRIMARY KEY REFERENCES arc.users (id) ON DELETE CASCADE,
  pen_name text NOT NULL,
  bio text NOT NULL,
  skills text[] NOT NULL DEFAULT '{}',
  experience text NOT NULL CHECK (experience IN ('beginner', 'previous', 'regular')),
  languages text[] NOT NULL DEFAULT '{}',
  portfolio_url text,
  terms_version text NOT NULL,
  terms_accepted_at timestamptz NOT NULL,
  self_serve boolean NOT NULL DEFAULT true,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT editor_profiles_pen_name_len CHECK (char_length(pen_name) BETWEEN 2 AND 40),
  CONSTRAINT editor_profiles_bio_len CHECK (char_length(bio) BETWEEN 20 AND 500),
  CONSTRAINT editor_profiles_skills_len CHECK (cardinality(skills) >= 1),
  CONSTRAINT editor_profiles_languages_len CHECK (cardinality(languages) >= 1),
  CONSTRAINT editor_profiles_portfolio_len CHECK (portfolio_url IS NULL OR char_length(portfolio_url) <= 200)
);

CREATE TABLE IF NOT EXISTS arc.published_uploads (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES arc.users (id) ON DELETE CASCADE,
  purpose text NOT NULL,
  url text NOT NULL,
  bytes bigint NOT NULL CHECK (bytes >= 0),
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS published_uploads_user_url_uidx ON arc.published_uploads (user_id, url);
CREATE INDEX IF NOT EXISTS published_uploads_url_idx ON arc.published_uploads (url);

CREATE TABLE IF NOT EXISTS arc.editor_quota_ledger (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES arc.users (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('manhua', 'upload')),
  bytes bigint NOT NULL DEFAULT 0 CHECK (bytes >= 0),
  idempotency_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('reserved', 'committed', 'released')),
  expires_at timestamptz NOT NULL,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS editor_quota_ledger_idem_idx
  ON arc.editor_quota_ledger (user_id, kind, idempotency_key);
CREATE INDEX IF NOT EXISTS editor_quota_ledger_user_window_idx
  ON arc.editor_quota_ledger (user_id, kind, status, created_at);

REVOKE ALL ON TABLE arc.editor_profiles FROM PUBLIC;
REVOKE ALL ON TABLE arc.published_uploads FROM PUBLIC;
REVOKE ALL ON TABLE arc.editor_quota_ledger FROM PUBLIC;

INSERT INTO arc.migration_checkpoints (id, phase, status, detail, updated_at)
VALUES (
  '20260923120000_self_serve_editor',
  'schema',
  'applied',
  '{"tables":["editor_profiles","published_uploads","editor_quota_ledger"]}'::jsonb,
  now()
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, detail = EXCLUDED.detail, updated_at = now();
