import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/server/auth";

/**
 * Admin backoffice. requireAdmin() here AND in every admin action / route handler –
 * a layout alone is not a security boundary.
 */
export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]">) {
  await resolveLocale(params);
  const profile = await requireAdmin();
  const t = await getTranslations("admin");
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="bg-card border-b md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex h-16 items-center justify-between gap-2 px-4">
          <Link href="/admin" aria-label="JobMatch admin">
            <Logo />
          </Link>
          <span className="bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-xs font-medium">
            {t("badge")}
          </span>
        </div>
        <AdminNav />
        <div className="text-muted-foreground hidden px-4 py-4 text-xs md:block">
          {profile.email}
        </div>
      </aside>
      <div className="flex-1">
        <div className="flex h-16 items-center justify-end gap-1 border-b px-4 sm:px-6">
          <Link
            href="/matches"
            className="text-muted-foreground hover:text-foreground mr-auto text-sm"
          >
            ← {t("backToApp")}
          </Link>
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
        <main id="main" className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
