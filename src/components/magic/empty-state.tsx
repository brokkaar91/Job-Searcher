import { cn } from "@/lib/utils";

/** Friendly empty state with a small abstract illustration. */
export function EmptyState({
  icon: Icon,
  title,
  text,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  text?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      <div
        aria-hidden
        className="bg-dots absolute inset-0 [mask-image:radial-gradient(circle_at_50%_30%,#000,transparent_70%)]"
      />
      <div className="relative mb-2">
        <span aria-hidden className="bg-primary/15 absolute inset-0 -m-3 rounded-full blur-xl" />
        <span className="bg-accent text-accent-foreground ring-background relative flex size-16 items-center justify-center rounded-2xl ring-8">
          <Icon aria-hidden className="size-7" />
        </span>
      </div>
      <h2 className="relative text-lg font-semibold">{title}</h2>
      {text && <p className="text-muted-foreground relative max-w-md text-sm">{text}</p>}
      {children && (
        <div className="relative mt-2 flex flex-wrap justify-center gap-2">{children}</div>
      )}
    </div>
  );
}
