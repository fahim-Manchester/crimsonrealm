import { ChevronDown, ChevronRight } from "lucide-react";

interface CampaignSectionHeaderProps {
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function CampaignSectionHeader({ 
  title, 
  count, 
  isExpanded, 
  onToggle,
  icon,
  className = ""
}: CampaignSectionHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 py-3 px-4 rounded-lg border border-border/30 bg-card/50 hover:bg-card/80 transition-colors ${className}`}
    >
      <div className="text-muted-foreground">
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </div>
      {icon && <div className="text-primary">{icon}</div>}
      <span className="font-cinzel text-sm tracking-wide text-foreground flex-1 text-left">
        {title}
      </span>
      <span className="text-xs text-muted-foreground font-crimson">
        {count} {count === 1 ? "campaign" : "campaigns"}
      </span>
    </button>
  );
}
