"use strict";

/**
 * Express talks to Postgres through `pg` (`DATABASE_URL`), not PostgREST.
 * `@supabase/server` is installed for future fetch-handler runtimes; it is
 * not the browser Data API and is not used for table access from the client.
 */
function getSupabaseUrl() {
  return process.env.SUPABASE_URL || "";
}

function hasBackendKeys() {
  return Boolean(
    getSupabaseUrl() &&
      (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

module.exports = { getSupabaseUrl, hasBackendKeys };
