import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { Plus, Zap, Moon, X, Trash2, Loader2 } from "lucide-react";
import { z } from "zod";
import type { Task, Project } from "@/hooks/useCampaigns";

// Validation schemas
const popupQuestSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().trim().max(500, "Description must be less than 500 characters").optional()
});

const hiddenTerritorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name must be less than 200 characters"),
  description: z.string().trim().max(500, "Description must be less than 500 characters").optional()
});

// Temporary item types for Quick Add
export interface TemporaryItem {
  id: string; // local UUID for tracking
  type: "popup_quest" | "hidden_territory";
  name: string;
  description: string | null;
}

// Draft state structure for localStorage persistence
interface CampaignDraft {
  campaignName: string;
  difficulty: string;
  plannedHours: number;
  selectedTasks: string[];
  selectedProjects: string[];
  temporaryItems: TemporaryItem[];
  questTitle: string;
  questDescription: string;
  territoryName: string;
  territoryDescription: string;
  activeTab: string;
}

const DEFAULT_DRAFT: CampaignDraft = {
  campaignName: "",
  difficulty: "medium",
  plannedHours: 1,
  selectedTasks: [],
  selectedProjects: [],
  temporaryItems: [],
  questTitle: "",
  questDescription: "",
  territoryName: "",
  territoryDescription: "",
  activeTab: "tasks"
};

interface CampaignCreatorProps {
  tasks: Task[];
  projects: Project[];
  onCampaignCreated: (
    name: string,
    difficulty: string,
    plannedTime: number,
    taskIds: string[],
    projectIds: string[],
    temporaryItems: TemporaryItem[]
  ) => Promise<void>;
  onClose: () => void;
  onRefreshData?: () => void;
}

/**
 * WRAPPER COMPONENT: Handles auth loading state to ensure we never
 * initialize the inner form with a "pending" storage key.
 * 
 * This prevents the race condition where:
 * 1. Auth is loading → storage key = "pending"
 * 2. Empty draft gets persisted to pending key
 * 3. Auth resolves → key changes to userId
 * 4. Real draft appears "lost"
 */
export function CampaignCreator({ tasks, projects, onCampaignCreated, onClose, onRefreshData }: CampaignCreatorProps) {
  const { user, loading: authLoading } = useAuth();
  
  // Show loading state while auth is resolving
  // CRITICAL: Don't mount the form until we have a stable userId
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 font-crimson text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="font-crimson text-muted-foreground">Please sign in to create campaigns</span>
      </div>
    );
  }

  // Only render the form once we have a stable userId
  return (
    <CampaignCreatorForm
      userId={user.id}
      tasks={tasks}
      projects={projects}
      onCampaignCreated={onCampaignCreated}
      onClose={onClose}
    />
  );
}

interface CampaignCreatorFormProps {
  userId: string;
  tasks: Task[];
  projects: Project[];
  onCampaignCreated: (
    name: string,
    difficulty: string,
    plannedTime: number,
    taskIds: string[],
    projectIds: string[],
    temporaryItems: TemporaryItem[]
  ) => Promise<void>;
  onClose: () => void;
}

/**
 * INNER FORM COMPONENT: Receives a stable userId and uses it for the storage key.
 * This guarantees we never use a "pending" key for authenticated users.
 */
