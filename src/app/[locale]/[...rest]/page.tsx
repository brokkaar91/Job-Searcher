import { notFound } from "next/navigation";

/** Catch-all so unknown URLs render the localised not-found page. */
export default function CatchAll() {
  notFound();
}
