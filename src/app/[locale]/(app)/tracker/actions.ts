"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/server/auth";

const STATUSES = ["saved", "applied", "interview", "offer", "rejected"] as const;
const DATE_FIELD = {
  saved: "saved_at",
  applied: "applied_at",
  interview: "interview_at",
  offer: "offer_at",
  rejected: "rejected_at",
} as const;

async function ctx() {
  const user = await getUser();
  if (!user) throw new Error("not authenticated");
  return { user, supabase: await createClient() };
}

const moveSchema = z.object({
  id: z.uuid(),
  status: z.enum(STATUSES),
  orderedIds: z.array(z.uuid()).max(500),
});

/** Move a card to a column; stamps the column's date the first time and re-numbers positions. */
export async function moveApplication(input: z.input<typeof moveSchema>) {
  const { id, status, orderedIds } = moveSchema.parse(input);
  const { user, supabase } = await ctx();
  const { data: app } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!app) throw new Error("not found");
  const field = DATE_FIELD[status];
  await supabase
    .from("applications")
    .update({ status, ...(app[field] ? {} : { [field]: new Date().toISOString() }) })
    .eq("id", id);
  await Promise.all(
    orderedIds.map((appId, position) =>
      supabase.from("applications").update({ position }).eq("id", appId).eq("user_id", user.id),
    ),
  );
  revalidatePath("/[locale]/tracker", "page");
}

const detailsSchema = z.object({
  id: z.uuid(),
  notes: z.string().max(5000),
  appliedAt: z.string().nullable(),
  interviewAt: z.string().nullable(),
  offerAt: z.string().nullable(),
  rejectedAt: z.string().nullable(),
});

export async function updateApplication(input: z.input<typeof detailsSchema>) {
  const d = detailsSchema.parse(input);
  const { user, supabase } = await ctx();
  const toTs = (s: string | null) => (s ? new Date(s).toISOString() : null);
  const { error } = await supabase
    .from("applications")
    .update({
      notes: d.notes,
      applied_at: toTs(d.appliedAt),
      interview_at: toTs(d.interviewAt),
      offer_at: toTs(d.offerAt),
      rejected_at: toTs(d.rejectedAt),
    })
    .eq("id", d.id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/tracker", "page");
}

export async function removeApplication(id: string) {
  z.uuid().parse(id);
  const { user, supabase } = await ctx();
  await supabase.from("applications").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/[locale]/tracker", "page");
}
