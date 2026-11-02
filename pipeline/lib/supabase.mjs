// The service-role Supabase client, for tier-2 build tooling only (the sync step and
// the production snapshot build). The service-role key bypasses row-level security, so
// it never belongs in client code; the architecture gate blocks the browser from
// importing a Supabase client or reading a server-only env var.
//
// The client library is imported lazily, so the local snapshot path (used by CI and
// tests) never needs @supabase/supabase-js installed or any credentials present.

let cached;

export async function serviceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to reach the data tier. " +
        "Set them in the environment (see .env.example). The local snapshot build does not need them.",
    );
  }
  if (!cached) {
    const { createClient } = await import("@supabase/supabase-js");
    cached = createClient(url, key, { auth: { persistSession: false } });
  }
  return cached;
}
