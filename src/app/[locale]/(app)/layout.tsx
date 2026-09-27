import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/brand/logo";
import { AppNav } from "@/components/app/app-nav";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getProfile, hasRequiredConsents, requireUser } from "@/server/auth";
import { createClient } from "@/lib/supabase/server";

/** Authenticated area. Every page below also calls requireUser() implicitly via this layout. */
export default async function AppLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = await resolveLocale(params);
  const user = await requireUser(locale);
  if (!(await hasRequiredConsents(user.id))) redirect({ href: "/consent", locale });
  const profile = await getProfile();
  const supabase = await createClient();
  await supabase.rpc("touch_last_active");
  const t = await getTranslations("app.nav");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/matches" aria-label="JobMatch">
            <Logo />
          </Link>
          <AppNav isAdmin={profile?.role === "admin"} />
          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <button className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-full px-3 py-1.5 text-sm">
                {t("signOut")}
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-28 sm:px-6 md:pb-12">
        {children}
      </main>
    </div>
  );
}
