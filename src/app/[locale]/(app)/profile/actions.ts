"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/server/auth";
import { MAX_CV_BYTES, processCvUpload, requestCandidateRefresh } from "@/server/candidate";
import { CV_MIME_TYPES } from "@/core/providers/parser/extract";

export type CvState = {
  status: "idle" | "ok" | "error";
  error?: "type" | "size" | "parse" | "empty" | "failed";
};

export async function uploadNewCv(_prev: CvState, formData: FormData): Promise<CvState> {
  const user = await getUser();
  if (!user) return { status: "error", error: "failed" };
  const file = formData.get("cv");
  if (!(file instanceof File) || file.size === 0) return { status: "error", error: "empty" };
  if (!Object.values(CV_MIME_TYPES).includes(file.type as never))
    return { status: "error", error: "type" };
  if (file.size > MAX_CV_BYTES) return { status: "error", error: "size" };
  const admin = createAdminClient();
  const result = await processCvUpload(admin, user.id, {
    name: file.name,
    type: file.type,
    bytes: new Uint8Array(await file.arrayBuffer()),
  });
  if (!result.parsed) return { status: "error", error: "parse" };
  await requestCandidateRefresh(admin, user.id);
  revalidatePath("/[locale]/profile", "page");
  return { status: "ok" };
}

/** Deletes a CV version (file + row). The profile data derived from it stays until edited. */
export async function deleteCvVersion(id: string) {
  z.uuid().parse(id);
  const user = await getUser();
  if (!user) throw new Error("not authenticated");
  const supabase = await createClient();
  const { data: cv } = await supabase
    .from("cv_files")
    .select("id, storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!cv) return;
  await supabase.storage.from("cvs").remove([cv.storage_path]);
  await supabase.from("cv_files").delete().eq("id", id);
  const { data: latest } = await supabase
    .from("cv_files")
    .select("id")
    .eq("user_id", user.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  await supabase
    .from("candidate_profiles")
    .update({ current_cv_id: latest?.id ?? null })
    .eq("user_id", user.id);
  revalidatePath("/[locale]/profile", "page");
}
