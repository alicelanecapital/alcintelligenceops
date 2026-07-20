import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortableRound = { round: number; title: string; subtitle?: string | null };

/** Drag-and-drop sortable list of DD framework rounds used in
 * /admin/dd-framework. Reorders locally on drop; caller persists the new
 * sequence via reorderFrameworkRounds. Round numbers are stable identifiers
 * — only display order changes. */
export function SortableRoundsList({
  rounds, current, onSelect, onReorder, completedRounds,
}: {
  rounds: SortableRound[];
  current: number;
  onSelect: (round: number) => void;
  onReorder: (newOrder: SortableRound[]) => void;
  completedRounds?: number[];
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = rounds.findIndex((r) => String(r.round) === String(active.id));
    const newIndex = rounds.findIndex((r) => String(r.round) === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(rounds, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={rounds.map((r) => String(r.round))} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {rounds.map((r, idx) => (
            <SortableRow
              key={r.round}
              round={r}
              index={idx}
              active={r.round === current}
              completed={completedRounds?.includes(r.round) ?? false}
              onSelect={() => onSelect(r.round)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ round, index, active, completed, onSelect }: {
  round: SortableRound; index: number; active: boolean; completed: boolean; onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(round.round) });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-2 py-2 rounded-lg transition-colors border-l-4",
        completed ? "bg-emerald-50 border-l-emerald-600"
          : active ? "bg-primary/10 border-l-primary"
          : "border-l-transparent hover:bg-muted/60",
      )}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button type="button" onClick={onSelect} className="flex-1 min-w-0 text-left flex items-start gap-2">
        <span className={cn(
          "flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-bold shrink-0 mt-0.5",
          completed ? "bg-emerald-600 text-white"
            : active ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground border border-border",
        )}>
          {completed ? <Check className="h-3.5 w-3.5" /> : index + 1}
        </span>
        <span className="min-w-0">
          <span className={cn("block text-sm font-medium truncate", active ? "text-primary" : "text-foreground")}>
            {round.title}
          </span>
          {round.subtitle && <span className="block text-xs text-muted-foreground truncate">{round.subtitle}</span>}
        </span>
      </button>
    </div>
  );
}
