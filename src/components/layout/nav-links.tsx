"use client";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Href = "/how-matching-works" | "/employers" | "/faq";

/** Desktop header links with an active indicator. */
export function NavLinks({ links }: { links: { href: Href; label: string }[] }) {
  const pathname = usePathname();
  return (
    <ul className="flex items-center gap-1">
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "text-muted-foreground hover:text-foreground relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                active && "text-foreground",
              )}
            >
              {l.label}
              {active && (
                <span
                  aria-hidden
                  className="bg-brand-gradient absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full"
                />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
