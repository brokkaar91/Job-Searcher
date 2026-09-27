"use server";
import { z } from "zod";
import { getLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.email().max(320),
  company: z.string().trim().max(200).optional(),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(0).optional(), // honeypot
});

export type ContactState = {
  status: "idle" | "ok" | "error";
  fieldErrors?: Record<string, string[]>;
};

export async function submitEmployerContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { website: _hp, ...data } = parsed.data;
  const { error } = await createAdminClient()
    .from("contact_messages")
    .insert({ ...data, company: data.company || null, locale: await getLocale() });
  return error ? { status: "error" } : { status: "ok" };
}
