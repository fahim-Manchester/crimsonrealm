import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trash2, Play, Pause, CheckCircle, Compass, Pencil, RefreshCw } from "lucide-react";
import type { Campaign, CampaignItem } from "@/hooks/useCampaigns";

interface CampaignCardProps {
  campaign: Campaign;
  onStart: (campaignId: string) => void;
  onDelete: (campaignId: string) => void;
  onComplete: (campaignId: string) => void;
  onEdit: (campaign: Campaign) => void;
  onReset?: (campaignId: string) => void;
  fetchItems: (campaignId: string) => Promise<CampaignItem[]>;
  isActive: boolean;
  onTimeUpdate?: (campaignId: string, additionalSeconds: number) => void;
}

const difficultyConfig: Record<string, { emoji: string; color: string }> = {
  trivial: { emoji: "🌿", color: "text-green-400" },
  easy: { emoji: "🌙", color: "text-blue-400" },
  medium: { emoji: "⚔️", color: "text-primary" },
  hard: { emoji: "🔥", color: "text-orange-400" },
  legendary: { emoji: "💀", color: "text-destructive" }
};

export function CampaignCard({ 
  campaign, 
  onStart, 
  onDelete, 
  onComplete,
  onEdit,
  onReset,
  fetchItems,
  isActive,
  onTimeUpdate 
}: CampaignCardProps) {
  const navigate = useNavigate();
  const [items, setItems] = useState<CampaignItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (expanded && items.length === 0) {
      fetchItems(campaign.id).then(setItems);
    }
  }, [expanded, campaign.id, fetchItems, items.length]);

  // Timer effect for when campaign is active
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Report elapsed time when stopping
      if (elapsedSeconds > 0 && onTimeUpdate) {
        onTimeUpdate(campaign.id, elapsedSeconds);
        setElapsedSeconds(0);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, campaign.id, elapsedSeconds, onTimeUpdate]);

  // Calculate progress including live elapsed time - allow overtime (>100%)
  const totalTimeMinutes = campaign.time_spent + Math.floor(elapsedSeconds / 60);
  const progressPercent = campaign.planned_time > 0
    ? (totalTimeMinutes / campaign.planned_time) * 100
    : 0;
  const isOvertime = progressPercent > 100;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const difficulty = difficultyConfig[campaign.difficulty] || difficultyConfig.medium;
  const isCompleted = campaign.status === "completed";
  const isRoutine = campaign.status === "routine";

  const handleOpenSession = () => {
    navigate(`/campaigns/${campaign.id}`);
  };

  return (
    <div className={`gothic-card p-4 transition-all duration-300 ${
      isActive ? "border-primary ring-2 ring-primary/30" : ""
    } ${isCompleted ? "opacity-60" : ""}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div 
          className="flex-1 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className={difficulty.color}>{difficulty.emoji}</span>
            <h3 className="font-cinzel text-base tracking-wide text-foreground">
              {campaign.name}
            </h3>
            {isCompleted && (
              <CheckCircle className="w-4 h-4 text-accent" />
            )}
          </div>
          <p className="text-xs text-muted-foreground font-crimson">
            {formatTime(totalTimeMinutes)} / {formatTime(campaign.planned_time)} planned
            {isActive && elapsedSeconds > 0 && (
              <span className="ml-2 text-primary">
                (+{formatElapsed(elapsedSeconds)})
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {!isCompleted && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(campaign)}
                className="h-8 w-8 p-0 hover:bg-muted/30"
                title="Edit Campaign"
              >
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenSession}
                className="h-8 w-8 p-0 hover:bg-accent/20"
                title="Open Campaign Session"
              >
                <Compass className="w-4 h-4 text-accent" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onStart(campaign.id)}
                className="h-8 w-8 p-0 hover:bg-primary/20"
                title={isActive ? "Pause Campaign" : "Start Campaign"}
              >
                {isActive ? (
                  <Pause className="w-4 h-4 text-primary" />
                ) : (
                  <Play className="w-4 h-4 text-primary" />
                )}
              </Button>
              {isRoutine && onReset && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReset(campaign.id)}
                  className="h-8 w-8 p-0 hover:bg-accent/20"
                  title="Reset Routine Campaign"
                >
                  <RefreshCw className="w-4 h-4 text-accent" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onComplete(campaign.id)}
                className="h-8 w-8 p-0 hover:bg-accent/20"
                title="Mark as Completed"
              >
                <CheckCircle className="w-4 h-4 text-accent" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(campaign.id)}
            className="h-8 w-8 p-0 hover:bg-destructive/20"
            title="Delete Campaign"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Progress Bar - shows overtime with different styling */}
      <div className="mb-3">
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`absolute left-0 top-0 h-full rounded-full transition-all ${
              isOvertime ? "bg-destructive" : "bg-primary"
            }`}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
          {isOvertime && (
            <div 
              className="absolute top-0 h-full bg-destructive/50 animate-pulse rounded-r-full"
              style={{ 
                left: '100%',
                width: `${Math.min(progressPercent - 100, 100)}%`,
                transform: 'translateX(-100%)'
              }}
            />
          )}
        </div>
        {isOvertime && (
          <p className="text-xs text-destructive mt-1 font-crimson">
            ⚠️ {Math.round(progressPercent - 100)}% over planned time
          </p>
        )}
      </div>

      {/* Expanded Items */}
      {expanded && (
        <div className="border-t border-border/30 pt-3 mt-3 space-y-2">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              Loading items...
            </p>
          ) : (
            items.map(item => (
              <div 
                key={item.id} 
                className={`flex items-center gap-2 text-sm font-crimson ${
                  item.completed ? "text-muted-foreground line-through" : ""
                }`}
              >
                <span className="text-xs">
                  {item.is_temporary 
                    ? (item.temporary_type === 'task' ? "⚡" : "🌙")
                    : (item.task_id ? "⚒️" : "🗺️")}
                </span>
                <span className="flex-1 truncate">
                  {item.is_temporary 
                    ? (item.temporary_name || "Untitled")
                    : (item.task?.title || item.project?.name || "Unknown")}
                </span>
                {item.task?.time_logged && item.task.time_logged > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {formatTime(item.task.time_logged)}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Click hint */}
      <p className="text-xs text-muted-foreground text-center mt-2 opacity-50">
        {expanded ? "Click header to collapse" : "Click to expand"}
      </p>
    </div>
  );
}
