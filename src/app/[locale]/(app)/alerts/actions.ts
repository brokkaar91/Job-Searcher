"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/server/auth";

const schema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(["instant", "daily", "weekly"]),
  minScore: z.number().int().min(0).max(100),
  onlySponsoring: z.boolean(),
});

/** Alert preferences only – e-mail delivery is out of scope for phase 1 (see alert_deliveries). */
export async function saveAlertSettings(input: z.input<typeof schema>) {
  const d = schema.parse(input);
  const user = await getUser();
  if (!user) throw new Error("not authenticated");
  const supabase = await createClient();
  const { error } = await supabase
    .from("alert_settings")
    .upsert({
      user_id: user.id,
      enabled: d.enabled,
      frequency: d.frequency,
      min_score: d.minScore,
      only_sponsoring: d.onlySponsoring,
    });
  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/alerts", "page");
}
