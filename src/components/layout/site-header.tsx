import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { getProfile, getUser } from "@/server/auth";
import { CommandMenu } from "./command-menu";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader() {
  const t = await getTranslations("nav");
  const user = await getUser();
  const profile = user ? await getProfile() : null;
  const links = [
    { href: "/how-matching-works" as const, label: t("howItWorks") },
    { href: "/employers" as const, label: t("employers") },
    { href: "/faq" as const, label: t("faq") },
  ];

  return (
    <header className="sticky top-0 z-40 px-3 pt-3">
      <div className="glass shadow-soft mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-full border px-3 sm:px-4">
        <Link href="/" className="rounded-full pl-1" aria-label="JobMatch – home">
          <Logo />
        </Link>
        <nav aria-label={t("main")} className="hidden md:block">
          <NavLinks links={links} />
        </nav>
        <div className="flex items-center gap-1">
          <CommandMenu signedIn={!!user} isAdmin={profile?.role === "admin"} />
          <div className="hidden items-center sm:flex">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
          {user ? (
            <Button asChild size="sm" className="ml-1">
              <Link href="/matches">{t("myMatches")}</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                <Link href="/login">{t("login")}</Link>
              </Button>
              <Button asChild size="sm" className="ml-1">
                <Link href="/register">{t("register")}</Link>
              </Button>
            </>
          )}
          <MobileNav links={links} menuLabel={t("menu")} signedIn={!!user} />
        </div>
      </div>
    </header>
  );
}
