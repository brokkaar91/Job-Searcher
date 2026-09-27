"use client";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { LogOut, Moon, Shield, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Account menu (initial avatar – we never store or show a photo). */
export function UserMenu({ email, signOutLabel }: { email: string; signOutLabel: string }) {
  const t = useTranslations("app.nav");
  const tn = useTranslations("nav");
  const { resolvedTheme, setTheme } = useTheme();
  const initial = (email.trim()[0] ?? "?").toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("account")}
        className="focus-visible:ring-ring/50 ml-1 rounded-full outline-none focus-visible:ring-[3px]"
      >
        <Avatar className="ring-primary/20 hover:ring-primary/50 ring-2 transition-shadow">
          <AvatarFallback className="bg-brand-gradient text-primary-foreground">
            {initial}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="truncate font-normal">
          <span className="text-muted-foreground block text-xs">{t("signedInAs")}</span>
          <span className="truncate font-medium">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound aria-hidden /> {t("profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/privacy-center">
            <Shield aria-hidden /> {t("privacy")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
          <Moon aria-hidden /> {tn("toggleTheme")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action="/auth/signout" method="post">
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut aria-hidden /> {signOutLabel}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
