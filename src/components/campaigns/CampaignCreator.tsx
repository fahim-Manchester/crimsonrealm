import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Task, Project } from "@/hooks/useCampaigns";

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
}

export function CampaignCreator({ tasks, projects, onCampaignCreated, onClose }: CampaignCreatorProps) {
  const [campaignName, setCampaignName] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [plannedHours, setPlannedHours] = useState(1);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [isGuessingDifficulty, setIsGuessingDifficulty] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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

  const generateCampaignName = async () => {
    if (selectedTasks.length === 0 && selectedProjects.length === 0) {
      toast.error("Select some tasks or territories first");
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
      const selectedTaskData = tasks.filter(t => selectedTasks.includes(t.id));
      const selectedProjectData = projects.filter(p => selectedProjects.includes(p.id));

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
        <TabsList className="w-full bg-muted/50">
          <TabsTrigger value="tasks" className="flex-1 font-cinzel text-xs">
            Forge Tasks ({selectedTasks.length})
          </TabsTrigger>
          <TabsTrigger value="territories" className="flex-1 font-cinzel text-xs">
            Territories ({selectedProjects.length})
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
