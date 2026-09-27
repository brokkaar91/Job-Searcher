import { cn } from "@/lib/utils";

/** Header band for public sub-pages: soft gradient + grid, eyebrow, title and intro. */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative isolate overflow-hidden", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute -top-32 left-1/2 h-72 w-[48rem] -translate-x-1/2 rounded-full bg-[color-mix(in_oklch,var(--primary)_16%,transparent)] blur-3xl" />
      </div>
      <div className="animate-fade-up mx-auto max-w-3xl space-y-4 px-4 pt-16 pb-10 text-center sm:px-6 md:pt-20">
        {eyebrow && (
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">{eyebrow}</p>
        )}
        <h1 className="text-4xl font-semibold sm:text-5xl">{title}</h1>
        {subtitle && <p className="text-muted-foreground mx-auto max-w-2xl text-lg">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
