-- Arc Read Mongo → PostgreSQL schema.
-- Applied to isolated Postgres first. Do not point this at an unrelated Supabase project.
-- Tables live in schema "arc" so PostgREST (public) does not expose them.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS arc;

REVOKE ALL ON SCHEMA arc FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON SCHEMA arc FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON SCHEMA arc FROM authenticated;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS arc.migration_checkpoints (
  id text PRIMARY KEY,
  phase text NOT NULL,
  status text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS arc.migration_quarantine (
  id bigserial PRIMARY KEY,
  collection_name text NOT NULL,
  document_id text,
  reason text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS arc.users (
  id text PRIMARY KEY,
  username text NOT NULL,
  email citext NOT NULL,
  phone text NOT NULL DEFAULT '',
  password_hash text NOT NULL,
  session_token text,
  token_version integer NOT NULL DEFAULT 0,
  has_used_trial boolean NOT NULL DEFAULT false,
  trial_granted_at timestamptz,
  device_id text NOT NULL DEFAULT '',
  last_register_ip text NOT NULL DEFAULT '',
  last_device_id text NOT NULL DEFAULT '',
  device_switch_window_start timestamptz,
  device_switch_count integer NOT NULL DEFAULT 0,
  device_switch_first_at timestamptz,
  lock_until timestamptz,
  lock_reason text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'translator', 'admin', 'editor')),
  is_active boolean NOT NULL DEFAULT true,
  blocked boolean NOT NULL DEFAULT false,
  is_vip boolean NOT NULL DEFAULT false,
  vip_expires_at timestamptz,
  vip_level integer NOT NULL DEFAULT 0,
  avatar text,
  reset_password_token_hash text,
  reset_password_expires_at timestamptz,
  reset_password_requested_at timestamptz,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  mongo_v integer
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON arc.users (username);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON arc.users (email);

CREATE TABLE IF NOT EXISTS arc.trial_devices (
  id text PRIMARY KEY,
  device_id text NOT NULL,
  first_user_id text REFERENCES arc.users (id),
  first_granted_at timestamptz,
  ip text NOT NULL DEFAULT '',
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  mongo_v integer
);
CREATE UNIQUE INDEX IF NOT EXISTS trial_devices_device_id_key ON arc.trial_devices (device_id);

CREATE TABLE IF NOT EXISTS arc.app_settings (
  id text PRIMARY KEY,
  key text NOT NULL,
  value jsonb,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  mongo_v integer
);
CREATE UNIQUE INDEX IF NOT EXISTS app_settings_key_key ON arc.app_settings (key);

CREATE TABLE IF NOT EXISTS arc.vip_plans (
  id text PRIMARY KEY,
  months integer NOT NULL CHECK (months >= 1 AND months <= 24),
  price_total numeric(14, 2) NOT NULL CHECK (price_total >= 0),
  active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  mongo_v integer
);
CREATE INDEX IF NOT EXISTS vip_plans_active_order_idx ON arc.vip_plans (active, display_order);

CREATE TABLE IF NOT EXISTS arc.teams (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_by text NOT NULL REFERENCES arc.users (id),
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  mongo_v integer
);
CREATE INDEX IF NOT EXISTS teams_name_idx ON arc.teams (name);

CREATE TABLE IF NOT EXISTS arc.team_members (
  team_id text NOT NULL REFERENCES arc.teams (id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES arc.users (id),
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'admin', 'editor')),
  added_by text REFERENCES arc.users (id),
  added_at timestamptz,
  PRIMARY KEY (team_id, user_id)
);
CREATE INDEX IF NOT EXISTS team_members_user_idx ON arc.team_members (user_id);

CREATE TABLE IF NOT EXISTS arc.team_invites (
  id text PRIMARY KEY,
  team_id text NOT NULL REFERENCES arc.teams (id) ON DELETE CASCADE,
  invited_user_id text NOT NULL REFERENCES arc.users (id),
  invited_by_id text NOT NULL REFERENCES arc.users (id),
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  responded_at timestamptz,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  mongo_v integer
);
CREATE INDEX IF NOT EXISTS team_invites_team_user_status_idx ON arc.team_invites (team_id, invited_user_id, status);

