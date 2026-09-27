"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import type { WorkValue } from "@/core/matching/types";
import { completeOnboarding, saveValuesData } from "@/app/[locale]/(app)/onboarding/actions";
import { moveValue } from "@/core/assessments/work-values";
import { cn } from "@/lib/utils";
import { StepFooter } from "./step-footer";

function Item({
  value,
  index,
  count,
  onMove,
}: {
  value: WorkValue;
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
}) {
  const t = useTranslations("workValues");
  const tv = useTranslations("onboarding.values");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: value,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "bg-card shadow-soft flex items-center gap-3 rounded-xl border p-3",
        isDragging && "ring-primary z-10 ring-2",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={tv("drag", { value: t(`${value}.label`) })}
        className="text-muted-foreground focus-visible:ring-ring cursor-grab touch-none rounded-md p-1 focus-visible:ring-2 active:cursor-grabbing"
      >
        <GripVertical aria-hidden className="size-5" />
      </button>
      <span className="bg-accent text-accent-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{t(`${value}.label`)}</p>
        <p className="text-muted-foreground text-sm">{t(`${value}.description`)}</p>
      </div>
      <div className="flex flex-col">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={index === 0}
          aria-label={tv("up", { value: t(`${value}.label`) })}
          onClick={() => onMove(index, index - 1)}
        >
          <ArrowUp aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={index === count - 1}
          aria-label={tv("down", { value: t(`${value}.label`) })}
          onClick={() => onMove(index, index + 1)}
        >
          <ArrowDown aria-hidden />
        </Button>
      </div>
    </li>
  );
}

/** Rank the six O*NET work values (drag & drop, keyboard or arrow buttons). */
export function ValuesStep({
  initial,
  mode = "onboarding",
}: {
  initial: WorkValue[];
  mode?: "onboarding" | "profile";
}) {
  const t = useTranslations("onboarding.values");
  const [ranking, setRanking] = useState<WorkValue[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      setRanking((r) =>
        arrayMove(r, r.indexOf(active.id as WorkValue), r.indexOf(over.id as WorkValue)),
      );
    }
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r =
            mode === "onboarding"
              ? await completeOnboarding(ranking)
              : await saveValuesData(ranking);
          if (r && !r.ok) setError(t("error"));
          else setSaved(true);
        });
      }}
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ranking} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2" aria-label={t("listLabel")}>
            {ranking.map((v, i) => (
              <Item
                key={v}
                value={v}
                index={i}
                count={ranking.length}
                onMove={(from, to) => setRanking((r) => moveValue(r, from, to))}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {mode === "onboarding" ? (
        <StepFooter
          back="/onboarding/interests"
          pending={pending}
          error={error}
          nextLabel={t("finish")}
        />
      ) : (
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {t("save")}
          </Button>
          {saved && !pending && (
            <span role="status" className="text-success text-sm">
              {t("saved")}
            </span>
          )}
        </div>
      )}
    </form>
  );
}
