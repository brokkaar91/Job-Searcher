"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Menu } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

type Href = "/how-matching-works" | "/employers" | "/faq";

export function MobileNav({
  links,
  menuLabel,
  signedIn,
}: {
  links: { href: Href; label: string }[];
  menuLabel: string;
  signedIn: boolean;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={menuLabel}>
            <Menu aria-hidden />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" closeLabel={t("close")} className="gap-8">
          <SheetTitle className="sr-only">{menuLabel}</SheetTitle>
          <Logo />
          <nav aria-label={t("main")}>
            <ul className="space-y-1">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    aria-current={pathname === l.href ? "page" : undefined}
                    className={cn(
                      "hover:bg-accent flex items-center justify-between rounded-xl px-3 py-3 text-base font-medium",
                      pathname === l.href && "bg-accent text-accent-foreground",
                    )}
                  >
                    {l.label}
                    <ArrowRight aria-hidden className="text-muted-foreground size-4" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-auto grid gap-2">
            {signedIn ? (
              <Button asChild size="lg">
                <Link href="/matches" onClick={() => setOpen(false)}>
                  {t("myMatches")}
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link href="/register" onClick={() => setOpen(false)}>
                    {t("register")}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login" onClick={() => setOpen(false)}>
                    {t("login")}
                  </Link>
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
