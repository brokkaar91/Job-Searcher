"use client";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, startTransition] = useTransition();
  const other = routing.locales.find((l) => l !== locale) as Locale;

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label={t("switchLanguage")}
      onClick={() =>
        startTransition(() => {
          // @ts-expect-error -- params of the current route are passed through unchanged
          router.replace({ pathname, params }, { locale: other });
        })
      }
    >
      <Languages aria-hidden />
      <span className="uppercase">{other}</span>
    </Button>
  );
}
