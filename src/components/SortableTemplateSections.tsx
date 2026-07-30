import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, ChevronRight, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ReportTemplateSection } from "@/lib/report-templates";

const LEVEL_STYLES: Record<number, { indent: string; text: string; label: string }> = {
  1: { indent: "ml-0", text: "text-sm font-medium", label: "Section" },
  2: { indent: "ml-6", text: "text-sm", label: "Subsection" },
  3: { indent: "ml-12", text: "text-xs", label: "Sub-subsection" },
};

/** Drag-and-drop sortable list of a report template's sections, used in /admin/templates.
 * Reorders locally on drop; caller persists the new sequence. Each row's title is editable
 * inline and saves on blur. Level 1 starts a new page in the assembled report; level 2/3
 * nest as subsection / sub-subsection headings within that page. */
export function SortableTemplateSections({
  sections, onReorder, onRename, onDelete, onLevelChange,
}: {
  sections: ReportTemplateSection[];
  onReorder: (newOrder: ReportTemplateSection[]) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onLevelChange: (id: string, level: 1 | 2 | 3) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(sections, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {sections.map((s) => (
            <SortableSectionRow key={s.id} section={s} onRename={onRename} onDelete={onDelete} onLevelChange={onLevelChange} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableSectionRow({ section, onRename, onDelete, onLevelChange }: {
  section: ReportTemplateSection;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onLevelChange: (id: string, level: 1 | 2 | 3) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  const level = section.level ?? 1;
  const styles = LEVEL_STYLES[level];

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border bg-card ${styles.indent}`}>
      <button
        type="button"
        aria-label="Drag to reorder"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          size="icon" variant="ghost" className="h-6 w-6" disabled={level <= 1}
          title="Outdent (promote to a higher level)"
          onClick={() => onLevelChange(section.id, (level - 1) as 1 | 2 | 3)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon" variant="ghost" className="h-6 w-6" disabled={level >= 3}
          title="Indent (demote to a subsection)"
          onClick={() => onLevelChange(section.id, (level + 1) as 1 | 2 | 3)}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground shrink-0 w-24">{styles.label}</span>
      <Input
        defaultValue={section.title}
        onBlur={(e) => { if (e.target.value.trim() && e.target.value !== section.title) onRename(section.id, e.target.value.trim()); }}
        className={`h-8 flex-1 ${styles.text}`}
      />
      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0" onClick={() => onDelete(section.id)}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
