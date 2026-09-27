import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Download one of your own CV versions via a short-lived signed URL (RLS-checked). */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/cv/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: cv } = await supabase
    .from("cv_files")
    .select("storage_path, file_name")
    .eq("id", id)
    .maybeSingle();
  if (!cv) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { data, error } = await supabase.storage
    .from("cvs")
    .createSignedUrl(cv.storage_path, 60, { download: cv.file_name });
  if (error || !data) return NextResponse.json({ error: "unavailable" }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
