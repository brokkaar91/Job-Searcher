import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import {
  Ban,
  Briefcase,
  FileSignature,
  GraduationCap,
  Hand,
  Languages,
  ListChecks,
  MapPin,
  Scale,
  Wallet,
} from "lucide-react";
import { resolveLocale } from "@/i18n/locale";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHero } from "@/components/magic/page-hero";
import { SpotlightCard } from "@/components/magic/spotlight-card";
import { COMPONENTS, KNOCKOUT_RULES } from "@/core/matching/types";
import { DEFAULT_MODEL_CONFIG, modelConfigSchema } from "@/core/matching/config";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/how-matching-works">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "howItWorks" });
  return { title: t("title") };
}

/** Transparency page: shows the weights of the ACTIVE model version straight from the database. */
async function activeModel() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("matching_model_versions")
      .select("version, config, activated_at, created_at")
      .eq("is_active", true)
      .maybeSingle();
    const parsed = data ? modelConfigSchema.safeParse(data.config) : null;
    if (data && parsed?.success)
      return {
        version: data.version,
        date: data.activated_at ?? data.created_at,
        config: parsed.data,
      };
  } catch {
    // no backend configured – fall back to documented defaults
  }
  return { version: 1, date: null, config: DEFAULT_MODEL_CONFIG };
}

const RULE_ICONS = {
  language: Languages,
  location: MapPin,
  salary: Wallet,
  contract: FileSignature,
  education: GraduationCap,
} as const;

/** Colours for the weight donut, cycling through the brand palette. */
const SLICE_COLORS = [
  "var(--primary)",
  "oklch(0.6 0.12 165)",
  "var(--highlight)",
  "oklch(0.62 0.1 230)",
  "oklch(0.7 0.12 130)",
  "oklch(0.55 0.08 280)",
];

export default async function HowMatchingWorksPage({
  params,
}: PageProps<"/[locale]/how-matching-works">) {
  await resolveLocale(params);
  const t = await getTranslations("howItWorks");
  const tm = await getTranslations("matching");
  const format = await getFormatter();
  const model = await activeModel();

  return (
    <>
      <PageHero title={t("title")} subtitle={t("intro")}>
        <Badge variant="accent" className="px-3 py-1">
          {t("modelVersion", { version: model.version })}
          {model.date ? ` · ${format.dateTime(new Date(model.date), { dateStyle: "long" })}` : ""}
        </Badge>
      </PageHero>
      <div className="mx-auto max-w-4xl space-y-16 px-4 pb-8 sm:px-6">
        <section aria-labelledby="layer-a" className="space-y-6">
          <div className="flex items-center gap-3">
            <ListChecks aria-hidden className="text-primary size-6" />
            <h2 id="layer-a" className="text-2xl font-semibold">
              {t("layerA.title")}
            </h2>
          </div>
          <p className="text-muted-foreground">{t("layerA.intro")}</p>
          <ul className="grid gap-4 sm:grid-cols-2">
            {KNOCKOUT_RULES.map((rule) => {
              const Icon = RULE_ICONS[rule];
              return (
                <SpotlightCard as="li" key={rule} className="flex gap-4 p-5">
                  <span className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <div className="space-y-1">
                    <h3 className="font-semibold">{tm(`rules.${rule}`)}</h3>
                    <p className="text-muted-foreground text-sm">{t(`layerA.rules.${rule}`)}</p>
                  </div>
                </SpotlightCard>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="layer-b" className="space-y-6">
          <div className="flex items-center gap-3">
            <Scale aria-hidden className="text-primary size-6" />
            <h2 id="layer-b" className="text-2xl font-semibold">
              {t("layerB.title")}
            </h2>
          </div>
          <p className="text-muted-foreground">{t("layerB.intro")}</p>
          <Card className="gap-8 md:flex-row md:items-center">
            <div
              aria-hidden
              className="relative mx-auto size-44 shrink-0 rounded-full"
              style={{
                background: `conic-gradient(${COMPONENTS.reduce<{ stops: string[]; at: number }>(
                  (acc, c, i) => {
                    const next = acc.at + model.config.weights[c];
                    acc.stops.push(`${SLICE_COLORS[i % SLICE_COLORS.length]} ${acc.at}% ${next}%`);
                    acc.at = next;
                    return acc;
                  },
                  { stops: [], at: 0 },
                ).stops.join(", ")})`,
              }}
            >
              <div className="bg-card absolute inset-5 flex flex-col items-center justify-center rounded-full">
                <Briefcase className="text-primary size-6" />
                <span className="text-2xl font-semibold">100%</span>
              </div>
            </div>
            <ul className="flex-1 space-y-6">
              {COMPONENTS.map((c, i) => (
                <li key={c} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <span
                        aria-hidden
                        className="size-2.5 rounded-full"
                        style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                      />
                      {tm(`components.${c}`)}
                    </h3>
                    <span className="text-primary text-lg font-semibold tabular-nums">
                      {model.config.weights[c]}%
                    </span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full" aria-hidden>
                    <div
                      className="bg-brand-gradient h-full rounded-full"
                      style={{ width: `${model.config.weights[c]}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground text-sm">{t(`layerB.components.${c}`)}</p>
                </li>
              ))}
            </ul>
          </Card>
          <p className="text-muted-foreground text-sm">
            {t("labels", {
              strong: model.config.thresholds.strong,
              good: model.config.thresholds.good,
              possible: model.config.thresholds.possible,
            })}
          </p>
        </section>

        <section aria-labelledby="never" className="grid gap-5 md:grid-cols-2">
          <Card className="border-destructive/20 bg-destructive/[0.03]">
            <Ban aria-hidden className="text-destructive size-6" />
            <h2 id="never" className="text-xl font-semibold">
              {t("never.title")}
            </h2>
            <p className="text-muted-foreground text-sm">{t("never.text")}</p>
          </Card>
          <Card className="border-primary/20 bg-accent/40">
            <Hand aria-hidden className="text-primary size-6" />
            <h2 className="text-xl font-semibold">{t("control.title")}</h2>
            <p className="text-muted-foreground text-sm">{t("control.text")}</p>
          </Card>
        </section>

        <section className="text-muted-foreground space-y-3 text-sm">
          <h2 className="text-foreground text-lg font-semibold">{t("science.title")}</h2>
          <p>{t("science.text")}</p>
        </section>
      </div>
    </>
  );
}
