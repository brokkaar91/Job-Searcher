/**
 * Promote an existing user to admin:   pnpm make-admin someone@example.com
 * (The user must have signed in once so their profile exists.)
 */
import "./_env";
import { createAdminClient } from "../src/lib/supabase/admin";
import { writeAudit } from "../src/server/audit";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("usage: pnpm make-admin <email>");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ role: "admin" })
    .eq("email", email)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error(`no profile for ${email} – sign in once first`);
  await writeAudit(admin, {
    actorRole: "system",
    action: "user.role",
    entityType: "user",
    entityId: data[0]!.id,
    metadata: { role: "admin", via: "cli" },
  });
  console.log(`✔ ${email} is now an admin`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