CREATE TABLE IF NOT EXISTS arc.manhuas (
  id text PRIMARY KEY,
  title text NOT NULL,
  title_en text,
  slug text NOT NULL,
  rating numeric(4, 2) NOT NULL DEFAULT 0,
  description text,
  cover_image text,
  cover_image_url text,
  rating_average numeric(4, 2) NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'hiatus')),
  created_by text NOT NULL REFERENCES arc.users (id),
  team_id text REFERENCES arc.teams (id),
  views bigint NOT NULL DEFAULT 0,
  weekly_views bigint NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  deleted_by text REFERENCES arc.users (id),
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  mongo_v integer
);
CREATE UNIQUE INDEX IF NOT EXISTS manhuas_slug_key ON arc.manhuas (slug);
CREATE INDEX IF NOT EXISTS manhuas_rating_idx ON arc.manhuas (rating DESC);
CREATE INDEX IF NOT EXISTS manhuas_updated_idx ON arc.manhuas (updated_at DESC);
CREATE INDEX IF NOT EXISTS manhuas_weekly_views_idx ON arc.manhuas (weekly_views DESC);
CREATE INDEX IF NOT EXISTS manhuas_views_idx ON arc.manhuas (views DESC);
CREATE INDEX IF NOT EXISTS manhuas_deleted_idx ON arc.manhuas (deleted_at);
CREATE INDEX IF NOT EXISTS manhuas_title_trgm_idx ON arc.manhuas USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS manhuas_title_en_trgm_idx ON arc.manhuas USING gin (title_en gin_trgm_ops);

CREATE TABLE IF NOT EXISTS arc.manhua_genres (
  manhua_id text NOT NULL REFERENCES arc.manhuas (id) ON DELETE CASCADE,
  genre text NOT NULL,
  position integer NOT NULL,
  PRIMARY KEY (manhua_id, position)
);
CREATE INDEX IF NOT EXISTS manhua_genres_genre_idx ON arc.manhua_genres (genre);

