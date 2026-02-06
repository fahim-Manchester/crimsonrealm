import { useState, forwardRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, CheckCircle, Ban, Clock, Edit2, X, Check, CornerLeftUp, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CampaignItem } from "@/hooks/useCampaigns";

interface SortableTaskItemProps {
  item: CampaignItem;
  isCurrentTask: boolean; // Is this the task being timed?
  isSelected?: boolean; // Is this the task selected in UI? (separate from timing)
  isTimerRunning?: boolean; // NEW: Is any timer currently running?
  onSelect: () => void;
  onUncheck?: () => void;
  onUpdateTime?: (minutes: number) => void;
  onUnembed?: () => void;
  onMarkPermanent?: () => void;
  sessionTimeSeconds?: number;
  indentLevel?: number;
  displayTimeSeconds?: number;
  showAggregatedTime?: boolean;
  nestDropId?: string;
  isDragActive?: boolean;
}

// Always show HH:MM:SS format for accurate time tracking
const formatTimeHMS = (seconds: number | null) => {
  if (!seconds || seconds === 0) return "00:00:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
};

// Short format for session time increment display
const formatTimeShort = (seconds: number | null) => {
  if (!seconds || seconds === 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(mins)}:${pad(secs)}`;
};

export const SortableTaskItem = forwardRef<HTMLDivElement, SortableTaskItemProps>(function SortableTaskItem({ 
  item, 
  isCurrentTask, // Task being timed
  isSelected, // Task selected in UI (may differ from isCurrentTask)
  isTimerRunning = false, // NEW: Is any timer currently running globally?
  onSelect, 
  onUncheck,
  onUpdateTime,
  onUnembed,
  onMarkPermanent,
  sessionTimeSeconds = 0,
  indentLevel = 0,
  displayTimeSeconds,
  showAggregatedTime = false,
  nestDropId,
  isDragActive = false
}, _ref) {
  // Use isSelected for highlighting if provided, otherwise fall back to isCurrentTask
  const isHighlighted = isSelected !== undefined ? isSelected : isCurrentTask;
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

  // For temporary items, use temporary_name; for linked items, use task/project title
  const title = item.is_temporary 
    ? item.temporary_name || "Untitled"
    : item.task?.title || item.project?.name || "Unknown";
  const isTask = !!item.task_id || item.temporary_type === 'task';
  const isTerritory = !!item.project_id || item.temporary_type === 'project';
  const isCompleted = item.status === 'completed';
  const isAbandoned = item.status === 'abandoned';
  const totalTimeSpent = displayTimeSeconds ?? ((item.time_spent || 0) + sessionTimeSeconds);
  const isNested = indentLevel > 0;
  const isTemporary = item.is_temporary;

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

  const handleMarkPermanent = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMarkPermanent) {
      onMarkPermanent();
    }
  };

  const handleClick = () => {
    if (!isCompleted && !isAbandoned) {
      onSelect();
    }
  };

  // Visual styling based on item type
  // FIX: Single visual selection - when timer is running, only timed task gets strong highlight
  const getItemStyles = () => {
    if (isCompleted) return "bg-accent/10 border-accent/30";
    if (isAbandoned) return "bg-destructive/10 border-destructive/30";
    
    // Timed task (actively being timed) ALWAYS gets strong primary highlight
    if (isCurrentTask) return "border-primary bg-primary/20 ring-2 ring-primary/30";
    
    // Selected but NOT timed - behavior depends on whether timer is running
    if (isHighlighted && !isCurrentTask) {
      if (isTimerRunning) {
        // Timer is running on another task - show subtle "next up" indicator (dashed border)
        // This makes it clear that THIS task is NOT currently being timed
        return "border-dashed border-muted-foreground/50 bg-muted/5";
      }
      // Timer is paused - selected task gets normal selection highlight
      return "border-primary/50 bg-primary/10 ring-1 ring-primary/20";
    }
    
    // Different styles for each type (when not selected)
    if (isTemporary && item.temporary_type === 'task') {
      // Pop-up Quest: warm amber/orange tint
      return "bg-amber-500/10 border-amber-500/40 hover:border-amber-500/60";
    }
    if (isTemporary && item.temporary_type === 'project') {
      // Hidden Territory: mystical purple tint
      return "bg-purple-500/10 border-purple-500/40 hover:border-purple-500/60";
    }
    if (isTerritory) {
      // Regular Territory: green/accent tint
      return "bg-accent/5 border-accent/40 hover:border-accent/60";
    }
    // Regular Task: default card style
    return "border-border/50 hover:border-border bg-card/50";
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
          getItemStyles(),
          // Cursor: pointer for unselected, default for completed/timed
          (isCompleted || isAbandoned || isCurrentTask) ? "cursor-default" : "cursor-pointer"
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
      
        {/* Icon based on item type - 4 distinct icons */}
        <span className="text-sm">
          {isTemporary && item.temporary_type === 'task' && "⚡"}
          {isTemporary && item.temporary_type === 'project' && "🌑"}
          {!isTemporary && isTask && "⚒️"}
          {!isTemporary && isTerritory && "🗺️"}
        </span>

        {/* Mark button for temporary items */}
        {isTemporary && onMarkPermanent && !isDragActive && (
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "h-6 w-6 opacity-80 hover:opacity-100",
              item.temporary_type === 'task' 
                ? "bg-amber-500/20 hover:bg-amber-500/30" 
                : "bg-purple-500/20 hover:bg-purple-500/30"
            )}
            onClick={handleMarkPermanent}
            title={`Save this ${item.temporary_type === 'task' ? 'Pop-up Quest' : 'Hidden Territory'} permanently`}
          >
            <Bookmark className={cn(
              "w-3 h-3",
              item.temporary_type === 'task' ? "text-amber-500" : "text-purple-500"
            )} />
          </Button>
        )}
      
        <span className={cn(
          "flex-1 font-crimson text-sm truncate",
          isCompleted && "line-through",
          isAbandoned && "line-through text-muted-foreground",
          isTemporary && item.temporary_type === 'task' && "text-amber-200/90",
          isTemporary && item.temporary_type === 'project' && "text-purple-200/90"
        )}>
          {title}
          {isTemporary && (
            <span className={cn(
              "text-[10px] ml-1.5 px-1.5 py-0.5 rounded-sm font-cinzel tracking-wide",
              item.temporary_type === 'task' 
                ? "bg-amber-500/20 text-amber-400" 
                : "bg-purple-500/20 text-purple-400"
            )}>
              {item.temporary_type === 'task' ? 'POP-UP' : 'HIDDEN'}
            </span>
          )}
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
              <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" />
                {totalTimeSpent > 0 ? formatTimeHMS(totalTimeSpent) : "00:00:00"}{showAggregatedTime ? " total" : ""}
              </span>
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
            +{formatTimeShort(sessionTimeSeconds)}
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
