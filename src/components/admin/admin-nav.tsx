"use client";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Briefcase,
  Cable,
  History,
  ScrollText,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", key: "overview", icon: BarChart3, exact: true },
  { href: "/admin/connectors", key: "connectors", icon: Cable },
  { href: "/admin/runs", key: "runs", icon: History },
  { href: "/admin/jobs", key: "jobs", icon: Briefcase },
  { href: "/admin/matching", key: "matching", icon: SlidersHorizontal },
  { href: "/admin/users", key: "users", icon: Users },
  { href: "/admin/audit", key: "audit", icon: ScrollText },
] as const;

export function AdminNav() {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")} className="overflow-x-auto px-2 pb-2 md:pb-0">
      <ul className="flex gap-1 md:flex-col">
        {ITEMS.map(({ href, key, icon: Icon, ...rest }) => {
          const active = "exact" in rest ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap",
                  active && "bg-accent text-accent-foreground",
                )}
              >
                <Icon aria-hidden className="size-4" /> {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
