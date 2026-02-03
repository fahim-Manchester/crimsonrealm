import { useDroppable } from "@dnd-kit/core";
import { CampaignSectionHeader } from "./CampaignSectionHeader";

interface DroppableCampaignSectionProps {
  id: string;
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  emptyMessage?: string;
}

export function DroppableCampaignSection({
  id,
  title,
  count,
  isExpanded,
  onToggle,
  icon,
  className,
  children,
  emptyMessage
}: DroppableCampaignSectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { status: id }
  });

  return (
    <section ref={setNodeRef}>
      <CampaignSectionHeader
        title={title}
        count={count}
        isExpanded={isExpanded}
        onToggle={onToggle}
        icon={icon}
        className={`${className || ""} ${isOver ? "ring-2 ring-primary bg-primary/10" : ""}`}
      />
      {isExpanded && (
        <div className={`min-h-[60px] rounded-lg mt-2 transition-colors ${isOver ? "bg-primary/5 border-2 border-dashed border-primary/30" : ""}`}>
          {count > 0 ? children : (
            <p className="text-sm text-muted-foreground text-center py-4 font-crimson">
              {emptyMessage || "Drag campaigns here"}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
