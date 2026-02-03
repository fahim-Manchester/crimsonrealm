import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CampaignItem } from "@/hooks/useCampaigns";

interface SortableTaskItemProps {
  item: CampaignItem;
  isCurrentTask: boolean;
  onSelect: () => void;
}

export function SortableTaskItem({ item, isCurrentTask, onSelect }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const title = item.task?.title || item.project?.name || "Unknown";
  const isTask = !!item.task_id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-sm border transition-all cursor-pointer",
        isDragging && "opacity-50 z-50",
        item.completed && "opacity-50 line-through",
        isCurrentTask 
          ? "border-primary bg-primary/20 ring-2 ring-primary/30" 
          : "border-border/50 hover:border-border bg-card/50"
      )}
      onClick={onSelect}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted/50 rounded"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      
      <span className="text-sm">
        {isTask ? "⚒️" : "🗺️"}
      </span>
      
      <span className="flex-1 font-crimson text-sm truncate">
        {title}
      </span>
      
      {item.completed && (
        <CheckCircle className="w-4 h-4 text-accent" />
      )}
      
      {isCurrentTask && !item.completed && (
        <span className="text-xs text-primary font-cinzel tracking-wide">
          ACTIVE
        </span>
      )}
    </div>
  );
}
