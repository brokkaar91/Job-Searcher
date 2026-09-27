import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { getUser } from "@/server/auth";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";
import { MobileNav } from "./mobile-nav";

export async function SiteHeader() {
  const t = await getTranslations("nav");
  const user = await getUser();
  const links = [
    { href: "/how-matching-works", label: t("howItWorks") },
    { href: "/employers", label: t("employers") },
    { href: "/faq", label: t("faq") },
  ] as const;

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-40 border-b border-transparent backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="rounded-lg" aria-label="JobMatch – home">
          <Logo />
        </Link>
        <nav aria-label={t("main")} className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Button key={l.href} asChild variant="ghost" size="sm">
              <Link href={l.href}>{l.label}</Link>
            </Button>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
          {user ? (
            <Button asChild size="sm" className="ml-1">
              <Link href="/matches">{t("myMatches")}</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">{t("login")}</Link>
              </Button>
              <Button asChild size="sm" className="ml-1">
                <Link href="/register">{t("register")}</Link>
              </Button>
            </>
          )}
          <MobileNav links={links.map((l) => ({ ...l }))} menuLabel={t("menu")} />
        </div>
      </div>
    </header>
  );
}
