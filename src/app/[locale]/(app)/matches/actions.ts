"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/server/auth";

const jobId = z.uuid();
const REASONS = [
  "salary",
  "location",
  "role",
  "language",
  "sponsorship",
  "seniority",
  "company",
  "contract",
  "already_applied",
  "other",
] as const;

async function ctx() {
  const user = await getUser();
  if (!user) throw new Error("not authenticated");
  return { user, supabase: await createClient() };
}

async function feedback(
  type: "saved" | "unsaved" | "dismissed" | "applied",
  id: string,
  reason?: (typeof REASONS)[number] | null,
  comment?: string | null,
) {
  const { user, supabase } = await ctx();
  const { data: match } = await supabase
    .from("matches")
    .select("id")
    .eq("user_id", user.id)
    .eq("job_id", id)
    .maybeSingle();
  const { error } = await supabase.from("match_feedback").insert({
    user_id: user.id,
    job_id: id,
    match_id: match?.id ?? null,
    type,
    reason: reason ?? null,
    comment: comment ?? null,
  });
  if (error) throw new Error(error.message);
  return { user, supabase };
}

function revalidate() {
  revalidatePath("/[locale]/matches", "layout");
  revalidatePath("/[locale]/tracker", "page");
}

export async function saveJob(id: string) {
  jobId.parse(id);
  const { user, supabase } = await feedback("saved", id);
  await supabase
    .from("applications")
    .upsert(
      { user_id: user.id, job_id: id, status: "saved" },
      { onConflict: "user_id,job_id", ignoreDuplicates: true },
    );
  revalidate();
}

export async function unsaveJob(id: string) {
  jobId.parse(id);
  const { user, supabase } = await feedback("unsaved", id);
  await supabase
    .from("applications")
    .delete()
    .eq("user_id", user.id)
    .eq("job_id", id)
    .eq("status", "saved");
  revalidate();
}

const dismissSchema = z.object({
  id: jobId,
  reason: z.enum(REASONS),
  comment: z.string().max(1000).optional(),
});

export async function dismissJob(input: z.input<typeof dismissSchema>) {
  const { id, reason, comment } = dismissSchema.parse(input);
  await feedback("dismissed", id, reason, comment || null);
  revalidate();
}

export async function undoDismiss(id: string) {
  jobId.parse(id);
  await feedback("unsaved", id);
  revalidate();
}

/** Logs the application and moves it to "applied" in the tracker; the client opens the external link. */
export async function applyToJob(id: string) {
  jobId.parse(id);
  const { user, supabase } = await feedback("applied", id);
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("applications")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("job_id", id)
    .maybeSingle();
  if (!existing)
    await supabase
      .from("applications")
      .insert({ user_id: user.id, job_id: id, status: "applied", applied_at: now });
  else if (existing.status === "saved")
    await supabase
      .from("applications")
      .update({ status: "applied", applied_at: now })
      .eq("id", existing.id);
  revalidate();
}
