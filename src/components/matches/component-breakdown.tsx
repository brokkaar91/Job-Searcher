import { getTranslations } from "next-intl/server";
import { COMPONENTS, type ComponentKey, type ComponentScore } from "@/core/matching/types";
import { renderMessage } from "@/lib/messages";

/** Per-component bars + plain-language explanation. */
export async function ComponentBreakdown({
  components,
}: {
  components: Record<ComponentKey, ComponentScore>;
}) {
  const t = await getTranslations("matching");
  const td = await getTranslations("detail");
  return (
    <ul className="space-y-4">
      {COMPONENTS.map((k) => {
        const c = components[k];
        const pct = c.score == null ? 0 : Math.round(c.score * 100);
        return (
          <li key={k} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{t(`components.${k}`)}</span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {c.score == null
                  ? td("noData")
                  : td("weight", { weight: Math.round(c.weight * 100) })}
              </span>
            </div>
            <div
              role="meter"
              aria-label={t(`components.${k}`)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className="bg-muted h-2 overflow-hidden rounded-full"
            >
              <div
                className="bg-primary h-full rounded-full transition-[width] duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-muted-foreground text-xs">{renderMessage(t, c.message)}</p>
          </li>
        );
      })}
    </ul>
  );
}
