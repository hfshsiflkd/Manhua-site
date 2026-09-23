"use strict";

const { ListObjectsV2Command, DeleteObjectsCommand } = require("@aws-sdk/client-s3");

function keyFromUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw.split("?")[0]);
    const path = u.pathname.replace(/^\//, "");
    return path || null;
  } catch {
    return raw.split("?")[0].replace(/^https?:\/\/[^/]+\//, "") || null;
  }
}

async function collectPgitestUserIds(query) {
  const r = await query(`
    SELECT id FROM arc.users
    WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local'
  `);
  return r.rows.map((row) => String(row.id));
}

async function collectPgitestObjectKeys(query) {
  const keys = new Set();
  const userIds = await collectPgitestUserIds(query);
  const uploads = await query(`
    SELECT url FROM arc.published_uploads
    WHERE extra->>'pgitest' = 'true'
       OR user_id IN (
         SELECT id FROM arc.users
         WHERE extra->>'pgitest' = 'true' OR email LIKE '%@pgitest.local'
       )
  `).catch((err) => {
    if (!/does not exist|undefined_table/i.test(String(err.message || err))) throw err;
    return { rows: [] };
  });
  for (const row of uploads.rows) {
    const key = keyFromUrl(row.url);
    if (key) keys.add(key);
  }
  const pages = await query(`
    SELECT image_url FROM arc.chapter_pages
    WHERE extra->>'pgitest' = 'true'
       OR chapter_id IN (
         SELECT id FROM arc.chapters
         WHERE extra->>'pgitest' = 'true'
            OR manhua_id IN (
              SELECT id FROM arc.manhuas
              WHERE extra->>'pgitest' = 'true' OR slug LIKE 'pgitest-%'
            )
       )
  `);
  for (const row of pages.rows) {
    const key = keyFromUrl(row.image_url);
    if (key) keys.add(key);
  }
  const covers = await query(`
    SELECT cover_image, cover_image_url FROM arc.manhuas
    WHERE extra->>'pgitest' = 'true' OR slug LIKE 'pgitest-%'
  `);
  for (const row of covers.rows) {
    for (const url of [row.cover_image, row.cover_image_url]) {
      const key = keyFromUrl(url);
      if (key) keys.add(key);
    }
  }
  return { userIds, keys };
}

async function listPrefixKeys(client, bucket, prefix) {
  const out = [];
  let token;
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: token,
      })
    );
    for (const obj of res.Contents || []) {
      if (obj.Key) out.push(obj.Key);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out;
}

async function cleanupPgitestR2(query, { r2Client, bucket } = {}) {
  if (!r2Client || !bucket) return { deleted: 0, listed: 0, users: 0, skipped: true };
  const { userIds, keys } = await collectPgitestObjectKeys(query);
  const all = new Set(keys);
  for (const id of userIds) {
    for (const key of await listPrefixKeys(r2Client, bucket, `staging/${id}/`)) all.add(key);
  }
  const toDelete = [...all];
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += 1000) {
    const chunk = toDelete.slice(i, i + 1000);
    if (!chunk.length) continue;
    const res = await r2Client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
      })
    );
    deleted += chunk.length - (res.Errors?.length || 0);
  }
  return { deleted, listed: toDelete.length, users: userIds.length, skipped: false, keys: toDelete };
}

module.exports = { cleanupPgitestR2, collectPgitestObjectKeys, collectPgitestUserIds, keyFromUrl };
