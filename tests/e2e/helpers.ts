import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

export function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    },
  );
}

/** Sign in without e-mail: generate a magic link server-side and verify it via /auth/confirm. */
export async function signIn(page: Page, email: string, next = "/matches") {
  const { data, error } = await admin().auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  await page.goto(
    `/auth/confirm?token_hash=${data.properties.hashed_token}&type=magiclink&next=${encodeURIComponent(next)}`,
  );
}

/** Create a fresh test user with the required consents (as the registration flow does). */
export async function createTestUser(prefix = "e2e") {
  const email = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@jobmatch.test`;
  const { data, error } = await admin().auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      locale: "nl",
      consents: { terms_privacy: true, ai_processing: true },
      policy_version: "e2e",
    },
  });
  if (error) throw error;
  return { email, id: data.user.id };
}

export async function deleteUser(id: string) {
  await admin().auth.admin.deleteUser(id);
}
