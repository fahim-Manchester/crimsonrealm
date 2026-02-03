import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Campaign } from "@/hooks/useCampaigns";

interface EditCampaignDialogProps {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (campaignId: string, updates: { name?: string; planned_time?: number; difficulty?: string }) => Promise<void>;
}

const difficultyOptions = [
  { value: "trivial", label: "🌿 Trivial" },
  { value: "easy", label: "🌙 Easy" },
  { value: "medium", label: "⚔️ Medium" },
  { value: "hard", label: "🔥 Hard" },
  { value: "legendary", label: "💀 Legendary" }
];

export function EditCampaignDialog({ campaign, open, onOpenChange, onSave }: EditCampaignDialogProps) {
  const [name, setName] = useState("");
  const [plannedHours, setPlannedHours] = useState(0);
  const [plannedMinutes, setPlannedMinutes] = useState(0);
  const [difficulty, setDifficulty] = useState("medium");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (campaign) {
      setName(campaign.name);
      const totalMinutes = campaign.planned_time || 0;
      setPlannedHours(Math.floor(totalMinutes / 60));
      setPlannedMinutes(totalMinutes % 60);
      setDifficulty(campaign.difficulty || "medium");
    }
  }, [campaign]);

  const handleSave = async () => {
    if (!campaign) return;
    
    setSaving(true);
    const plannedTime = (plannedHours * 60) + plannedMinutes;
    await onSave(campaign.id, {
      name: name.trim() || campaign.name,
      planned_time: plannedTime,
      difficulty
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-lg tracking-wide">
            Edit Campaign
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-name" className="font-crimson text-sm">
              Campaign Name
            </Label>
            <Input
              id="campaign-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background border-border"
              placeholder="Enter campaign name"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-crimson text-sm">Planned Time</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  min={0}
                  max={99}
                  value={plannedHours}
                  onChange={(e) => setPlannedHours(Math.max(0, parseInt(e.target.value) || 0))}
                  className="bg-background border-border"
                />
                <span className="text-xs text-muted-foreground mt-1 block">Hours</span>
              </div>
              <div className="flex-1">
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={plannedMinutes}
                  onChange={(e) => setPlannedMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="bg-background border-border"
                />
                <span className="text-xs text-muted-foreground mt-1 block">Minutes</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-crimson text-sm">Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {difficultyOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="font-crimson"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gothic-button-primary"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