CREATE TABLE IF NOT EXISTS arc.manhua_owners (
  manhua_id text NOT NULL REFERENCES arc.manhuas (id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES arc.users (id),
  PRIMARY KEY (manhua_id, user_id)
);
CREATE INDEX IF NOT EXISTS manhua_owners_user_idx ON arc.manhua_owners (user_id);

CREATE TABLE IF NOT EXISTS arc.manhua_daily_views (
  manhua_id text NOT NULL REFERENCES arc.manhuas (id) ON DELETE CASCADE,
  day_key text NOT NULL,
  views bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (manhua_id, day_key)
);

CREATE TABLE IF NOT EXISTS arc.chapters (
  id text PRIMARY KEY,
  manhua_id text NOT NULL REFERENCES arc.manhuas (id),
  chapter_number numeric(12, 4) NOT NULL,
  title text,
  language text NOT NULL DEFAULT 'mn',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  views bigint NOT NULL DEFAULT 0,
  uploaded_by text REFERENCES arc.users (id),
  deleted_at timestamptz,
  deleted_by text REFERENCES arc.users (id),
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  mongo_v integer
);
CREATE UNIQUE INDEX IF NOT EXISTS chapters_active_unique
  ON arc.chapters (manhua_id, chapter_number, language)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS chapters_reader_idx
  ON arc.chapters (manhua_id, language, status, chapter_number);
CREATE INDEX IF NOT EXISTS chapters_reader_prev_idx
  ON arc.chapters (manhua_id, language, status, chapter_number DESC);
CREATE INDEX IF NOT EXISTS chapters_status_created_idx ON arc.chapters (status, created_at DESC);
CREATE INDEX IF NOT EXISTS chapters_deleted_idx ON arc.chapters (deleted_at);

CREATE TABLE IF NOT EXISTS arc.chapter_pages (
  chapter_id text NOT NULL REFERENCES arc.chapters (id) ON DELETE CASCADE,
  page_number integer NOT NULL,
  image_url text NOT NULL,
  original_name text,
  width integer,
  height integer,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (chapter_id, page_number)
);

CREATE TABLE IF NOT EXISTS arc.chapter_daily_views (
  chapter_id text NOT NULL REFERENCES arc.chapters (id) ON DELETE CASCADE,
  day_key text NOT NULL,
  views bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (chapter_id, day_key)
);

CREATE TABLE IF NOT EXISTS arc.chapter_monthly_views (
  chapter_id text NOT NULL REFERENCES arc.chapters (id) ON DELETE CASCADE,
  month_key text NOT NULL,
  views bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (chapter_id, month_key)
);

CREATE TABLE IF NOT EXISTS arc.user_list_bookmarks (
  user_id text NOT NULL REFERENCES arc.users (id) ON DELETE CASCADE,
  manhua_id text NOT NULL REFERENCES arc.manhuas (id),
  added_at timestamptz,
  mongo_sub_id text,
  PRIMARY KEY (user_id, manhua_id)
);

CREATE TABLE IF NOT EXISTS arc.user_recently_viewed (
  user_id text NOT NULL REFERENCES arc.users (id) ON DELETE CASCADE,
  manhua_id text NOT NULL REFERENCES arc.manhuas (id),
  last_chapter_id text REFERENCES arc.chapters (id),
  last_read_at timestamptz,
  mongo_sub_id text,
  PRIMARY KEY (user_id, manhua_id)
);

CREATE TABLE IF NOT EXISTS arc.reading_bookmarks (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES arc.users (id) ON DELETE CASCADE,
  manhua_id text NOT NULL REFERENCES arc.manhuas (id),
  chapter_number numeric(12, 4) NOT NULL,
  page_number integer NOT NULL,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  mongo_v integer
);
CREATE UNIQUE INDEX IF NOT EXISTS reading_bookmarks_user_manhua_key
  ON arc.reading_bookmarks (user_id, manhua_id);

CREATE TABLE IF NOT EXISTS arc.favorites (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES arc.users (id) ON DELETE CASCADE,
  manhua_id text NOT NULL REFERENCES arc.manhuas (id),
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  mongo_v integer
);
CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_manhua_key ON arc.favorites (user_id, manhua_id);
CREATE INDEX IF NOT EXISTS favorites_user_idx ON arc.favorites (user_id);

CREATE TABLE IF NOT EXISTS arc.comments (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES arc.users (id),
  username_snapshot text NOT NULL,
  chapter_id text REFERENCES arc.chapters (id),
  manhua_id text REFERENCES arc.manhuas (id),
  body text NOT NULL,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  mongo_v integer,
  CONSTRAINT comments_target_chk CHECK (
    (chapter_id IS NOT NULL AND manhua_id IS NULL)
    OR (chapter_id IS NULL AND manhua_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS comments_manhua_created_idx ON arc.comments (manhua_id, created_at DESC);
CREATE INDEX IF NOT EXISTS comments_chapter_created_idx ON arc.comments (chapter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS comments_user_created_idx ON arc.comments (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS arc.requests (
  id text PRIMARY KEY,
  title text NOT NULL,
  image_url text NOT NULL DEFAULT '',
  created_by text REFERENCES arc.users (id),
  votes integer NOT NULL DEFAULT 0,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  mongo_v integer
);
CREATE INDEX IF NOT EXISTS requests_created_idx ON arc.requests (created_at DESC);
CREATE INDEX IF NOT EXISTS requests_votes_idx ON arc.requests (votes DESC);

CREATE TABLE IF NOT EXISTS arc.request_monthly_votes (
  request_id text NOT NULL REFERENCES arc.requests (id) ON DELETE CASCADE,
  month_key text NOT NULL,
  votes integer NOT NULL DEFAULT 0,
  PRIMARY KEY (request_id, month_key)
);

CREATE TABLE IF NOT EXISTS arc.request_voters (
  request_id text NOT NULL REFERENCES arc.requests (id) ON DELETE CASCADE,
  month_key text NOT NULL,
  voter_key text NOT NULL,
  PRIMARY KEY (request_id, month_key, voter_key)
);

CREATE TABLE IF NOT EXISTS arc.feedback (
  id text PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('suggestion_request', 'complaint')),
  name text NOT NULL,
  description text NOT NULL,
  image_url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved')),
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  mongo_v integer
);
CREATE INDEX IF NOT EXISTS feedback_type_idx ON arc.feedback (type);
CREATE INDEX IF NOT EXISTS feedback_status_idx ON arc.feedback (status);
CREATE INDEX IF NOT EXISTS feedback_created_idx ON arc.feedback (created_at DESC);

CREATE TABLE IF NOT EXISTS arc.finance_months (
  id text PRIMARY KEY,
  month_key text NOT NULL,
  total_revenue numeric(14, 2) NOT NULL DEFAULT 0 CHECK (total_revenue >= 0),
  currency text NOT NULL DEFAULT 'MNT',
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  mongo_v integer
);
CREATE UNIQUE INDEX IF NOT EXISTS finance_months_month_key ON arc.finance_months (month_key);

CREATE TABLE IF NOT EXISTS arc.finance_revenue_events (
  finance_month_id text NOT NULL REFERENCES arc.finance_months (id) ON DELETE CASCADE,
  position integer NOT NULL,
  user_id text REFERENCES arc.users (id),
  admin_id text REFERENCES arc.users (id),
  amount numeric(14, 2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'MNT',
  paid_at timestamptz NOT NULL,
  months_granted integer NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  PRIMARY KEY (finance_month_id, position)
);

CREATE TABLE IF NOT EXISTS arc.editor_month_stats (
  id text PRIMARY KEY,
  month_key text NOT NULL,
  editor_id text NOT NULL REFERENCES arc.users (id),
  chapter_monthly_views bigint NOT NULL DEFAULT 0,
  chapters_uploaded integer NOT NULL DEFAULT 0,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  mongo_v integer
);
CREATE UNIQUE INDEX IF NOT EXISTS editor_month_stats_unique
  ON arc.editor_month_stats (month_key, editor_id);

CREATE TABLE IF NOT EXISTS arc.editor_manhua_month_stats (
  id text PRIMARY KEY,
  month_key text NOT NULL,
  editor_id text NOT NULL REFERENCES arc.users (id),
  manhua_id text NOT NULL REFERENCES arc.manhuas (id),
  monthly_views bigint NOT NULL DEFAULT 0,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  mongo_v integer
);
CREATE UNIQUE INDEX IF NOT EXISTS editor_manhua_month_stats_unique
  ON arc.editor_manhua_month_stats (month_key, editor_id, manhua_id);

CREATE TABLE IF NOT EXISTS arc.chapter_reads (
  id text PRIMARY KEY,
  chapter_id text NOT NULL REFERENCES arc.chapters (id),
  viewer_key text NOT NULL,
  first_read_at timestamptz,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  mongo_v integer
);
CREATE UNIQUE INDEX IF NOT EXISTS chapter_reads_unique ON arc.chapter_reads (chapter_id, viewer_key);

CREATE TABLE IF NOT EXISTS arc.chapter_read_months (
  id text PRIMARY KEY,
  chapter_id text NOT NULL REFERENCES arc.chapters (id),
  viewer_key text NOT NULL,
  month_key text NOT NULL,
  first_read_at timestamptz,
  expire_at timestamptz NOT NULL,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  mongo_v integer
);
CREATE UNIQUE INDEX IF NOT EXISTS chapter_read_months_unique
  ON arc.chapter_read_months (chapter_id, viewer_key, month_key);
CREATE INDEX IF NOT EXISTS chapter_read_months_expire_idx ON arc.chapter_read_months (expire_at);

CREATE TABLE IF NOT EXISTS arc.audit_logs (
  id text PRIMARY KEY,
  ts timestamptz NOT NULL,
  level text NOT NULL CHECK (level IN ('INFO', 'WARN', 'ERROR')),
  category text NOT NULL,
  action text NOT NULL,
  message text NOT NULL,
  user_id text,
  username_snapshot text,
  role_snapshot text,
  ip text,
  device_id_hash text,
  method text,
  path text,
  status_code integer,
  duration_ms integer,
  request_id text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  mongo_v integer
);
CREATE INDEX IF NOT EXISTS audit_logs_ts_idx ON arc.audit_logs (ts DESC);
CREATE INDEX IF NOT EXISTS audit_logs_category_action_ts_idx ON arc.audit_logs (category, action, ts DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user_ts_idx ON arc.audit_logs (user_id, ts DESC);

CREATE TABLE IF NOT EXISTS arc.action_logs (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES arc.users (id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  description text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  mongo_v integer
);

CREATE TABLE IF NOT EXISTS arc.register_attempts (
  id text PRIMARY KEY,
  ip text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  mongo_v integer
);
CREATE INDEX IF NOT EXISTS register_attempts_created_idx ON arc.register_attempts (created_at);
CREATE INDEX IF NOT EXISTS register_attempts_ip_idx ON arc.register_attempts (ip);

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
