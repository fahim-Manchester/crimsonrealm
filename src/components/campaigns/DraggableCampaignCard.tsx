import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CampaignCard } from "./CampaignCard";
import type { Campaign, CampaignItem } from "@/hooks/useCampaigns";

interface DraggableCampaignCardProps {
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

export function DraggableCampaignCard(props: DraggableCampaignCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: props.campaign.id,
    data: {
      campaign: props.campaign,
      currentStatus: props.campaign.status
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
    touchAction: "none"
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <CampaignCard {...props} />
    </div>
  );
}
