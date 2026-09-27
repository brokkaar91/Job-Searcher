import type { Json } from "@/lib/supabase/database.types";

/** Cast a typed value to a (non-null) JSON column value. */
export function asJson<T>(value: T): NonNullable<Json> {
  return value as unknown as NonNullable<Json>;
}
