import { useState } from "react";
import { ListOrdered, Plus, Trash2, RefreshCw, GripVertical, X, Clock, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { CampaignItem } from "@/hooks/useCampaigns";
import type { QueueSettings, AutoAdvanceTrigger, CompletionBehavior } from "@/hooks/useTaskQueue";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ---- Sortable Queue Item ----
function SortableQueueItem({
  item,
  index,
  isActive,
  isCompleted,
  targetTime,
  onRemove,
  onSetTargetTime,
}: {
  item: CampaignItem;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  targetTime?: number;
  onRemove: () => void;
  onSetTargetTime: (seconds: number) => void;
}) {
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetValue, setTargetValue] = useState(
    targetTime ? Math.round(targetTime / 60).toString() : ""
  );

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const title = item.is_temporary
    ? item.temporary_name || "Untitled"
    : item.task?.title || item.project?.name || "Unknown";

  const icon = item.is_temporary && item.temporary_type === "task"
    ? "⚡"
    : item.is_temporary && item.temporary_type === "project"
    ? "🌑"
    : item.task_id
    ? "⚒️"
    : "🗺️";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded-sm border transition-all text-sm",
        isDragging && "opacity-50",
        isActive && "border-primary bg-primary/15 ring-1 ring-primary/30",
        isCompleted && "opacity-50 line-through border-accent/30 bg-accent/5",
        !isActive && !isCompleted && "border-border/40 bg-card/40"
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-0.5">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      <span className="text-xs text-muted-foreground w-5 text-center font-mono">{index + 1}</span>
      <span className="text-sm">{icon}</span>
      <span className="flex-1 min-w-0 truncate font-crimson">{title}</span>

      {/* Target time display/edit */}
      {editingTarget ? (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <Input
            type="number"
            min={1}
            value={targetValue}
            onChange={e => setTargetValue(e.target.value)}
            className="w-14 h-6 text-xs px-1"
            autoFocus
            onKeyDown={e => {
              if (e.key === "Enter") {
                const mins = parseInt(targetValue) || 0;
                if (mins > 0) onSetTargetTime(mins * 60);
                setEditingTarget(false);
              }
              if (e.key === "Escape") setEditingTarget(false);
            }}
          />
          <span className="text-[10px] text-muted-foreground">min</span>
        </div>
      ) : (
        <button
          className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          onClick={e => {
            e.stopPropagation();
            setEditingTarget(true);
          }}
          title="Set target time"
        >
          <Target className="w-3 h-3" />
          {targetTime ? `${Math.round(targetTime / 60)}m` : "—"}
        </button>
      )}

      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onRemove}>
        <X className="w-3 h-3 text-muted-foreground" />
      </Button>
    </div>
  );
}

