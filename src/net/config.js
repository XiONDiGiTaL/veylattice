/**
 * Public client configuration for the Veylattice cloud profile.
 *
 * These two values are safe to ship in a static site: the Supabase URL and the
 * *publishable* anon key identify the project, they do not authorize anything.
 * Row-level security denies direct table access entirely; the only reachable
 * surface is two RPC functions, and writes additionally require the profile's
 * private edit token.
 *
 * The service-role key must never appear in this repository or in the browser.
 */

export const SUPABASE_URL = "https://jjtfnduodxtulxvviasf.supabase.co";

export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqdGZuZHVvZHh0dWx4dnZpYXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDI4NDEsImV4cCI6MjEwODc3ODg0MX0.uwd9NXIQxNk2dq5I91ms8Ydbl_lE7lVxff7J9-vbXsU";

/** Set to false to run entirely local (no network calls at all). */
export const CLOUD_ENABLED = true;

export const PROFILE_RPC_GET = "veylattice_profile_get";
export const PROFILE_RPC_SAVE = "veylattice_profile_save";
