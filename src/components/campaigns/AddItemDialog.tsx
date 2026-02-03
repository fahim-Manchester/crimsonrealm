import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Sparkles, Map } from "lucide-react";
import { toast } from "sonner";
import type { Task, Project } from "@/hooks/useCampaigns";
import { z } from "zod";

// Validation schemas
const popupQuestSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().trim().max(500, "Description must be less than 500 characters").optional()
});

const hiddenTerritorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name must be less than 200 characters"),
  description: z.string().trim().max(500, "Description must be less than 500 characters").optional()
});

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTaskIds: string[];
  existingProjectIds: string[];
  onAddTask: (taskId: string) => Promise<void>;
  onAddProject: (projectId: string) => Promise<void>;
}

export function AddItemDialog({
  open,
  onOpenChange,
  existingTaskIds,
  existingProjectIds,
  onAddTask,
  onAddProject
}: AddItemDialogProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  
  // Quick add states
  const [questTitle, setQuestTitle] = useState("");
  const [questDescription, setQuestDescription] = useState("");
  const [territoryName, setTerritoryName] = useState("");
  const [territoryDescription, setTerritoryDescription] = useState("");
  const [isCreatingQuest, setIsCreatingQuest] = useState(false);
  const [isCreatingTerritory, setIsCreatingTerritory] = useState(false);

  useEffect(() => {
    if (open && user) {
      // Fetch available tasks
      supabase
        .from("tasks")
        .select("id, title, description, status, priority, time_logged")
        .eq("user_id", user.id)
        .neq("status", "completed")
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          const available = (data || []).filter(t => !existingTaskIds.includes(t.id));
          setTasks(available);
        });

      // Fetch available projects
      supabase
        .from("projects")
        .select("id, name, description, status, time_spent")
        .eq("user_id", user.id)
        .neq("status", "completed")
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          const available = (data || []).filter(p => !existingProjectIds.includes(p.id));
          setProjects(available);
        });
    }
  }, [open, user, existingTaskIds, existingProjectIds]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setQuestTitle("");
      setQuestDescription("");
      setTerritoryName("");
      setTerritoryDescription("");
      setSelectedTasks([]);
      setSelectedProjects([]);
    }
  }, [open]);

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

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      for (const taskId of selectedTasks) {
        await onAddTask(taskId);
      }
      for (const projectId of selectedProjects) {
        await onAddProject(projectId);
      }
      setSelectedTasks([]);
      setSelectedProjects([]);
      onOpenChange(false);
    } finally {
      setIsAdding(false);
    }
  };

  const handleCreatePopupQuest = async () => {
    if (!user) return;

    const validation = popupQuestSchema.safeParse({
      title: questTitle,
      description: questDescription
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsCreatingQuest(true);
    try {
      // Create the task in database
      const { data: newTask, error } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          title: validation.data.title,
          description: validation.data.description || null,
          status: "pending",
          priority: "medium"
        })
        .select("id")
        .single();

      if (error) throw error;

      // Add to campaign
      await onAddTask(newTask.id);
      
      toast.success("⚡ Pop-up Quest added!");
      setQuestTitle("");
      setQuestDescription("");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create pop-up quest");
    } finally {
      setIsCreatingQuest(false);
    }
  };

  const handleCreateHiddenTerritory = async () => {
    if (!user) return;

    const validation = hiddenTerritorySchema.safeParse({
      name: territoryName,
      description: territoryDescription
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsCreatingTerritory(true);
    try {
      // Create the project in database
      const { data: newProject, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: validation.data.name,
          description: validation.data.description || null,
          status: "active"
        })
        .select("id")
        .single();

      if (error) throw error;

      // Add to campaign
      await onAddProject(newProject.id);
      
      toast.success("🗺️ Hidden Territory discovered!");
      setTerritoryName("");
      setTerritoryDescription("");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create hidden territory");
    } finally {
      setIsCreatingTerritory(false);
    }
  };

  const totalSelected = selectedTasks.length + selectedProjects.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-lg tracking-wide flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Add to Campaign
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="quick" className="w-full">
          <TabsList className="w-full bg-muted/50 grid grid-cols-3">
            <TabsTrigger value="quick" className="font-cinzel text-xs">
              ⚡ Quick Add
            </TabsTrigger>
            <TabsTrigger value="tasks" className="font-cinzel text-xs">
              Tasks ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="territories" className="font-cinzel text-xs">
              Territories ({projects.length})
            </TabsTrigger>
          </TabsList>

          {/* Quick Add Tab */}
          <TabsContent value="quick" className="mt-4 space-y-6">
            {/* Pop-up Quest */}
            <div className="gothic-card p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h4 className="font-cinzel text-sm tracking-wide">Pop-up Quest</h4>
              </div>
              <p className="text-xs text-muted-foreground font-crimson mb-3">
                Quick tasks for errands and spontaneous to-dos
              </p>
              <div className="space-y-2">
                <Input
                  value={questTitle}
                  onChange={(e) => setQuestTitle(e.target.value)}
                  placeholder="What needs doing?"
                  className="gothic-input"
                  maxLength={200}
                />
                <Textarea
                  value={questDescription}
                  onChange={(e) => setQuestDescription(e.target.value)}
                  placeholder="Optional details..."
                  className="gothic-input min-h-[60px] resize-none"
                  maxLength={500}
                />
                <Button
                  onClick={handleCreatePopupQuest}
                  disabled={!questTitle.trim() || isCreatingQuest}
                  className="w-full gothic-button-primary"
                  size="sm"
                >
                  {isCreatingQuest ? "Creating..." : "⚡ Add Pop-up Quest"}
                </Button>
              </div>
            </div>

            {/* Hidden Territory */}
            <div className="gothic-card p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Map className="w-4 h-4 text-accent" />
                <h4 className="font-cinzel text-sm tracking-wide">Hidden Territory</h4>
              </div>
              <p className="text-xs text-muted-foreground font-crimson mb-3">
                Mini-projects that emerge during your quest
              </p>
              <div className="space-y-2">
                <Input
                  value={territoryName}
                  onChange={(e) => setTerritoryName(e.target.value)}
                  placeholder="Name this territory..."
                  className="gothic-input"
                  maxLength={200}
                />
                <Textarea
                  value={territoryDescription}
                  onChange={(e) => setTerritoryDescription(e.target.value)}
                  placeholder="Optional details..."
                  className="gothic-input min-h-[60px] resize-none"
                  maxLength={500}
                />
                <Button
                  onClick={handleCreateHiddenTerritory}
                  disabled={!territoryName.trim() || isCreatingTerritory}
                  className="w-full border-accent/50 hover:bg-accent/10"
                  variant="outline"
                  size="sm"
                >
                  {isCreatingTerritory ? "Discovering..." : "🗺️ Discover Hidden Territory"}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Existing Tasks Tab */}
          <TabsContent value="tasks" className="mt-4 max-h-64 overflow-y-auto space-y-2">
            {tasks.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                No more tasks available
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
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Existing Territories Tab */}
          <TabsContent value="territories" className="mt-4 max-h-64 overflow-y-auto space-y-2">
            {projects.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                No more territories available
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
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Add Selected Button - only show for tasks/territories tabs */}
        {totalSelected > 0 && (
          <div className="flex gap-3 pt-4 border-t border-border/30">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedTasks([]);
                setSelectedProjects([]);
              }}
              className="flex-1 gothic-button-secondary py-2"
            >
              Clear Selection
            </Button>
            <Button
              onClick={handleAdd}
              disabled={isAdding}
              className="flex-1 gothic-button-primary py-2"
            >
              {isAdding ? "Adding..." : `Add ${totalSelected} Item${totalSelected !== 1 ? 's' : ''}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
