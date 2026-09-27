import { getTranslations } from "next-intl/server";
import { ArrowRight, BadgeCheck, Eye, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  await resolveLocale(params);
  const t = await getTranslations("home");

  const pillars = [
    { icon: Eye, title: t("pillars.explainable.title"), text: t("pillars.explainable.text") },
    { icon: Scale, title: t("pillars.fair.title"), text: t("pillars.fair.text") },
    { icon: BadgeCheck, title: t("pillars.sponsor.title"), text: t("pillars.sponsor.text") },
  ];
  const steps = ["cv", "check", "preferences", "matches"] as const;

  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[32rem] bg-[radial-gradient(ellipse_at_top,var(--accent),transparent_65%)]"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-16 pb-20 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pt-24">
          <FadeIn className="space-y-6">
            <Badge variant="accent" className="px-3 py-1 text-[13px]">
              <Sparkles aria-hidden /> {t("badge")}
            </Badge>
            <h1 className="text-4xl leading-[1.08] font-semibold sm:text-5xl md:text-6xl">
              {t("title")}
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg">{t("subtitle")}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/register">
                  {t("ctaPrimary")} <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/how-matching-works">{t("ctaSecondary")}</Link>
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">{t("reassurance")}</p>
          </FadeIn>

          <FadeIn delay={0.15}>
            <Card className="gap-5 p-6 sm:p-7" aria-label={t("preview.aria")}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-muted-foreground text-sm">Canal Analytics · Amsterdam</p>
                  <p className="text-lg font-semibold">Senior Data Engineer</p>
                </div>
                <Badge variant="success">{t("preview.label")}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="accent">
                  <ShieldCheck aria-hidden /> {t("preview.sponsor")}
                </Badge>
                <Badge variant="outline">€6.200 – €7.800</Badge>
                <Badge variant="outline">{t("preview.hybrid")}</Badge>
                <Badge variant="outline">EN</Badge>
              </div>
              <ul className="space-y-2 text-sm">
                {(["r1", "r2", "r3"] as const).map((r) => (
                  <li key={r} className="flex gap-2">
                    <span
                      aria-hidden
                      className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full"
                    />
                    {t(`preview.${r}`)}
                  </li>
                ))}
              </ul>
              <div className="space-y-2">
                {(
                  [
                    ["skills", 92],
                    ["experience", 81],
                    ["practical", 100],
                  ] as const
                ).map(([k, v]) => (
                  <div
                    key={k}
                    className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-3 text-xs"
                  >
                    <span className="text-muted-foreground">{t(`preview.${k}`)}</span>
                    <span className="bg-muted h-1.5 overflow-hidden rounded-full">
                      <span
                        className="bg-primary block h-full rounded-full"
                        style={{ width: `${v}%` }}
                      />
                    </span>
                    <span className="text-right tabular-nums">{v}</span>
                  </div>
                ))}
              </div>
            </Card>
          </FadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="pillars">
        <h2 id="pillars" className="sr-only">
          {t("pillarsTitle")}
        </h2>
        <ul className="grid gap-5 md:grid-cols-3">
          {pillars.map(({ icon: Icon, title, text }, i) => (
            <FadeIn as="li" key={title} delay={i * 0.08}>
              <Card className="h-full">
                <span className="bg-accent text-accent-foreground flex size-11 items-center justify-center rounded-xl">
                  <Icon aria-hidden className="size-5" />
                </span>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-muted-foreground text-sm">{text}</p>
              </Card>
            </FadeIn>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-labelledby="steps">
        <div className="mb-10 max-w-2xl space-y-3">
          <h2 id="steps" className="text-3xl font-semibold">
            {t("stepsTitle")}
          </h2>
          <p className="text-muted-foreground">{t("stepsSubtitle")}</p>
        </div>
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <FadeIn as="li" key={s} delay={i * 0.06}>
              <div className="h-full space-y-2 rounded-xl border border-dashed p-5">
                <span className="text-primary text-sm font-medium">0{i + 1}</span>
                <h3 className="font-semibold">{t(`steps.${s}.title`)}</h3>
                <p className="text-muted-foreground text-sm">{t(`steps.${s}.text`)}</p>
              </div>
            </FadeIn>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <FadeIn>
          <Card className="bg-primary text-primary-foreground items-start gap-5 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">{t("ctaBlock.title")}</h2>
              <p className="opacity-90">{t("ctaBlock.text")}</p>
            </div>
            <Button asChild size="lg" variant="secondary">
              <Link href="/register">{t("ctaPrimary")}</Link>
            </Button>
          </Card>
        </FadeIn>
      </section>
    </>
  );
}
