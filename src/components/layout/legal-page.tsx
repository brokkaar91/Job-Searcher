import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/** Placeholder legal page. TODO(legal): all texts must be reviewed by a lawyer before launch. */
export function LegalPage({
  title,
  todo,
  sections,
}: {
  title: string;
  todo: string;
  sections: { title: string; text: string }[];
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-semibold">{title}</h1>
      <Alert variant="warning">
        <TriangleAlert aria-hidden />
        <AlertDescription>{todo}</AlertDescription>
      </Alert>
      {sections.map((s) => (
        <section key={s.title} className="space-y-2">
          <h2 className="text-xl font-semibold">{s.title}</h2>
          <p className="text-muted-foreground whitespace-pre-line">{s.text}</p>
        </section>
      ))}
    </div>
  );
}
