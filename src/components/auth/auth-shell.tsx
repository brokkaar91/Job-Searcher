import { getTranslations } from "next-intl/server";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScoreRing } from "@/components/magic/score-ring";

/** Split auth layout: form on the left, a branded benefits panel on the right (lg+). */
export async function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations("auth.shell");
  return (
    <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-2">
      <div className="animate-fade-up mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="space-y-2 text-center lg:text-left">
          <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        <Card className="shadow-lift">{children}</Card>
      </div>
      <aside
        aria-label={t("aria")}
        className="bg-primary text-primary-foreground relative isolate hidden overflow-hidden rounded-3xl p-10 lg:block"
      >
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_10%,color-mix(in_oklch,var(--highlight)_45%,transparent),transparent_45%),radial-gradient(circle_at_0%_100%,color-mix(in_oklch,var(--success)_45%,transparent),transparent_45%)]"
        />
        <div aria-hidden className="bg-dots absolute inset-0 -z-10 opacity-40" />
        <Sparkles aria-hidden className="mb-6 size-8 opacity-90" />
        <h2 className="text-2xl font-semibold">{t("title")}</h2>
        <ul className="mt-6 space-y-3">
          {(["b1", "b2", "b3"] as const).map((k) => (
            <li key={k} className="flex gap-3">
              <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0" />
              {t(k)}
            </li>
          ))}
        </ul>
        <div
          aria-hidden
          className="bg-card text-card-foreground shadow-lift animate-float mt-10 flex items-center gap-4 rounded-2xl p-4"
        >
          <ScoreRing score={82} />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">Tulip Tech · Utrecht</p>
            <p className="truncate font-semibold">Frontend Developer (React)</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
