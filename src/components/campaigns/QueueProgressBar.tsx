import { CheckCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CampaignItem } from "@/hooks/useCampaigns";

interface QueueProgressBarProps {
  queueItems: CampaignItem[];
  currentQueueIndex: number;
  isActive: boolean;
}

export function QueueProgressBar({
  queueItems,
  currentQueueIndex,
  isActive,
}: QueueProgressBarProps) {
  if (!isActive || queueItems.length === 0) return null;

  const getTitle = (item: CampaignItem) =>
    item.is_temporary
      ? item.temporary_name || "Untitled"
      : item.task?.title || item.project?.name || "?";

  // Show compact version for many items
  const compact = queueItems.length > 5;

  if (compact) {
    const current = queueItems[currentQueueIndex];
    const next = queueItems[currentQueueIndex + 1];
    const completedCount = currentQueueIndex;

    return (
      <div className="flex items-center justify-center gap-3 px-4 py-2 bg-card/30 border border-border/30 rounded-sm">
        <span className="text-xs font-cinzel text-muted-foreground tracking-widest uppercase">
          Queue
        </span>
        <span className="text-sm font-cinzel text-primary tabular-nums">
          {currentQueueIndex + 1} / {queueItems.length}
        </span>
        {current && (
          <span className="text-xs font-crimson text-foreground truncate max-w-[120px]">
            {getTitle(current)}
          </span>
        )}
        {next && (
          <span className="text-xs text-muted-foreground truncate max-w-[100px]">
            → {getTitle(next)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5 px-4 py-2 bg-card/30 border border-border/30 rounded-sm overflow-x-auto">
      {queueItems.map((item, index) => {
        const isCompleted = index < currentQueueIndex;
        const isCurrent = index === currentQueueIndex;
        const title = getTitle(item);

        return (
          <div key={item.id} className="flex items-center gap-1.5 min-w-0">
            {index > 0 && (
              <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
            )}
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-crimson whitespace-nowrap transition-all",
                isCompleted && "text-accent line-through opacity-60",
                isCurrent && "bg-primary/15 text-primary ring-1 ring-primary/30 font-medium",
                !isCompleted && !isCurrent && "text-muted-foreground"
              )}
            >
              {isCompleted && <CheckCircle className="w-3 h-3 text-accent flex-shrink-0" />}
              <span className="truncate max-w-[80px]">{title}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
