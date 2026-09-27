"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/server/auth";
import { writeAudit } from "@/server/audit";
import { deleteUserCompletely } from "@/server/account";

export async function setUserRole(userId: string, role: "user" | "admin") {
  const admin = await requireAdmin();
  z.uuid().parse(userId);
  if (userId === admin.id && role !== "admin")
    throw new Error("You cannot remove your own admin role");
  const db = createAdminClient();
  await db
    .from("profiles")
    .update({ role: z.enum(["user", "admin"]).parse(role) })
    .eq("id", userId);
  await writeAudit(db, {
    actorId: admin.id,
    actorRole: "admin",
    action: "user.role",
    entityType: "user",
    entityId: userId,
    metadata: { role },
  });
  revalidatePath("/[locale]/admin/users", "page");
}

export async function adminDeleteUser(userId: string) {
  const admin = await requireAdmin();
  z.uuid().parse(userId);
  if (userId === admin.id) throw new Error("You cannot delete yourself here");
  await deleteUserCompletely(createAdminClient(), userId, "admin", admin.id);
  revalidatePath("/[locale]/admin/users", "page");
}

export async function markContactHandled(id: string) {
  const admin = await requireAdmin();
  const db = createAdminClient();
  await db
    .from("contact_messages")
    .update({ handled_at: new Date().toISOString() })
    .eq("id", z.uuid().parse(id));
  await writeAudit(db, {
    actorId: admin.id,
    actorRole: "admin",
    action: "contact.handled",
    entityType: "contact_message",
    entityId: id,
  });
  revalidatePath("/[locale]/admin/users", "page");
}
