"use client";
import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLink, GripVertical, NotebookPen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  moveApplication,
  removeApplication,
  updateApplication,
} from "@/app/[locale]/(app)/tracker/actions";

export const COLUMNS = ["saved", "applied", "interview", "offer", "rejected"] as const;
export type Column = (typeof COLUMNS)[number];

export interface TrackerCard {
  id: string;
  jobId: string;
  status: Column;
  notes: string;
  title: string;
  company: string;
  city: string | null;
  applyUrl: string | null;
  dates: Record<Column, string | null>;
}

type Board = Record<Column, TrackerCard[]>;

function toBoard(cards: TrackerCard[]): Board {
  const b = Object.fromEntries(COLUMNS.map((c) => [c, [] as TrackerCard[]])) as Board;
  for (const c of cards) b[c.status].push(c);
  return b;
}

function columnOf(board: Board, id: string): Column | null {
  if ((COLUMNS as readonly string[]).includes(id)) return id as Column;
  return COLUMNS.find((c) => board[c].some((x) => x.id === id)) ?? null;
}

function CardView({
  card,
  onOpen,
  onMove,
  dragging,
}: {
  card: TrackerCard;
  onOpen?: () => void;
  onMove?: (to: Column) => void;
  dragging?: boolean;
}) {
  const t = useTranslations("tracker");
  const format = useFormatter();
  const date = card.dates[card.status];
  return (
    <div
      className={cn(
        "bg-card shadow-soft space-y-2 rounded-xl border p-3 text-sm",
        dragging && "ring-primary rotate-1 ring-2",
      )}
    >
      <div className="min-w-0">
        <Link href={`/matches/${card.jobId}`} className="font-medium hover:underline">
          {card.title}
        </Link>
        <p className="text-muted-foreground truncate text-xs">
          {card.company}
          {card.city ? ` · ${card.city}` : ""}
        </p>
      </div>
      {date && (
        <p className="text-muted-foreground text-xs">
          {t(`since.${card.status}`, {
            date: format.dateTime(new Date(date), { dateStyle: "medium" }),
          })}
        </p>
      )}
      {card.notes && (
        <p className="text-muted-foreground line-clamp-2 text-xs italic">{card.notes}</p>
      )}
      {onMove && (
        <div className="flex items-center gap-1">
          <label className="sr-only" htmlFor={`move-${card.id}`}>
            {t("moveTo")}
          </label>
          <select
            id={`move-${card.id}`}
            value={card.status}
            onChange={(e) => onMove(e.target.value as Column)}
            className="bg-background h-7 flex-1 rounded-md border px-1.5 text-xs"
          >
            {COLUMNS.map((c) => (
              <option key={c} value={c}>
                {t(`columns.${c}`)}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={t("details")}
            onClick={onOpen}
          >
            <NotebookPen aria-hidden />
          </Button>
          {card.applyUrl && (
            <Button asChild variant="ghost" size="icon" className="size-7">
              <a
                href={card.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("openJob")}
              >
                <ExternalLink aria-hidden />
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function SortableCard({
  card,
  onOpen,
  onMove,
}: {
  card: TrackerCard;
  onOpen: () => void;
  onMove: (to: Column) => void;
}) {
  const t = useTranslations("tracker");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative", isDragging && "opacity-40")}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={t("drag", { title: card.title })}
        className="text-muted-foreground focus-visible:ring-ring absolute top-2.5 right-2 z-10 cursor-grab touch-none rounded-md p-1 focus-visible:ring-2 active:cursor-grabbing"
      >
        <GripVertical aria-hidden className="size-4" />
      </button>
      <CardView card={card} onOpen={onOpen} onMove={onMove} />
    </li>
  );
}

function ColumnView({
  column,
  cards,
  children,
}: {
  column: Column;
  cards: TrackerCard[];
  children: React.ReactNode;
}) {
  const t = useTranslations("tracker");
  const { setNodeRef, isOver } = useDroppable({ id: column });
  return (
    <section
      aria-labelledby={`col-${column}`}
      className={cn(
        "bg-muted/60 flex w-72 shrink-0 flex-col gap-3 rounded-2xl p-3 md:w-auto",
        isOver && "ring-primary/40 ring-2",
      )}
    >
      <h2
        id={`col-${column}`}
        className="flex items-center justify-between px-1 text-sm font-semibold"
      >
        {t(`columns.${column}`)}
        <span className="bg-background text-muted-foreground rounded-full px-2 py-0.5 text-xs tabular-nums">
          {cards.length}
        </span>
      </h2>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex min-h-24 flex-1 flex-col gap-2">
          {children}
          {cards.length === 0 && (
            <li className="text-muted-foreground rounded-xl border border-dashed p-4 text-center text-xs">
              {t("emptyColumn")}
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  );
}

function DetailsDialog({ card, onClose }: { card: TrackerCard | null; onClose: () => void }) {
  const t = useTranslations("tracker");
  const [pending, start] = useTransition();
  const toInput = (s: string | null) => (s ? s.slice(0, 10) : "");
  const [notes, setNotes] = useState(card?.notes ?? "");
  const [dates, setDates] = useState(() => ({
    applied: toInput(card?.dates.applied ?? null),
    interview: toInput(card?.dates.interview ?? null),
    offer: toInput(card?.dates.offer ?? null),
    rejected: toInput(card?.dates.rejected ?? null),
  }));
  if (!card) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{card.title}</DialogTitle>
          <DialogDescription>{card.company}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="notes">{t("notes")}</Label>
          <Textarea
            id="notes"
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={5000}
            placeholder={t("notesPlaceholder")}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(["applied", "interview", "offer", "rejected"] as const).map((k) => (
            <div key={k} className="grid gap-1.5">
              <Label htmlFor={`d-${k}`}>{t(`dates.${k}`)}</Label>
              <Input
                id={`d-${k}`}
                type="date"
                value={dates[k]}
                onChange={(e) => setDates((d) => ({ ...d, [k]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <DialogFooter className="sm:justify-between">
          <Button
            variant="ghost"
            className="text-destructive"
            onClick={() =>
              start(async () => {
                await removeApplication(card.id);
                onClose();
              })
            }
          >
            <Trash2 aria-hidden /> {t("remove")}
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                await updateApplication({
                  id: card.id,
                  notes,
                  appliedAt: dates.applied || null,
                  interviewAt: dates.interview || null,
                  offerAt: dates.offer || null,
                  rejectedAt: dates.rejected || null,
                });
                toast(t("saved"));
                onClose();
              })
            }
          >
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Application tracker: Saved → Applied → Interview → Offer → Rejected. Drag & drop, keyboard or select. */
export function KanbanBoard({ initial }: { initial: TrackerCard[] }) {
  const t = useTranslations("tracker");
  const [board, setBoard] = useState<Board>(() => toBoard(initial));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openCard, setOpenCard] = useState<TrackerCard | null>(null);
  const [, start] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const persist = (b: Board, id: string, to: Column) =>
    start(async () => {
      try {
        await moveApplication({ id, status: to, orderedIds: b[to].map((c) => c.id) });
      } catch {
        toast.error(t("error"));
      }
    });

  const moveTo = (card: TrackerCard, to: Column) => {
    if (card.status === to) return;
    const next = {
      ...board,
      [card.status]: board[card.status].filter((c) => c.id !== card.id),
      [to]: [
        {
          ...card,
          status: to,
          dates: { ...card.dates, [to]: card.dates[to] ?? new Date().toISOString() },
        },
        ...board[to],
      ],
    } as Board;
    setBoard(next);
    persist(next, card.id, to);
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const from = columnOf(board, String(active.id));
    const to = columnOf(board, String(over.id));
    if (!from || !to || from === to) return;
    setBoard((b) => {
      const card = b[from].find((c) => c.id === active.id)!;
      const overIndex = b[to].findIndex((c) => c.id === over.id);
      const insertAt = overIndex < 0 ? b[to].length : overIndex;
      const moved = {
        ...card,
        status: to,
        dates: { ...card.dates, [to]: card.dates[to] ?? new Date().toISOString() },
      };
      return {
        ...b,
        [from]: b[from].filter((c) => c.id !== active.id),
        [to]: [...b[to].slice(0, insertAt), moved, ...b[to].slice(insertAt)],
      };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    const col = columnOf(board, String(active.id));
    if (!col) return;
    const oldIndex = board[col].findIndex((c) => c.id === active.id);
    const newIndex = board[col].findIndex((c) => c.id === over.id);
    const next =
      newIndex >= 0 && oldIndex !== newIndex
        ? { ...board, [col]: arrayMove(board[col], oldIndex, newIndex) }
        : board;
    setBoard(next);
    persist(next, String(active.id), col);
  };

  const active = activeId ? COLUMNS.flatMap((c) => board[c]).find((c) => c.id === activeId) : null;
  const total = COLUMNS.reduce((s, c) => s + board[c].length, 0);

  return (
    <>
      {total === 0 && (
        <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
          {t("empty")}
        </p>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0">
          {COLUMNS.map((col) => (
            <ColumnView key={col} column={col} cards={board[col]}>
              {board[col].map((card) => (
                <SortableCard
                  key={card.id}
                  card={card}
                  onOpen={() => setOpenCard(card)}
                  onMove={(to) => moveTo(card, to)}
                />
              ))}
            </ColumnView>
          ))}
        </div>
        <DragOverlay>{active ? <CardView card={active} dragging /> : null}</DragOverlay>
      </DndContext>
      {openCard && (
        <DetailsDialog key={openCard.id} card={openCard} onClose={() => setOpenCard(null)} />
      )}
    </>
  );
}
