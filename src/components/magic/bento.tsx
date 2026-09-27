import { cn } from "@/lib/utils";
import { SpotlightCard } from "./spotlight-card";

export function BentoGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ul className={cn("grid auto-rows-[minmax(12rem,auto)] gap-4 md:grid-cols-3", className)}>
      {children}
    </ul>
  );
}

export function BentoCard({
  icon: Icon,
  title,
  text,
  className,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  text: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <SpotlightCard as="li" className={cn("flex flex-col gap-3", className)}>
      <span className="bg-accent text-accent-foreground ring-primary/10 flex size-11 items-center justify-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
        <Icon aria-hidden className="size-5" />
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{text}</p>
      {children && <div className="mt-auto pt-2">{children}</div>}
    </SpotlightCard>
  );
}
