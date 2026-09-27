import { cn } from "@/lib/utils";

/** Slowly drifting colour blobs + fading grid. Decorative background for hero sections. */
export function Aurora({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
    >
      <div className="bg-grid absolute inset-0" />
      <div className="animate-aurora absolute -top-40 left-[8%] h-[28rem] w-[28rem] rounded-full bg-[color-mix(in_oklch,var(--primary)_28%,transparent)] blur-3xl" />
      <div className="animate-aurora absolute -top-24 right-[4%] h-[24rem] w-[24rem] rounded-full bg-[color-mix(in_oklch,var(--highlight)_24%,transparent)] blur-3xl [animation-delay:-6s]" />
      <div className="animate-aurora absolute top-40 left-[40%] h-[20rem] w-[20rem] rounded-full bg-[color-mix(in_oklch,var(--success)_18%,transparent)] blur-3xl [animation-delay:-12s]" />
    </div>
  );
}
