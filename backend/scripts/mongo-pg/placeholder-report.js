#!/usr/bin/env node
"use strict";

const { Client } = require("pg");
const {
  loadExplicitEnv,
  envFileFromArgv,
  parseEnvFile,
  assertPostgresTarget,
  resolvePostgresUrlFromValues,
  pgClientConfig,
} = require("./loadExplicitEnv");

const file = envFileFromArgv();
if (file) {
  const parsed = parseEnvFile(file);
  loadExplicitEnv(file, { override: true });
  const fromFile = resolvePostgresUrlFromValues(parsed.values);
  if (fromFile) process.env.DATABASE_URL = fromFile;
  else if (/supabase/i.test(file)) {
    console.error(JSON.stringify({ ok: false, reason: "DATABASE_URL_or_DIRECT_missing" }));
    process.exit(2);
  }
}
assertPostgresTarget(process.env.DATABASE_URL);

async function main() {
  const pg = new Client(pgClientConfig(process.env.DATABASE_URL));
  await pg.connect();

  const manhuas = await pg.query(
    `SELECT id, slug, deleted_at IS NOT NULL AS soft_deleted, extra
     FROM arc.manhuas
     WHERE extra->>'quarantinePlaceholder' = 'true'
     ORDER BY id`
  );
  const chapters = await pg.query(
    `SELECT id, manhua_id, deleted_at IS NOT NULL AS soft_deleted, extra
     FROM arc.chapters
     WHERE extra->>'quarantinePlaceholder' = 'true'
     ORDER BY id`
  );
  const restoredChapters = await pg.query(
    `SELECT c.id AS chapter_id, c.manhua_id, c.deleted_at IS NOT NULL AS chapter_soft_deleted,
            (SELECT count(*)::int FROM arc.chapter_pages p WHERE p.chapter_id = c.id) AS pages,
            (SELECT count(*)::int FROM arc.chapter_read_months r WHERE r.chapter_id = c.id) AS read_months
     FROM arc.chapters c
     JOIN arc.manhuas m ON m.id = c.manhua_id
     WHERE m.extra->>'quarantinePlaceholder' = 'true'
       AND coalesce(c.extra->>'quarantinePlaceholder','') <> 'true'
     ORDER BY c.id`
  );
  const restoredReads = await pg.query(
    `SELECT count(*)::int AS n
     FROM arc.chapter_read_months r
     JOIN arc.chapters c ON c.id = r.chapter_id
     WHERE c.extra->>'quarantinePlaceholder' = 'true'`
  );
  const favs = await pg.query(
    `SELECT count(*)::int AS n
     FROM arc.favorites f
     JOIN arc.manhuas m ON m.id = f.manhua_id
     WHERE m.extra->>'quarantinePlaceholder' = 'true'`
  );
  const stats = await pg.query(
    `SELECT count(*)::int AS n
     FROM arc.editor_manhua_month_stats s
     JOIN arc.manhuas m ON m.id = s.manhua_id
     WHERE m.extra->>'quarantinePlaceholder' = 'true'`
  );
  const publicLeak = await pg.query(
    `SELECT count(*)::int AS n FROM arc.manhuas
     WHERE extra->>'quarantinePlaceholder' = 'true' AND deleted_at IS NULL`
  );
  const publishedOnDeletedParent = await pg.query(
    `SELECT c.id, c.manhua_id, c.status,
            (SELECT count(*)::int FROM arc.chapter_pages p WHERE p.chapter_id = c.id) AS pages
     FROM arc.chapters c
     JOIN arc.manhuas m ON m.id = c.manhua_id
     WHERE m.deleted_at IS NOT NULL
       AND c.deleted_at IS NULL
       AND c.status = 'published'
     ORDER BY c.id`
  );

  const report = {
    note: "quarantine=0 means no rows were skipped on the last migrate; placeholders are still synthetic rows",
    placeholderManhuas: manhuas.rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      reason: r.extra?.source || null,
      softDeleted: r.soft_deleted,
    })),
    placeholderChapters: chapters.rows.map((r) => ({
      id: r.id,
      restoredParentManhuaId: r.manhua_id,
      reason: r.extra?.source || null,
      softDeleted: r.soft_deleted,
    })),
    restoredRealChaptersOnPlaceholderManhua: restoredChapters.rows,
    danglingMonthlyReadsAttachedToPlaceholderChapters: restoredReads.rows[0].n,
    favoritesOnPlaceholderManhua: favs.rows[0].n,
    editorManhuaStatsOnPlaceholderManhua: stats.rows[0].n,
    publicPlaceholderLeak: publicLeak.rows[0].n,
    publishedChaptersOnDeletedParent: publishedOnDeletedParent.rows,
    publishedOnDeletedParentCount: publishedOnDeletedParent.rows.length,
    pagesOnPublishedChaptersOfDeletedParent: publishedOnDeletedParent.rows.reduce(
      (n, row) => n + Number(row.pages || 0),
      0
    ),
  };
  console.log(JSON.stringify(report, null, 2));
  await pg.end();
  if (report.publicPlaceholderLeak > 0 || report.publishedOnDeletedParentCount > 0) process.exitCode = 2;
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
