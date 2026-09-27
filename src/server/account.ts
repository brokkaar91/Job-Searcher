import { createHash } from "node:crypto";
import type { AdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "./audit";

/**
 * Permanently deletes a user and ALL their data: CV files in storage, then the auth user
 * (cascades to every table via profiles). A deletion_requests row (hashed e-mail only) and an
 * audit entry remain as proof of erasure.
 */
export async function deleteUserCompletely(
  admin: AdminClient,
  userId: string,
  source: "user" | "retention" | "admin",
  actorId: string | null = userId,
): Promise<void> {
  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  const emailHash = createHash("sha256")
    .update((profile?.email ?? userId).toLowerCase())
    .digest("hex");
  const { data: request } = await admin
    .from("deletion_requests")
    .insert({ user_id: userId, email_hash: emailHash, source, status: "processing" })
    .select("id")
    .single();

  const { data: files } = await admin.storage.from("cvs").list(userId, { limit: 1000 });
  if (files?.length)
    await admin.storage.from("cvs").remove(files.map((f) => `${userId}/${f.name}`));

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    if (request)
      await admin.from("deletion_requests").update({ status: "pending" }).eq("id", request.id);
    throw new Error(`deleting user failed: ${error.message}`);
  }
  if (request)
    await admin
      .from("deletion_requests")
      .update({ status: "completed", processed_at: new Date().toISOString() })
      .eq("id", request.id);
  await writeAudit(admin, {
    actorId: source === "user" ? null : actorId,
    actorRole: source === "admin" ? "admin" : source === "retention" ? "system" : "user",
    action: "account.delete",
    entityType: "user",
    entityId: emailHash.slice(0, 16),
    metadata: { source, cvFiles: files?.length ?? 0 },
  });
}