// ---- Add to Queue Picker ----
function AddToQueuePicker({
  items,
  queueIds,
  onAdd,
}: {
  items: CampaignItem[];
  queueIds: Set<string>;
  onAdd: (id: string) => void;
}) {
  const available = items.filter(
    i => !queueIds.has(i.id) && i.status !== "completed" && i.status !== "abandoned"
  );

  if (available.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-2">
        All items are in the queue or completed.
      </p>
    );
  }

  return (
    <div className="space-y-1 max-h-40 overflow-y-auto">
      {available.map(item => {
        const title = item.is_temporary
          ? item.temporary_name || "Untitled"
          : item.task?.title || item.project?.name || "Unknown";
        const icon = item.is_temporary && item.temporary_type === "task"
          ? "⚡"
          : item.is_temporary && item.temporary_type === "project"
          ? "🌑"
          : item.task_id
          ? "⚒️"
          : "🗺️";

        return (
          <button
            key={item.id}
            className="flex items-center gap-2 w-full p-1.5 rounded-sm text-sm hover:bg-muted/50 transition-colors text-left"
            onClick={() => onAdd(item.id)}
          >
            <Plus className="w-3 h-3 text-primary" />
            <span>{icon}</span>
            <span className="truncate font-crimson">{title}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---- Main Panel ----
interface TaskQueuePanelProps {
  items: CampaignItem[];
  queue: string[];
  currentQueueIndex: number;
  settings: QueueSettings;
  itemSessionTimes: Record<string, number>;
  onAddToQueue: (id: string) => void;
  onRemoveFromQueue: (id: string) => void;
  onReorderQueue: (newQueue: string[]) => void;
  onClearQueue: () => void;
  onRefreshQueue: () => void;
  onUpdateSettings: (partial: Partial<QueueSettings>) => void;
  onSetTargetTime: (itemId: string, seconds: number) => void;
}

export function TaskQueuePanel({
  items,
  queue,
  currentQueueIndex,
  settings,
  itemSessionTimes,
  onAddToQueue,
  onRemoveFromQueue,
  onReorderQueue,
  onClearQueue,
  onRefreshQueue,
  onUpdateSettings,
  onSetTargetTime,
}: TaskQueuePanelProps) {
  const [showAddPicker, setShowAddPicker] = useState(false);
  const queueIds = new Set(queue);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = queue.indexOf(String(active.id));
    const newIndex = queue.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorderQueue(arrayMove(queue, oldIndex, newIndex));
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "border-primary/50 hover:bg-primary/10 gap-1.5",
            settings.enabled && queue.length > 0 && "bg-primary/10 text-primary"
          )}
        >
          <ListOrdered className="w-4 h-4" />
          <span className="hidden md:inline">Queue</span>
          {queue.length > 0 && (
            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-mono">
              {queue.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[360px] sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-cinzel tracking-wide">Task Jump Queue</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <Label className="font-cinzel text-sm">Use Task Queue</Label>
            <Switch
              checked={settings.enabled}
              onCheckedChange={enabled => onUpdateSettings({ enabled })}
            />
          </div>

          <Separator />

          {/* Queue settings */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-cinzel">Auto Task Advance</Label>
              <Select
                value={settings.autoAdvanceTrigger}
                onValueChange={(v: AutoAdvanceTrigger) =>
                  onUpdateSettings({ autoAdvanceTrigger: v })
                }
              >
                <SelectTrigger className="h-8 text-xs bg-background/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual completion only</SelectItem>
                  <SelectItem value="target_time">Task target time</SelectItem>
                  <SelectItem value="pomodoro">Pomodoro interval</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-cinzel">When advancing</Label>
              <Select
                value={settings.completionBehavior}
                onValueChange={(v: CompletionBehavior) =>
                  onUpdateSettings({ completionBehavior: v })
                }
              >
                <SelectTrigger className="h-8 text-xs bg-background/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mark_complete">Mark task as complete</SelectItem>
                  <SelectItem value="switch_only">Switch without completing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Queue actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-xs gap-1"
              onClick={() => setShowAddPicker(!showAddPicker)}
            >
              <Plus className="w-3 h-3" />
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs gap-1"
              onClick={onRefreshQueue}
              title="Remove completed items"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs gap-1 text-destructive hover:text-destructive"
              onClick={onClearQueue}
              disabled={queue.length === 0}
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </Button>
          </div>

          {/* Add picker */}
          {showAddPicker && (
            <div className="border border-border/40 rounded-sm p-2">
              <AddToQueuePicker
                items={items}
                queueIds={queueIds}
                onAdd={id => {
                  onAddToQueue(id);
                }}
              />
            </div>
          )}

          {/* Queue list */}
          {queue.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <ListOrdered className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-crimson">No tasks in queue.</p>
              <p className="text-xs mt-1">Add tasks to create an execution order.</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={queue} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5">
                  {queue.map((id, index) => {
                    const item = items.find(i => i.id === id);
                    if (!item) return null;
                    const isCompleted = item.status === "completed" || item.status === "abandoned";
                    return (
                      <SortableQueueItem
                        key={id}
                        item={item}
                        index={index}
                        isActive={index === currentQueueIndex && settings.enabled}
                        isCompleted={isCompleted}
                        targetTime={settings.targetTimes[id]}
                        onRemove={() => onRemoveFromQueue(id)}
                        onSetTargetTime={secs => onSetTargetTime(id, secs)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
