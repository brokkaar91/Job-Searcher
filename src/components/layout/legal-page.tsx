import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHero } from "@/components/magic/page-hero";

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
    <>
      <PageHero title={title} />
      <div className="mx-auto max-w-3xl space-y-8 px-4 pb-8 sm:px-6">
        <Alert variant="warning">
          <TriangleAlert aria-hidden />
          <AlertDescription>{todo}</AlertDescription>
        </Alert>
        <nav aria-label={title} className="bg-card rounded-2xl border p-5">
          <ol className="grid gap-1.5 text-sm sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.title}>
                <a href={`#s-${i}`} className="text-muted-foreground hover:text-primary">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        {sections.map((s, i) => (
          <section key={s.title} id={`s-${i}`} className="scroll-mt-24 space-y-2">
            <h2 className="text-xl font-semibold">{s.title}</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{s.text}</p>
          </section>
        ))}
      </div>
    </>
  );
}
