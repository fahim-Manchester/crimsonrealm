import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Sparkles, Map } from "lucide-react";
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

interface CampaignCreatorProps {
  tasks: Task[];
  projects: Project[];
  onCampaignCreated: (
    name: string,
    difficulty: string,
    plannedTime: number,
    taskIds: string[],
    projectIds: string[]
  ) => Promise<void>;
  onClose: () => void;
  onRefreshData?: () => void;
}

export function CampaignCreator({ tasks, projects, onCampaignCreated, onClose, onRefreshData }: CampaignCreatorProps) {
  const { user } = useAuth();
  const [campaignName, setCampaignName] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [plannedHours, setPlannedHours] = useState(1);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [isGuessingDifficulty, setIsGuessingDifficulty] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Quick-add local tasks/projects (created during campaign creation)
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  
  // Quick add form states
  const [questTitle, setQuestTitle] = useState("");
  const [questDescription, setQuestDescription] = useState("");
  const [territoryName, setTerritoryName] = useState("");
  const [territoryDescription, setTerritoryDescription] = useState("");
  const [isCreatingQuest, setIsCreatingQuest] = useState(false);
  const [isCreatingTerritory, setIsCreatingTerritory] = useState(false);

  // Combined tasks and projects (existing + local)
  const allTasks = [...tasks, ...localTasks];
  const allProjects = [...projects, ...localProjects];

  const toggleTask = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleCreateQuickTask = async () => {
    if (!user) return;

    const validation = popupQuestSchema.safeParse({
      title: questTitle,
      description: questDescription
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    // Check for duplicate name in existing tasks
    const existingTask = allTasks.find(
      t => t.title.toLowerCase() === validation.data.title.toLowerCase()
    );
    let finalTitle = validation.data.title;
    if (existingTask) {
      let counter = 1;
      while (allTasks.find(t => t.title.toLowerCase() === `${validation.data.title} #${counter}`.toLowerCase())) {
        counter++;
      }
      finalTitle = `${validation.data.title} #${counter}`;
    }

    setIsCreatingQuest(true);
    try {
      const { data: newTask, error } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          title: finalTitle,
          description: validation.data.description || null,
          status: "pending",
          priority: "medium"
        })
        .select("id, title, description, status, priority, time_logged")
        .single();

      if (error) throw error;

      // Add to local tasks and auto-select
      setLocalTasks(prev => [...prev, newTask]);
      setSelectedTasks(prev => [...prev, newTask.id]);
      
      toast.success("⚡ Quick task added!");
      setQuestTitle("");
      setQuestDescription("");
      
      if (onRefreshData) onRefreshData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create quick task");
    } finally {
      setIsCreatingQuest(false);
    }
  };

  const handleCreateQuickTerritory = async () => {
    if (!user) return;

    const validation = hiddenTerritorySchema.safeParse({
      name: territoryName,
      description: territoryDescription
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    // Check for duplicate name in existing projects
    const existingProject = allProjects.find(
      p => p.name.toLowerCase() === validation.data.name.toLowerCase()
    );
    let finalName = validation.data.name;
    if (existingProject) {
      let counter = 1;
      while (allProjects.find(p => p.name.toLowerCase() === `${validation.data.name} #${counter}`.toLowerCase())) {
        counter++;
      }
      finalName = `${validation.data.name} #${counter}`;
    }

    setIsCreatingTerritory(true);
    try {
      const { data: newProject, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: finalName,
          description: validation.data.description || null,
          status: "active"
        })
        .select("id, name, description, status, time_spent")
        .single();

      if (error) throw error;

      // Add to local projects and auto-select
      setLocalProjects(prev => [...prev, newProject]);
      setSelectedProjects(prev => [...prev, newProject.id]);
      
      toast.success("🗺️ Quick territory added!");
      setTerritoryName("");
      setTerritoryDescription("");
      
      if (onRefreshData) onRefreshData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create quick territory");
    } finally {
      setIsCreatingTerritory(false);
    }
  };

  const generateCampaignName = async () => {
    if (selectedTasks.length === 0 && selectedProjects.length === 0) {
      toast.error("Select some tasks or territories first");
      return;
    }

    setIsGeneratingName(true);
    try {
      const selectedTaskNames = allTasks
        .filter(t => selectedTasks.includes(t.id))
        .map(t => t.title);
      const selectedProjectNames = allProjects
        .filter(p => selectedProjects.includes(p.id))
        .map(p => p.name);

      const { data, error } = await supabase.functions.invoke("campaign-ai", {
        body: {
          action: "generate_name",
          tasks: selectedTaskNames,
          projects: selectedProjectNames
        }
      });

      if (error) throw error;
      if (data?.name) {
        setCampaignName(data.name);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate name. Try again or enter manually.");
    } finally {
      setIsGeneratingName(false);
    }
  };

  const guessDifficulty = async () => {
    if (selectedTasks.length === 0 && selectedProjects.length === 0) {
      toast.error("Select some tasks or territories first");
      return;
    }

    setIsGuessingDifficulty(true);
    try {
      const selectedTaskData = allTasks.filter(t => selectedTasks.includes(t.id));
      const selectedProjectData = allProjects.filter(p => selectedProjects.includes(p.id));

      const { data, error } = await supabase.functions.invoke("campaign-ai", {
        body: {
          action: "guess_difficulty",
          tasks: selectedTaskData,
          projects: selectedProjectData
        }
      });

      if (error) throw error;
      if (data?.difficulty) {
        setDifficulty(data.difficulty);
        if (data.planned_hours) {
          setPlannedHours(data.planned_hours);
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

    if (selectedTasks.length === 0 && selectedProjects.length === 0) {
      toast.error("Select at least one task or territory");
      return;
    }

    setIsCreating(true);
    try {
      await onCampaignCreated(
        campaignName,
        difficulty,
        plannedHours * 60, // Convert to minutes
        selectedTasks,
        selectedProjects
      );
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Campaign Name */}
      <div className="space-y-2">
        <Label className="font-cinzel text-sm tracking-wide">Campaign Name</Label>
        <div className="flex gap-2">
          <Input
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
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
          <Select value={difficulty} onValueChange={setDifficulty}>
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
          onChange={(e) => setPlannedHours(parseFloat(e.target.value) || 1)}
          className="gothic-input"
        />
      </div>

      {/* Selection Tabs */}
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="w-full bg-muted/50 grid grid-cols-3">
          <TabsTrigger value="tasks" className="font-cinzel text-xs">
            Tasks ({selectedTasks.length})
          </TabsTrigger>
          <TabsTrigger value="territories" className="font-cinzel text-xs">
            Territories ({selectedProjects.length})
          </TabsTrigger>
          <TabsTrigger value="quick" className="font-cinzel text-xs">
            ⚡ Quick Add
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4 max-h-48 overflow-y-auto space-y-2">
          {allTasks.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No uncompleted tasks in the Forge
            </p>
          ) : (
            allTasks.map(task => (
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
          {allProjects.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No unconquered territories
            </p>
          ) : (
            allProjects.map(project => (
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

        {/* Quick Add Tab */}
        <TabsContent value="quick" className="mt-4 space-y-4">
          {/* Quick Task */}
          <div className="p-3 rounded-sm border border-border/50 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-cinzel text-xs tracking-wide">Quick Task</span>
            </div>
            <Input
              value={questTitle}
              onChange={(e) => setQuestTitle(e.target.value)}
              placeholder="Task name..."
              className="gothic-input"
              maxLength={200}
            />
            <Textarea
              value={questDescription}
              onChange={(e) => setQuestDescription(e.target.value)}
              placeholder="Optional details..."
              className="gothic-input min-h-[50px] resize-none text-sm"
              maxLength={500}
            />
            <Button
              onClick={handleCreateQuickTask}
              disabled={!questTitle.trim() || isCreatingQuest}
              className="w-full gothic-button-primary"
              size="sm"
            >
              <Plus className="w-3 h-3 mr-1" />
              {isCreatingQuest ? "Adding..." : "Add Task"}
            </Button>
          </div>

          {/* Quick Territory */}
          <div className="p-3 rounded-sm border border-border/50 space-y-2">
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-accent" />
              <span className="font-cinzel text-xs tracking-wide">Quick Territory</span>
            </div>
            <Input
              value={territoryName}
              onChange={(e) => setTerritoryName(e.target.value)}
              placeholder="Territory name..."
              className="gothic-input"
              maxLength={200}
            />
            <Textarea
              value={territoryDescription}
              onChange={(e) => setTerritoryDescription(e.target.value)}
              placeholder="Optional details..."
              className="gothic-input min-h-[50px] resize-none text-sm"
              maxLength={500}
            />
            <Button
              onClick={handleCreateQuickTerritory}
              disabled={!territoryName.trim() || isCreatingTerritory}
              variant="outline"
              className="w-full border-accent/50 hover:bg-accent/10"
              size="sm"
            >
              <Plus className="w-3 h-3 mr-1" />
              {isCreatingTerritory ? "Adding..." : "Add Territory"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-border/30">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1 gothic-button-secondary py-2"
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          disabled={isCreating}
          className="flex-1 gothic-button-primary py-2"
        >
          {isCreating ? "Forging..." : "⚔️ Forge Campaign"}
        </Button>
      </div>
    </div>
  );
}
