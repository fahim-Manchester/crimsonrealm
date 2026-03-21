import { GripVertical, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface QueueItem {
  id: string;
  title: string;
  url: string;
  isInternal?: boolean;
}

interface MusicQueuePanelProps {
  items: QueueItem[];
  currentId?: string;
  isPlaying?: boolean;
  loopMode: "none" | "queue" | "one";
  onPlay: (item: QueueItem, index: number) => void;
  onRemove: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  onLoopChange: (mode: "none" | "queue" | "one") => void;
  onAddFromLibrary: () => void;
  onAddInternal: () => void;
  onAddNew?: () => void;
  onAddByUrl?: () => void;
  label: string;
}

const loopLabels: Record<string, string> = {
  none: "No Loop",
  queue: "Loop Queue",
  one: "Loop One",
};

const MusicQueuePanel = ({
  items,
  currentId,
  isPlaying,
  loopMode,
  onPlay,
  onRemove,
  onReorder,
  onLoopChange,
  onAddFromLibrary,
  onAddInternal,
  onAddNew,
  onAddByUrl,
  label,
}: MusicQueuePanelProps) => {
  const cycleLoop = () => {
    const modes: Array<"none" | "queue" | "one"> = ["none", "queue", "one"];
    const next = modes[(modes.indexOf(loopMode) + 1) % modes.length];
    onLoopChange(next);
  };

  // Simple drag state
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (!isNaN(fromIndex) && fromIndex !== toIndex) {
      onReorder(fromIndex, toIndex);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={cycleLoop} className="text-xs h-7 px-2">
            {loopLabels[loopMode]}
          </Button>
        </div>
      </div>

      <ScrollArea className="max-h-48">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Queue is empty</p>
        ) : (
          <div className="space-y-1">
            {items.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                draggable
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, index)}
                onClick={() => onPlay(item, index)}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors group",
                  "hover:bg-primary/10",
                  currentId === item.id && "bg-primary/20 text-primary"
                )}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground opacity-50 cursor-grab flex-shrink-0" />
                <span className="text-sm truncate flex-1">{item.title}</span>
                {item.isInternal && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">theme</span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); onRemove(index); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={onAddInternal} className="text-xs flex-1">
          <Plus className="h-3 w-3 mr-1" />
          Theme Tracks
        </Button>
        <Button size="sm" variant="outline" onClick={onAddFromLibrary} className="text-xs flex-1">
          <Plus className="h-3 w-3 mr-1" />
          From Library
        </Button>
        {onAddByUrl && (
          <Button size="sm" variant="outline" onClick={onAddByUrl} className="text-xs flex-1">
            <Plus className="h-3 w-3 mr-1" />
            Add URL
          </Button>
        )}
        {onAddNew && (
          <Button size="sm" variant="outline" onClick={onAddNew} className="text-xs flex-1">
            <Plus className="h-3 w-3 mr-1" />
            Save New
          </Button>
        )}
      </div>
    </div>
  );
};

export default MusicQueuePanel;
