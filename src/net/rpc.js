/**
 * Shared PostgREST transport for the Veylattice cloud project.
 *
 * The anon key identifies the project; it authorizes nothing by itself. Every
 * reachable surface is a SECURITY DEFINER function with its own guard, and the
 * tables deny direct access to `anon` entirely.
 */

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config.js";

export async function rpc(name, payload, { timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Cloud request failed (${response.status}) ${detail.slice(0, 160)}`);
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}
