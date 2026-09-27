import type { Message } from "@/core/matching/types";

type Translator = {
  (key: never, values?: never): string;
  has: (key: never) => boolean;
};

/** Render an engine Message (template key + params) with a translator scoped to "matching". */
export function renderMessage(t: unknown, m: Message): string {
  const tr = t as Translator;
  if (!tr.has(m.key as never)) return m.key;
  return tr(m.key as never, (m.params ?? {}) as never);
}
