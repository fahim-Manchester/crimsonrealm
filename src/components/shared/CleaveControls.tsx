import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sparkles, Scissors, Plus, ChevronDown, Loader2, Dices } from "lucide-react";

interface CleaveControlsProps {
  onCleaveAI: (numGroups?: number, luckyMode?: boolean) => void;
  onCreateManualGroup: (name: string) => void;
  onDismantleAll: () => void;
  hasGroups: boolean;
  cleaving: boolean;
  loading: boolean;
  entryCount: number;
}

export function CleaveControls({
  onCleaveAI,
  onCreateManualGroup,
  onDismantleAll,
  hasGroups,
  cleaving,
  loading,
  entryCount,
}: CleaveControlsProps) {
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [cleaveDialogOpen, setCleaveDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [numGroups, setNumGroups] = useState("");

  const handleCreateGroup = () => {
    if (groupName.trim()) {
      onCreateManualGroup(groupName.trim());
      setGroupName("");
      setManualDialogOpen(false);
    }
  };

  const handleCleave = () => {
    const num = numGroups ? parseInt(numGroups, 10) : undefined;
    onCleaveAI(num, false);
    setCleaveDialogOpen(false);
    setNumGroups("");
  };

  const handleLucky = () => {
    onCleaveAI(undefined, true);
    setCleaveDialogOpen(false);
  };

  const isDisabled = cleaving || loading;

  return (
    <div className="flex items-center gap-2">
      {/* Cleave Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="border-primary/30 hover:border-primary/50"
            disabled={isDisabled || entryCount < 2}
          >
            {cleaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Cleave
            <ChevronDown className="h-3 w-3 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setCleaveDialogOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            AI Cleave...
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLucky}>
            <Dices className="h-4 w-4 mr-2" />
            I Feel Lucky
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setManualDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Empty Group
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dismantle Button */}
      {hasGroups && (
        <Button
          variant="outline"
          className="border-destructive/30 hover:border-destructive/50 text-destructive hover:text-destructive"
          onClick={onDismantleAll}
          disabled={isDisabled}
        >
          <Scissors className="h-4 w-4 mr-2" />
          Dismantle All
        </Button>
      )}

      {/* AI Cleave Dialog */}
      <Dialog open={cleaveDialogOpen} onOpenChange={setCleaveDialogOpen}>
        <DialogContent className="gothic-card border-border/50 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-lg">AI Cleave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="font-crimson text-sm text-muted-foreground">
                Number of groups (leave empty for AI to decide)
              </Label>
              <Input
                type="number"
                min={2}
                max={10}
                value={numGroups}
                onChange={(e) => setNumGroups(e.target.value)}
                placeholder="2-10"
                className="bg-background/50 border-border/50"
              />
            </div>
            <p className="font-crimson text-xs text-muted-foreground">
              The AI will analyze {entryCount} entries and group them by theme, purpose, or pattern.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setCleaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCleave} className="gothic-button-primary">
                <Sparkles className="h-4 w-4 mr-2" />
                Cleave
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Group Dialog */}
      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent className="gothic-card border-border/50 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-lg">Create Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="font-crimson text-sm">Group Name</Label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name..."
                className="bg-background/50 border-border/50"
                onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setManualDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateGroup} className="gothic-button-primary">
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
