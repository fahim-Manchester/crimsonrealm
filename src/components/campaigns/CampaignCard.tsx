import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trash2, Play, Pause, CheckCircle } from "lucide-react";
import type { Campaign, CampaignItem } from "@/hooks/useCampaigns";

interface CampaignCardProps {
  campaign: Campaign;
  onStart: (campaignId: string) => void;
  onDelete: (campaignId: string) => void;
  onComplete: (campaignId: string) => void;
  fetchItems: (campaignId: string) => Promise<CampaignItem[]>;
  isActive: boolean;
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
  fetchItems,
  isActive 
}: CampaignCardProps) {
  const [items, setItems] = useState<CampaignItem[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded && items.length === 0) {
      fetchItems(campaign.id).then(setItems);
    }
  }, [expanded, campaign.id, fetchItems, items.length]);

  const progressPercent = campaign.planned_time > 0
    ? Math.min((campaign.time_spent / campaign.planned_time) * 100, 100)
    : 0;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const difficulty = difficultyConfig[campaign.difficulty] || difficultyConfig.medium;
  const isCompleted = campaign.status === "completed";

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
            {formatTime(campaign.time_spent)} / {formatTime(campaign.planned_time)} planned
          </p>
        </div>

        <div className="flex items-center gap-1">
          {!isCompleted && (
            <>
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

      {/* Progress Bar */}
      <div className="mb-3">
        <Progress value={progressPercent} className="h-2" />
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
                  {item.task_id ? "⚒️" : "🗺️"}
                </span>
                <span className="flex-1 truncate">
                  {item.task?.title || item.project?.name || "Unknown"}
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