function CampaignCreatorForm({ userId, tasks, projects, onCampaignCreated, onClose }: CampaignCreatorFormProps) {
  // STABLE storage key - userId is guaranteed to be defined here
  const draftKey = `campaignCreatorDraft:${userId}`;
  
  // Use localStorage-backed state for draft persistence
  // Now returns persistNow as 5th value
  const [draft, setDraft, clearDraft, wasRestored, persistNow] = useLocalStorageState<CampaignDraft>(
    draftKey,
    DEFAULT_DRAFT
  );
  
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [isGuessingDifficulty, setIsGuessingDifficulty] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Track if we've shown the "draft restored" toast
  const hasShownRestoredToast = useRef(false);
  
  // Show "Draft restored" toast once when draft is loaded from storage
  useEffect(() => {
    if (wasRestored && !hasShownRestoredToast.current) {
      hasShownRestoredToast.current = true;
      toast.success("📜 Draft restored", {
        description: "Your previous campaign setup was saved",
        duration: 3000
      });
    }
  }, [wasRestored]);

  // Derived values from draft
  const { 
    campaignName, difficulty, plannedHours, 
    selectedTasks, selectedProjects, temporaryItems,
    questTitle, questDescription, territoryName, territoryDescription,
    activeTab
  } = draft;

  // Helper to update draft fields
  const updateDraft = useCallback(<K extends keyof CampaignDraft>(field: K, value: CampaignDraft[K]) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  }, [setDraft]);

  const popupQuests = temporaryItems.filter(i => i.type === "popup_quest");
  const hiddenTerritories = temporaryItems.filter(i => i.type === "hidden_territory");

  const toggleTask = (taskId: string) => {
    updateDraft('selectedTasks', 
      selectedTasks.includes(taskId)
        ? selectedTasks.filter(id => id !== taskId)
        : [...selectedTasks, taskId]
    );
  };

  const toggleProject = (projectId: string) => {
    updateDraft('selectedProjects',
      selectedProjects.includes(projectId)
        ? selectedProjects.filter(id => id !== projectId)
        : [...selectedProjects, projectId]
    );
  };

  const handleAddPopupQuest = () => {
    const validation = popupQuestSchema.safeParse({
      title: questTitle,
      description: questDescription
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    const newItem: TemporaryItem = {
      id: crypto.randomUUID(),
      type: "popup_quest",
      name: validation.data.title,
      description: validation.data.description || null
    };

    setDraft(prev => ({
      ...prev,
      temporaryItems: [...prev.temporaryItems, newItem],
      questTitle: "",
      questDescription: ""
    }));
    
    // CRITICAL: Persist immediately after adding - survives instant tab switch
    // Use setTimeout(0) to ensure the ref is updated after setDraft
    setTimeout(() => persistNow(), 0);
    
    toast.success("⚡ Pop-up Quest added!");
  };

  const handleAddHiddenTerritory = () => {
    const validation = hiddenTerritorySchema.safeParse({
      name: territoryName,
      description: territoryDescription
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    const newItem: TemporaryItem = {
      id: crypto.randomUUID(),
      type: "hidden_territory",
      name: validation.data.name,
      description: validation.data.description || null
    };

    setDraft(prev => ({
      ...prev,
      temporaryItems: [...prev.temporaryItems, newItem],
      territoryName: "",
      territoryDescription: ""
    }));
    
    // CRITICAL: Persist immediately after adding - survives instant tab switch
    setTimeout(() => persistNow(), 0);
    
    toast.success("🌙 Hidden Territory added!");
  };

  const removeTemporaryItem = (id: string) => {
    setDraft(prev => ({
      ...prev,
      temporaryItems: prev.temporaryItems.filter(i => i.id !== id)
    }));
    
    // CRITICAL: Persist immediately after removing
    setTimeout(() => persistNow(), 0);
  };

  const handleClearDraft = () => {
    clearDraft();
    toast.success("Draft cleared");
  };

  const generateCampaignName = async () => {
    if (selectedTasks.length === 0 && selectedProjects.length === 0 && temporaryItems.length === 0) {
      toast.error("Select some tasks, territories, or add quick items first");
      return;
    }

    setIsGeneratingName(true);
    try {
      const selectedTaskNames = tasks
        .filter(t => selectedTasks.includes(t.id))
        .map(t => t.title);
      const selectedProjectNames = projects
        .filter(p => selectedProjects.includes(p.id))
        .map(p => p.name);
      const tempItemNames = temporaryItems.map(i => i.name);

      const { data, error } = await supabase.functions.invoke("campaign-ai", {
        body: {
          action: "generate_name",
          tasks: [...selectedTaskNames, ...tempItemNames.filter((_, i) => temporaryItems[i].type === "popup_quest")],
          projects: [...selectedProjectNames, ...tempItemNames.filter((_, i) => temporaryItems[i].type === "hidden_territory")]
        }
      });

      if (error) throw error;
      if (data?.code === "DAILY_LIMIT_EXCEEDED") {
        toast.error(data.error || "Daily AI limit reached. Resets at midnight UTC.");
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      if (data?.name) {
        updateDraft('campaignName', data.name);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate name. Try again or enter manually.");
    } finally {
      setIsGeneratingName(false);
    }
  };

  const guessDifficulty = async () => {
    if (selectedTasks.length === 0 && selectedProjects.length === 0 && temporaryItems.length === 0) {
      toast.error("Select some tasks, territories, or add quick items first");
      return;
    }

    setIsGuessingDifficulty(true);
    try {
      const selectedTaskData = tasks.filter(t => selectedTasks.includes(t.id));
      const selectedProjectData = projects.filter(p => selectedProjects.includes(p.id));

      const { data, error } = await supabase.functions.invoke("campaign-ai", {
        body: {
          action: "guess_difficulty",
          tasks: selectedTaskData,
          projects: selectedProjectData,
          temporaryItems: temporaryItems
        }
      });

      if (error) throw error;
      if (data?.code === "DAILY_LIMIT_EXCEEDED") {
        toast.error(data.error || "Daily AI limit reached. Resets at midnight UTC.");
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      if (data?.difficulty) {
        updateDraft('difficulty', data.difficulty);
        if (data.planned_hours) {
          updateDraft('plannedHours', data.planned_hours);
        }
        toast.success(`AI suggests: ${data.difficulty} difficulty`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to guess difficulty. Set it manually.");
    } finally {
      setIsGuessingDifficulty(false);
    }
  };

  const handleCreate = async () => {
    if (!campaignName.trim()) {
      toast.error("Enter a campaign name");
      return;
    }

    if (selectedTasks.length === 0 && selectedProjects.length === 0 && temporaryItems.length === 0) {
      toast.error("Select at least one task, territory, or add a quick item");
      return;
    }

    setIsCreating(true);
    try {
      await onCampaignCreated(
        campaignName,
        difficulty,
        plannedHours * 60, // Convert to minutes
        selectedTasks,
        selectedProjects,
        temporaryItems
      );
      // Clear draft on successful creation
      clearDraft();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const totalItemCount = selectedTasks.length + selectedProjects.length + temporaryItems.length;

  return (
    <ScrollArea className="max-h-[70vh] pr-4">
      <div className="space-y-6 pb-2">
      {/* Campaign Name */}
      <div className="space-y-2">
        <Label className="font-cinzel text-sm tracking-wide">Campaign Name</Label>
        <div className="flex gap-2">
          <Input
            value={campaignName}
            onChange={(e) => updateDraft('campaignName', e.target.value)}
            placeholder="Name your campaign..."
            className="gothic-input flex-1"
          />
          <Button
            variant="outline"
            onClick={generateCampaignName}
            disabled={isGeneratingName}
            className="border-primary/50 hover:bg-primary/10"
          >
            {isGeneratingName ? (
              <span className="animate-pulse">⚔️</span>
            ) : (
              "✨ AI Name"
            )}
          </Button>
        </div>
      </div>

      {/* Difficulty */}
      <div className="space-y-2">
        <Label className="font-cinzel text-sm tracking-wide">Difficulty</Label>
        <div className="flex gap-2">
          <Select value={difficulty} onValueChange={(val) => updateDraft('difficulty', val)}>
            <SelectTrigger className="gothic-input flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trivial">🌿 Trivial</SelectItem>
              <SelectItem value="easy">🌙 Easy</SelectItem>
              <SelectItem value="medium">⚔️ Medium</SelectItem>
              <SelectItem value="hard">🔥 Hard</SelectItem>
              <SelectItem value="legendary">💀 Legendary</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={guessDifficulty}
            disabled={isGuessingDifficulty}
            className="border-primary/50 hover:bg-primary/10"
          >
            {isGuessingDifficulty ? (
              <span className="animate-pulse">🎲</span>
            ) : (
              "🎲 AI Guess"
            )}
          </Button>
        </div>
      </div>

      {/* Planned Time */}
      <div className="space-y-2">
        <Label className="font-cinzel text-sm tracking-wide">Planned Time (hours)</Label>
        <Input
          type="number"
          min={0.5}
          step={0.5}
          value={plannedHours}
          onChange={(e) => updateDraft('plannedHours', parseFloat(e.target.value) || 1)}
          className="gothic-input"
        />
      </div>

      {/* Selection Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => updateDraft('activeTab', val)} className="w-full">
        <TabsList className="w-full bg-muted/50 grid grid-cols-3">
          <TabsTrigger value="tasks" className="font-cinzel text-xs">
            Tasks ({selectedTasks.length})
          </TabsTrigger>
          <TabsTrigger value="territories" className="font-cinzel text-xs">
            Territories ({selectedProjects.length})
          </TabsTrigger>
          <TabsTrigger value="quick" className="font-cinzel text-xs flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Quick Add ({temporaryItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4 max-h-48 overflow-y-auto space-y-2">
          {tasks.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No uncompleted tasks in the Forge
            </p>
          ) : (
            tasks.map(task => (
              <div
                key={task.id}
                className={`flex items-center gap-3 p-3 rounded-sm border transition-colors cursor-pointer ${
                  selectedTasks.includes(task.id)
                    ? "border-primary bg-primary/10"
                    : "border-border/50 hover:border-border"
                }`}
                onClick={() => toggleTask(task.id)}
              >
                <Checkbox
                  checked={selectedTasks.includes(task.id)}
                  onCheckedChange={() => toggleTask(task.id)}
                />
                <div className="flex-1">
                  <p className="font-crimson text-sm">{task.title}</p>
                  {task.priority && (
                    <span className={`text-xs ${
                      task.priority === 'high' ? 'text-destructive' :
                      task.priority === 'medium' ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {task.priority} priority
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="territories" className="mt-4 max-h-48 overflow-y-auto space-y-2">
          {projects.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No unconquered territories
            </p>
          ) : (
            projects.map(project => (
              <div
                key={project.id}
                className={`flex items-center gap-3 p-3 rounded-sm border transition-colors cursor-pointer ${
                  selectedProjects.includes(project.id)
                    ? "border-primary bg-primary/10"
                    : "border-border/50 hover:border-border"
                }`}
                onClick={() => toggleProject(project.id)}
              >
                <Checkbox
                  checked={selectedProjects.includes(project.id)}
                  onCheckedChange={() => toggleProject(project.id)}
                />
                <div className="flex-1">
                  <p className="font-crimson text-sm">{project.name}</p>
                  {project.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {project.description}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* Quick Add Tab - Pop-up Quests & Hidden Territories */}
        <TabsContent value="quick" className="mt-4 space-y-4">
          {/* Pop-up Quest Section */}
          <div className="p-3 rounded-sm border border-amber-500/30 bg-amber-500/5 space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="font-cinzel text-xs tracking-wide text-amber-500">Pop-up Quest</span>
              <span className="text-xs text-muted-foreground">(temporary)</span>
            </div>
            <Input
              value={questTitle}
              onChange={(e) => updateDraft('questTitle', e.target.value)}
              placeholder="Task name..."
              className="gothic-input border-amber-500/30 focus:border-amber-500"
              maxLength={200}
            />
            <Textarea
              value={questDescription}
              onChange={(e) => updateDraft('questDescription', e.target.value)}
              placeholder="Optional details..."
              className="gothic-input min-h-[50px] resize-none text-sm border-amber-500/30 focus:border-amber-500"
              maxLength={500}
            />
            <Button
              onClick={handleAddPopupQuest}
              disabled={!questTitle.trim()}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              size="sm"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Task
            </Button>
          </div>

          {/* Hidden Territory Section */}
          <div className="p-3 rounded-sm border border-purple-500/30 bg-purple-500/5 space-y-2">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-purple-500" />
              <span className="font-cinzel text-xs tracking-wide text-purple-500">Hidden Territory</span>
              <span className="text-xs text-muted-foreground">(temporary)</span>
            </div>
            <Input
              value={territoryName}
              onChange={(e) => updateDraft('territoryName', e.target.value)}
              placeholder="Territory name..."
              className="gothic-input border-purple-500/30 focus:border-purple-500"
              maxLength={200}
            />
            <Textarea
              value={territoryDescription}
              onChange={(e) => updateDraft('territoryDescription', e.target.value)}
              placeholder="Optional details..."
              className="gothic-input min-h-[50px] resize-none text-sm border-purple-500/30 focus:border-purple-500"
              maxLength={500}
            />
            <Button
              onClick={handleAddHiddenTerritory}
              disabled={!territoryName.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              size="sm"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Territory
            </Button>
          </div>

          {/* Pending Items List */}
          {temporaryItems.length > 0 && (
            <div className="border-t border-border/30 pt-3 space-y-2">
              <span className="font-cinzel text-xs tracking-wide text-muted-foreground">
                Pending Items ({temporaryItems.length})
              </span>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {popupQuests.map(item => (
                  <div key={item.id} className="flex items-center gap-2 p-2 rounded-sm bg-amber-500/10 border border-amber-500/30">
                    <Zap className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    <span className="font-crimson text-xs flex-1 truncate">{item.name}</span>
                    <button
                      onClick={() => removeTemporaryItem(item.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {hiddenTerritories.map(item => (
                  <div key={item.id} className="flex items-center gap-2 p-2 rounded-sm bg-purple-500/10 border border-purple-500/30">
                    <Moon className="w-3 h-3 text-purple-500 flex-shrink-0" />
                    <span className="font-crimson text-xs flex-1 truncate">{item.name}</span>
                    <button
                      onClick={() => removeTemporaryItem(item.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-border/30">
        {/* Clear Draft button - only show if there's a draft */}
        {(campaignName || selectedTasks.length > 0 || selectedProjects.length > 0 || temporaryItems.length > 0) && (
          <Button
            variant="ghost"
            onClick={handleClearDraft}
            className="text-muted-foreground hover:text-destructive"
            size="icon"
            title="Clear draft"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1 gothic-button-secondary py-2"
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          disabled={isCreating || totalItemCount === 0}
          className="flex-1 gothic-button-primary py-2"
        >
          {isCreating ? "Forging..." : `⚔️ Forge Campaign (${totalItemCount})`}
        </Button>
      </div>
      </div>
    </ScrollArea>
  );
}
