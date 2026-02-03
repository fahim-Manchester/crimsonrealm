import { useState, forwardRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, CheckCircle, Ban, Clock, Edit2, X, Check, CornerLeftUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CampaignItem } from "@/hooks/useCampaigns";

interface SortableTaskItemProps {
  item: CampaignItem;
  isCurrentTask: boolean;
  onSelect: () => void;
  onUncheck?: () => void;
  onUpdateTime?: (minutes: number) => void;
  onUnembed?: () => void;
  sessionTimeSeconds?: number;
  indentLevel?: number;
  displayTimeSeconds?: number;
  showAggregatedTime?: boolean;
  nestDropId?: string;
  isDragActive?: boolean;
}

const formatTime = (seconds: number | null) => {
  if (!seconds || seconds === 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

const formatTimeMinutes = (seconds: number | null) => {
  if (!seconds || seconds === 0) return "—";
  const mins = Math.ceil(seconds / 60);
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hours === 0) return `${remainingMins}m`;
  if (remainingMins === 0) return `${hours}h`;
  return `${hours}h ${remainingMins}m`;
};

export const SortableTaskItem = forwardRef<HTMLDivElement, SortableTaskItemProps>(function SortableTaskItem({ 
  item, 
  isCurrentTask, 
  onSelect, 
  onUncheck,
  onUpdateTime,
  onUnembed,
  sessionTimeSeconds = 0,
  indentLevel = 0,
  displayTimeSeconds,
  showAggregatedTime = false,
  nestDropId,
  isDragActive = false
}, _ref) {
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editTimeValue, setEditTimeValue] = useState("");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const { setNodeRef: setNestRef, isOver: isNestOver } = useDroppable({
    id: nestDropId || `nest:${item.id}`,
    disabled: !nestDropId || isDragging,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const title = item.task?.title || item.project?.name || "Unknown";
  const isTask = !!item.task_id;
  const isTerritory = !!item.project_id;
  const isCompleted = item.status === 'completed';
  const isAbandoned = item.status === 'abandoned';
  const totalTimeSpent = displayTimeSeconds ?? ((item.time_spent || 0) + sessionTimeSeconds);
  const isNested = indentLevel > 0;

  const handleTimeEditStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentMinutes = Math.ceil((item.time_spent || 0) / 60);
    setEditTimeValue(currentMinutes.toString());
    setIsEditingTime(true);
  };

  const handleTimeEditSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMinutes = parseInt(editTimeValue) || 0;
    if (onUpdateTime) {
      onUpdateTime(newMinutes);
    }
    setIsEditingTime(false);
  };

  const handleTimeEditCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTime(false);
  };

  const handleUncheck = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUncheck) {
      onUncheck();
    }
  };

  const handleUnembed = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUnembed) {
      onUnembed();
    }
  };

  const handleClick = () => {
    if (!isCompleted && !isAbandoned) {
      onSelect();
    }
  };

  return (
    <div style={{ marginLeft: indentLevel * 24 }}>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "relative flex items-center gap-3 p-3 rounded-sm border transition-all",
          isDragging && "opacity-50 z-50",
          (isCompleted || isAbandoned) && "opacity-60",
          isCompleted && "bg-accent/10",
          isAbandoned && "bg-destructive/10",
          isTerritory && !isCompleted && !isAbandoned && "bg-accent/5 border-accent/40",
          isCurrentTask 
            ? "border-primary bg-primary/20 ring-2 ring-primary/30 cursor-default" 
            : (isCompleted || isAbandoned)
              ? "border-border/30 cursor-default"
              : "border-border/50 hover:border-border bg-card/50 cursor-pointer"
        )}
        onClick={handleClick}
      >
        {/* Nest drop zone - right 25% of the item, only interactive during drag */}
        {nestDropId && isDragActive && !isDragging && (
          <div
            ref={setNestRef}
            className={cn(
              "absolute right-0 top-0 bottom-0 w-1/4 rounded-r-sm z-10 transition-colors",
              isNestOver 
                ? "bg-accent/30 ring-2 ring-accent" 
                : "bg-accent/10 border-l border-dashed border-accent/40"
            )}
            aria-hidden="true"
          />
        )}

        {/* Unembed button for nested items */}
        {isNested && onUnembed && !isDragActive && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 -ml-1 opacity-50 hover:opacity-100"
            onClick={handleUnembed}
            title="Unembed from parent"
          >
            <CornerLeftUp className="w-3 h-3 text-muted-foreground" />
          </Button>
        )}

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
      
        <span className={cn(
          "flex-1 font-crimson text-sm truncate",
          isCompleted && "line-through",
          isAbandoned && "line-through text-muted-foreground"
        )}>
          {title}
        </span>

        {/* Time display/edit */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {isEditingTime ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                value={editTimeValue}
                onChange={(e) => setEditTimeValue(e.target.value)}
                className="w-16 h-6 text-xs px-1"
                autoFocus
              />
              <span className="text-xs text-muted-foreground">min</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleTimeEditSave}>
                <Check className="w-3 h-3 text-accent" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleTimeEditCancel}>
                <X className="w-3 h-3 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <>
              {totalTimeSpent > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimeMinutes(totalTimeSpent)}{showAggregatedTime ? " total" : ""}
                </span>
              )}
              {onUpdateTime && !isCurrentTask && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-50 hover:opacity-100"
                  onClick={handleTimeEditStart}
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
              )}
            </>
          )}
        </div>

        {/* Session time indicator for current task */}
        {isCurrentTask && sessionTimeSeconds > 0 && (
          <span className="text-xs text-primary font-mono">
            +{formatTime(sessionTimeSeconds)}
          </span>
        )}
      
        {isCompleted && (
          <div className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-accent" />
            {item.completed_session && (
              <span className="text-[10px] text-muted-foreground">S{item.completed_session}</span>
            )}
            {onUncheck && (
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 ml-1 opacity-50 hover:opacity-100"
                onClick={handleUncheck}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}

        {isAbandoned && (
          <div className="flex items-center gap-1">
            <Ban className="w-4 h-4 text-destructive" />
            {item.completed_session && (
              <span className="text-[10px] text-muted-foreground">S{item.completed_session}</span>
            )}
            {onUncheck && (
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 ml-1 opacity-50 hover:opacity-100"
                onClick={handleUncheck}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      
        {isCurrentTask && !isCompleted && !isAbandoned && (
          <span className="text-xs text-primary font-cinzel tracking-wide">
            ACTIVE
          </span>
        )}
      </div>
    </div>
  );
});
