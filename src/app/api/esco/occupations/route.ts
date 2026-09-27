import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_esco_occupations", {
    q: q.slice(0, 80),
    lim: 10,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? [], { headers: { "cache-control": "private, max-age=60" } });
}
