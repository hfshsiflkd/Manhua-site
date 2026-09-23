"use strict";

const fs = require("fs");

async function applySqlFile(query, filePath) {
  const sql = fs.readFileSync(filePath, "utf8");
  const statements = sql
    .split(";")
    .map((part) =>
      part
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter(Boolean);
  for (const statement of statements) {
    await query(statement);
  }
}

/**
 * Delete only integration-test rows. Never match quarantine placeholders
 * or migrated source rows (those are not @pgitest.local / pgitest-* slugs).
 */
async function cleanupPgitest(query, { since } = {}) {
  await query(`
    WITH test_users AS (
      SELECT id FROM arc.users
      WHERE extra->>'pgitest' = 'true'
         OR email LIKE '%@pgitest.local'
    ),
    test_manhuas AS (
      SELECT id FROM arc.manhuas
      WHERE extra->>'pgitest' = 'true'
         OR slug LIKE 'pgitest-%'
    ),
    test_chapters AS (
      SELECT id FROM arc.chapters
      WHERE extra->>'pgitest' = 'true'
         OR manhua_id IN (SELECT id FROM test_manhuas)
    ),
    test_teams AS (
      SELECT id FROM arc.teams
      WHERE extra->>'pgitest' = 'true'
         OR name LIKE 'pgitest-%'
    ),
    test_requests AS (
      SELECT id FROM arc.requests
      WHERE extra->>'pgitest' = 'true'
         OR title LIKE 'pgitest-%'
         OR created_by IN (SELECT id FROM test_users)
    )
    SELECT
      (SELECT count(*) FROM test_users) AS users,
      (SELECT count(*) FROM test_manhuas) AS manhuas,
      (SELECT count(*) FROM test_chapters) AS chapters,
      (SELECT count(*) FROM test_teams) AS teams,
      (SELECT count(*) FROM test_requests) AS requests
  `);

  await query(`
    DELETE FROM arc.comments
    WHERE extra->>'pgitest' = 'true'
       OR user_id IN (SELECT id FROM arc.users WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local')
       OR manhua_id IN (SELECT id FROM arc.manhuas WHERE extra->>'pgitest' = 'true' OR slug LIKE 'pgitest-%')
       OR chapter_id IN (
         SELECT id FROM arc.chapters
         WHERE extra->>'pgitest' = 'true'
            OR manhua_id IN (SELECT id FROM arc.manhuas WHERE extra->>'pgitest' = 'true' OR slug LIKE 'pgitest-%')
       )
  `);

  await query(`
    DELETE FROM arc.request_voters
    WHERE request_id IN (
      SELECT id FROM arc.requests
      WHERE extra->>'pgitest' = 'true'
         OR title LIKE 'pgitest-%'
         OR created_by IN (SELECT id FROM arc.users WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local')
    )
  `);
  await query(`
    DELETE FROM arc.request_monthly_votes
    WHERE request_id IN (
      SELECT id FROM arc.requests
      WHERE extra->>'pgitest' = 'true'
         OR title LIKE 'pgitest-%'
         OR created_by IN (SELECT id FROM arc.users WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local')
    )
  `);
  await query(`
    DELETE FROM arc.requests
    WHERE extra->>'pgitest' = 'true'
       OR title LIKE 'pgitest-%'
       OR created_by IN (SELECT id FROM arc.users WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local')
  `);

  await query(`
    DELETE FROM arc.chapter_read_months
    WHERE chapter_id IN (
      SELECT id FROM arc.chapters
      WHERE extra->>'pgitest' = 'true'
         OR manhua_id IN (SELECT id FROM arc.manhuas WHERE extra->>'pgitest' = 'true' OR slug LIKE 'pgitest-%')
    )
  `);
  await query(`
    DELETE FROM arc.chapter_reads
    WHERE chapter_id IN (
      SELECT id FROM arc.chapters
      WHERE extra->>'pgitest' = 'true'
         OR manhua_id IN (SELECT id FROM arc.manhuas WHERE extra->>'pgitest' = 'true' OR slug LIKE 'pgitest-%')
    )
  `);
  await query(`
    DELETE FROM arc.chapter_pages
    WHERE extra->>'pgitest' = 'true'
       OR chapter_id IN (
         SELECT id FROM arc.chapters
         WHERE extra->>'pgitest' = 'true'
            OR manhua_id IN (SELECT id FROM arc.manhuas WHERE extra->>'pgitest' = 'true' OR slug LIKE 'pgitest-%')
       )
  `);
  await query(`
    DELETE FROM arc.chapter_daily_views
    WHERE chapter_id IN (
      SELECT id FROM arc.chapters
      WHERE extra->>'pgitest' = 'true'
         OR manhua_id IN (SELECT id FROM arc.manhuas WHERE extra->>'pgitest' = 'true' OR slug LIKE 'pgitest-%')
    )
  `);
  await query(`
    DELETE FROM arc.chapter_monthly_views
    WHERE chapter_id IN (
      SELECT id FROM arc.chapters
      WHERE extra->>'pgitest' = 'true'
         OR manhua_id IN (SELECT id FROM arc.manhuas WHERE extra->>'pgitest' = 'true' OR slug LIKE 'pgitest-%')
    )
  `);
  await query(`
    DELETE FROM arc.chapters
    WHERE extra->>'pgitest' = 'true'
       OR manhua_id IN (SELECT id FROM arc.manhuas WHERE extra->>'pgitest' = 'true' OR slug LIKE 'pgitest-%')
  `);

  await query(`
    DELETE FROM arc.editor_manhua_month_stats
    WHERE extra->>'pgitest' = 'true'
       OR manhua_id IN (SELECT id FROM arc.manhuas WHERE extra->>'pgitest' = 'true' OR slug LIKE 'pgitest-%')
       OR editor_id IN (SELECT id FROM arc.users WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local')
  `);
  await query(`
    DELETE FROM arc.manhua_genres
    WHERE manhua_id IN (SELECT id FROM arc.manhuas WHERE extra->>'pgitest' = 'true' OR slug LIKE 'pgitest-%')
  `);
  await query(`
    DELETE FROM arc.manhua_owners
    WHERE manhua_id IN (SELECT id FROM arc.manhuas WHERE extra->>'pgitest' = 'true' OR slug LIKE 'pgitest-%')
  `);
  await query(`
    DELETE FROM arc.manhua_daily_views
    WHERE manhua_id IN (SELECT id FROM arc.manhuas WHERE extra->>'pgitest' = 'true' OR slug LIKE 'pgitest-%')
  `);
  await query(`
    DELETE FROM arc.favorites
    WHERE extra->>'pgitest' = 'true'
       OR user_id IN (SELECT id FROM arc.users WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local')
       OR manhua_id IN (SELECT id FROM arc.manhuas WHERE extra->>'pgitest' = 'true' OR slug LIKE 'pgitest-%')
  `);
  await query(`
    DELETE FROM arc.reading_bookmarks
    WHERE extra->>'pgitest' = 'true'
       OR user_id IN (SELECT id FROM arc.users WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local')
       OR manhua_id IN (SELECT id FROM arc.manhuas WHERE extra->>'pgitest' = 'true' OR slug LIKE 'pgitest-%')
  `);
  await query(`
    DELETE FROM arc.manhuas
    WHERE extra->>'pgitest' = 'true'
       OR slug LIKE 'pgitest-%'
  `);

  await query(`
    DELETE FROM arc.team_invites
    WHERE extra->>'pgitest' = 'true'
       OR team_id IN (SELECT id FROM arc.teams WHERE extra->>'pgitest' = 'true' OR name LIKE 'pgitest-%')
       OR invited_user_id IN (SELECT id FROM arc.users WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local')
       OR invited_by_id IN (SELECT id FROM arc.users WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local')
  `);
  await query(`
    DELETE FROM arc.team_members
    WHERE team_id IN (SELECT id FROM arc.teams WHERE extra->>'pgitest' = 'true' OR name LIKE 'pgitest-%')
       OR user_id IN (SELECT id FROM arc.users WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local')
  `);
  await query(`
    DELETE FROM arc.teams
    WHERE extra->>'pgitest' = 'true'
       OR name LIKE 'pgitest-%'
  `);

  await query(`
    DELETE FROM arc.trial_devices
    WHERE extra->>'pgitest' = 'true'
       OR device_id LIKE 'pgitest%'
       OR first_user_id IN (SELECT id FROM arc.users WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local')
  `);
  await query(`
    DELETE FROM arc.editor_month_stats
    WHERE extra->>'pgitest' = 'true'
       OR editor_id IN (SELECT id FROM arc.users WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local')
  `);
  await query(`
    DELETE FROM arc.finance_revenue_events
    WHERE note LIKE 'pgitest%'
       OR user_id IN (SELECT id FROM arc.users WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local')
       OR admin_id IN (SELECT id FROM arc.users WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local')
  `);
  await query(`
    DELETE FROM arc.action_logs
    WHERE extra->>'pgitest' = 'true'
       OR user_id IN (SELECT id FROM arc.users WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local')
  `);
  await query(`
    DELETE FROM arc.audit_logs
    WHERE extra->>'pgitest' = 'true'
       OR user_id IN (SELECT id FROM arc.users WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local')
       OR username_snapshot LIKE 'pgit%'
  `);
  await query(`
    DELETE FROM arc.finance_months fm
    WHERE extra->>'pgitest' = 'true'
       OR (
         mongo_v IS NULL
         AND NOT EXISTS (SELECT 1 FROM arc.finance_revenue_events e WHERE e.finance_month_id = fm.id)
       )
  `);
  await query(`
    DELETE FROM arc.editor_quota_ledger
    WHERE extra->>'pgitest' = 'true'
       OR user_id IN (SELECT id FROM arc.users WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local')
  `);
  await query(`
    DELETE FROM arc.published_uploads
    WHERE extra->>'pgitest' = 'true'
       OR user_id IN (SELECT id FROM arc.users WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local')
  `);
  await query(`
    DELETE FROM arc.editor_profiles
    WHERE extra->>'pgitest' = 'true'
       OR user_id IN (SELECT id FROM arc.users WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local')
  `);
  await query(`
    DELETE FROM arc.users
    WHERE extra->>'pgitest' = 'true'
       OR email LIKE '%@pgitest.local'
  `);
  if (since) {
    await query(`DELETE FROM arc.audit_logs WHERE ts >= $1`, [since]);
    await query(`DELETE FROM arc.register_attempts WHERE created_at >= $1`, [since]);
  }
}

async function migrationSnapshot(query) {
  const r = await query(`
    SELECT
      (SELECT count(*)::int FROM arc.users WHERE extra->>'pgitest' IS DISTINCT FROM 'true' AND email NOT LIKE '%@pgitest.local') AS users,
      (SELECT count(*)::int FROM arc.manhuas WHERE extra->>'pgitest' IS DISTINCT FROM 'true' AND slug NOT LIKE 'pgitest-%') AS manhuas,
      (SELECT count(*)::int FROM arc.chapters WHERE extra->>'pgitest' IS DISTINCT FROM 'true') AS chapters,
      (SELECT count(*)::int FROM arc.chapter_pages p
        JOIN arc.chapters c ON c.id = p.chapter_id
        WHERE c.extra->>'pgitest' IS DISTINCT FROM 'true') AS pages,
      (SELECT coalesce(sum(m.views),0)::bigint FROM arc.manhuas m WHERE m.extra->>'pgitest' IS DISTINCT FROM 'true' AND m.slug NOT LIKE 'pgitest-%') AS manhua_views,
      (SELECT coalesce(sum(c.views),0)::bigint FROM arc.chapters c
        JOIN arc.manhuas m ON m.id = c.manhua_id
        WHERE c.extra->>'pgitest' IS DISTINCT FROM 'true' AND m.extra->>'pgitest' IS DISTINCT FROM 'true' AND m.slug NOT LIKE 'pgitest-%') AS chapter_views,
      (SELECT count(*)::int FROM arc.favorites f
        JOIN arc.users u ON u.id = f.user_id
        WHERE u.email NOT LIKE '%@pgitest.local' AND f.extra->>'pgitest' IS DISTINCT FROM 'true') AS favorites,
      (SELECT count(*)::int FROM arc.audit_logs a
        WHERE a.extra->>'pgitest' IS DISTINCT FROM 'true'
          AND (a.user_id IS NULL OR a.user_id NOT IN (SELECT id FROM arc.users WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local'))
          AND coalesce(a.username_snapshot,'') NOT LIKE 'pgit%') AS audit_logs
  `);
  return r.rows[0];
}

module.exports = { cleanupPgitest, migrationSnapshot, applySqlFile };
