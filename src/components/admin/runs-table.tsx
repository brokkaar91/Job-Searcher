import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface RunRow {
  id: string;
  status: string;
  trigger: string;
  started_at: string | null;
  finished_at: string | null;
  counts: unknown;
  connectorName: string | null;
}

export async function RunsTable({ runs }: { runs: RunRow[] }) {
  const t = await getTranslations("admin.runs");
  const format = await getFormatter();
  const keys = [
    "fetched",
    "new",
    "updated",
    "unchanged",
    "duplicate",
    "failed",
    "expired",
  ] as const;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("cols.started")}</TableHead>
          {runs.some((r) => r.connectorName) && <TableHead>{t("cols.connector")}</TableHead>}
          <TableHead>{t("cols.status")}</TableHead>
          {keys.map((k) => (
            <TableHead key={k} className="text-right">
              {t(`counts.${k}`)}
            </TableHead>
          ))}
          <TableHead className="text-right">{t("cols.duration")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((r) => {
          const c = (r.counts ?? {}) as Record<string, number>;
          const secs =
            r.started_at && r.finished_at
              ? Math.round(
                  (new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000,
                )
              : null;
          return (
            <TableRow key={r.id}>
              <TableCell>
                <Link href={`/admin/runs/${r.id}`} className="hover:underline">
                  {r.started_at
                    ? format.dateTime(new Date(r.started_at), {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })
                    : "–"}
                </Link>
                <span className="text-muted-foreground ml-2 text-xs">
                  {t(`trigger.${r.trigger as "manual" | "schedule"}`)}
                </span>
              </TableCell>
              {runs.some((x) => x.connectorName) && <TableCell>{r.connectorName}</TableCell>}
              <TableCell>
                <Badge
                  variant={
                    r.status === "succeeded"
                      ? "success"
                      : r.status === "failed"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {r.status}
                </Badge>
              </TableCell>
              {keys.map((k) => (
                <TableCell key={k} className="text-right tabular-nums">
                  {c[k] ?? 0}
                </TableCell>
              ))}
              <TableCell className="text-muted-foreground text-right tabular-nums">
                {secs != null ? `${secs}s` : "–"}
              </TableCell>
            </TableRow>
          );
        })}
        {!runs.length && (
          <TableRow>
            <TableCell colSpan={10} className="text-muted-foreground py-6 text-center">
              {t("empty")}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
