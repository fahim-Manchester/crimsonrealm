import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus } from "lucide-react";
import type { Task, Project } from "@/hooks/useCampaigns";

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
        .select("id, name, description, status")
        .eq("user_id", user.id)
        .neq("status", "completed")
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          const available = (data || []).filter(p => !existingProjectIds.includes(p.id));
          setProjects(available);
        });
    }
  }, [open, user, existingTaskIds, existingProjectIds]);

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

  const totalSelected = selectedTasks.length + selectedProjects.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-lg tracking-wide flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Add to Campaign
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="w-full bg-muted/50">
            <TabsTrigger value="tasks" className="flex-1 font-cinzel text-xs">
              Tasks ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="territories" className="flex-1 font-cinzel text-xs">
              Territories ({projects.length})
            </TabsTrigger>
          </TabsList>

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

        <div className="flex gap-3 pt-4 border-t border-border/30">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 gothic-button-secondary py-2"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={totalSelected === 0 || isAdding}
            className="flex-1 gothic-button-primary py-2"
          >
            {isAdding ? "Adding..." : `Add ${totalSelected} Item${totalSelected !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
