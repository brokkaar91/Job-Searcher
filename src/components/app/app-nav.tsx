"use client";
import { useTranslations } from "next-intl";
import { Bell, KanbanSquare, LayoutGrid, Settings2, Shield, UserRound } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/matches", key: "matches", icon: LayoutGrid },
  { href: "/tracker", key: "tracker", icon: KanbanSquare },
  { href: "/profile", key: "profile", icon: UserRound },
  { href: "/alerts", key: "alerts", icon: Bell },
  { href: "/privacy-center", key: "privacy", icon: Shield },
] as const;

/** Top nav on desktop, bottom tab bar on mobile. */
export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("app.nav");
  const pathname = usePathname();
  const items = isAdmin
    ? [...ITEMS, { href: "/admin", key: "admin", icon: Settings2 } as const]
    : ITEMS;
  return (
    <nav
      aria-label={t("label")}
      className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur md:static md:border-0 md:bg-transparent"
    >
      <ul className="mx-auto flex max-w-md justify-around md:max-w-none md:justify-center md:gap-1">
        {items.map(({ href, key, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-muted-foreground hover:text-foreground flex flex-col items-center gap-0.5 rounded-full px-3 py-2 text-[11px] transition-colors md:flex-row md:gap-2 md:text-sm",
                  active && "text-primary md:bg-accent md:text-accent-foreground",
                )}
              >
                <Icon aria-hidden className="size-5 md:size-4" />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
