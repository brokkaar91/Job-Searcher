"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface EscoOption {
  uri: string;
  label: string;
  iscoCode?: string;
}

interface Row {
  uri: string;
  preferred_label_en: string;
  preferred_label_nl: string | null;
  isco_code?: string;
}

/**
 * Accessible combobox (WAI-ARIA 1.2 pattern) over the ESCO search API.
 * Enter on free text without a selection adds it as an unmapped entry when `allowFreeText`.
 */
export function EscoAutocomplete({
  kind,
  onSelect,
  placeholder,
  label,
  allowFreeText = false,
  exclude = [],
}: {
  kind: "skills" | "occupations";
  onSelect: (o: EscoOption & { mapped: boolean }) => void;
  placeholder: string;
  label: string;
  allowFreeText?: boolean;
  exclude?: string[];
}) {
  const locale = useLocale();
  const id = useId();
  const [q, setQ] = useState("");
  const [options, setOptions] = useState<EscoOption[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      abort.current?.abort();
      abort.current = new AbortController();
      try {
        const res = await fetch(`/api/esco/${kind}?q=${encodeURIComponent(q)}`, {
          signal: abort.current.signal,
        });
        const rows = (await res.json()) as Row[];
        setOptions(
          rows
            .filter((r) => !exclude.includes(r.uri))
            .map((r) => ({
              uri: r.uri,
              label:
                locale === "nl"
                  ? (r.preferred_label_nl ?? r.preferred_label_en)
                  : r.preferred_label_en,
              iscoCode: r.isco_code,
            })),
        );
        setActive(-1);
        setOpen(true);
      } catch {
        /* aborted */
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [q, kind, locale, exclude]);

  function choose(o: EscoOption, mapped = true) {
    onSelect({ ...o, mapped });
    setQ("");
    setOptions([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Input
        id={id}
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
        placeholder={placeholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (active >= 0 && options[active]) choose(options[active]);
            else if (allowFreeText && q.trim().length >= 2)
              choose({ uri: "", label: q.trim() }, false);
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && options.length > 0 && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="bg-popover shadow-soft absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border p-1"
        >
          {options.map((o, i) => (
            <li
              key={o.uri}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o)}
              className={cn(
                "cursor-pointer rounded-md px-3 py-2 text-sm",
                i === active ? "bg-accent text-accent-foreground" : "hover:bg-muted",
              )}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
