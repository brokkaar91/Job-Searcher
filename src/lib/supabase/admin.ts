import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Service-role client: BYPASSES RLS. Only for the worker, seed scripts and server code that has
 * already performed its own authorisation check (e.g. after requireAdmin()). Never import in
 * client components.
 */
export function createAdminClient() {
  if (typeof window !== "undefined")
    throw new Error("createAdminClient must not run in the browser");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type AdminClient = ReturnType<typeof createAdminClient>;
