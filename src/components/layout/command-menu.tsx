"use client";
import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  Bell,
  BookOpen,
  Building2,
  HelpCircle,
  Home,
  KanbanSquare,
  Languages,
  LayoutGrid,
  Moon,
  Search,
  Settings2,
  Shield,
  UserRound,
} from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

type Href =
  | "/"
  | "/how-matching-works"
  | "/employers"
  | "/faq"
  | "/matches"
  | "/tracker"
  | "/profile"
  | "/alerts"
  | "/privacy-center"
  | "/admin";

/** ⌘K / Ctrl+K quick navigation + actions (theme, language). */
export function CommandMenu({
  signedIn,
  isAdmin = false,
  compact = false,
}: {
  signedIn: boolean;
  isAdmin?: boolean;
  compact?: boolean;
}) {
  const t = useTranslations("command");
  const tn = useTranslations("nav");
  const ta = useTranslations("app.nav");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const locale = useLocale();
  const { resolvedTheme, setTheme } = useTheme();
  const [, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: Href) => {
    setOpen(false);
    router.push(href);
  };

  const pages: { href: Href; label: string; icon: typeof Home }[] = [
    { href: "/", label: t("home"), icon: Home },
    { href: "/how-matching-works", label: tn("howItWorks"), icon: BookOpen },
    { href: "/employers", label: tn("employers"), icon: Building2 },
    { href: "/faq", label: tn("faq"), icon: HelpCircle },
  ];
  const app: { href: Href; label: string; icon: typeof Home }[] = signedIn
    ? [
        { href: "/matches", label: ta("matches"), icon: LayoutGrid },
        { href: "/tracker", label: ta("tracker"), icon: KanbanSquare },
        { href: "/profile", label: ta("profile"), icon: UserRound },
        { href: "/alerts", label: ta("alerts"), icon: Bell },
        { href: "/privacy-center", label: ta("privacy"), icon: Shield },
        ...(isAdmin ? [{ href: "/admin" as const, label: ta("admin"), icon: Settings2 }] : []),
      ]
    : [];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        aria-label={tn("search")}
        className={cn(
          "text-muted-foreground hover:text-foreground hover:border-primary/40 bg-card/60 focus-visible:ring-ring/50 inline-flex h-9 items-center gap-2 rounded-full border text-sm transition-colors outline-none focus-visible:ring-[3px]",
          compact ? "w-9 justify-center" : "w-9 justify-center lg:w-56 lg:justify-start lg:px-3",
        )}
      >
        <Search aria-hidden className="size-4 shrink-0" />
        {!compact && (
          <>
            <span className="hidden flex-1 text-left lg:inline">{tn("searchShort")}</span>
            <Kbd className="hidden lg:inline-flex">⌘K</Kbd>
          </>
        )}
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="bg-foreground/30 sheet-overlay fixed inset-0 z-50 backdrop-blur-sm" />
        <DialogPrimitive.Content className="shadow-lift animate-fade-up fixed top-[12dvh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border">
          <DialogPrimitive.Title className="sr-only">{tn("search")}</DialogPrimitive.Title>
          <Command loop>
            <CommandInput placeholder={t("placeholder")} />
            <CommandList>
              <CommandEmpty>{t("empty")}</CommandEmpty>
              {app.length > 0 && (
                <CommandGroup heading={t("app")}>
                  {app.map(({ href, label, icon: Icon }) => (
                    <CommandItem key={href} value={label} onSelect={() => go(href)}>
                      <Icon aria-hidden /> {label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandGroup heading={t("pages")}>
                {pages.map(({ href, label, icon: Icon }) => (
                  <CommandItem key={href} value={label} onSelect={() => go(href)}>
                    <Icon aria-hidden /> {label}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading={t("actions")}>
                <CommandItem
                  value={t("toggleTheme")}
                  onSelect={() => {
                    setTheme(resolvedTheme === "dark" ? "light" : "dark");
                    setOpen(false);
                  }}
                >
                  <Moon aria-hidden /> {t("toggleTheme")}
                </CommandItem>
                <CommandItem
                  value={t("switchLanguage")}
                  onSelect={() => {
                    const other = routing.locales.find((l) => l !== locale) as Locale;
                    setOpen(false);
                    startTransition(() => {
                      // @ts-expect-error -- params of the current route are passed through unchanged
                      router.replace({ pathname, params }, { locale: other });
                    });
                  }}
                >
                  <Languages aria-hidden /> {t("switchLanguage")}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
