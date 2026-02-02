import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCleaveDismantle } from "@/hooks/useCleaveDismantle";
import PageLayout from "@/components/layout/PageLayout";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import GroupedDataTable from "@/components/shared/GroupedDataTable";
import { CleaveControls } from "@/components/shared/CleaveControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  project_id: string | null;
  group_id: string | null;
  due_date: string | null;
  time_logged: number | null;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  medium: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  high: "bg-red-500/20 text-red-400 border-red-500/30",
};

const Tasks = () => {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterProject, setFilterProject] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "pending",
    priority: "medium",
    project_id: "",
    due_date: "",
    time_logged: 0,
  });

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      toast.error("Failed to fetch tasks");
    } else {
      setTasks(data || []);
    }
  }, []);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name")
      .order("name");
    
    if (!error) {
      setProjects(data || []);
    }
  };

  const {
    groups,
    cleaving,
    loading: groupsLoading,
    fetchGroups,
    cleaveWithAI,
    createManualGroup,
    dismantleGroup,
    dismantleAllGroups,
    moveEntryToGroup,
    renameGroup,
  } = useCleaveDismantle<Task>("tasks", user?.id, fetchTasks);

  useEffect(() => {
    if (user) {
      Promise.all([fetchTasks(), fetchProjects(), fetchGroups()]).finally(() => setLoading(false));
    }
  }, [user, fetchTasks, fetchGroups]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    const taskData = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      status: formData.status,
      priority: formData.priority,
      project_id: formData.project_id === "none" ? null : formData.project_id || null,
      due_date: formData.due_date || null,
      time_logged: formData.time_logged || 0,
      user_id: user!.id,
    };

    if (editingTask) {
      const { error } = await supabase
        .from("tasks")
        .update(taskData)
        .eq("id", editingTask.id);
      
      if (error) {
        toast.error("Failed to update task");
      } else {
        toast.success("Task forged anew");
        fetchTasks();
      }
    } else {
      const { error } = await supabase.from("tasks").insert(taskData);
      
      if (error) {
        toast.error("Failed to create task");
      } else {
        toast.success("New task forged");
        fetchTasks();
      }
    }

    resetForm();
    setDialogOpen(false);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      status: task.status || "pending",
      priority: task.priority || "medium",
      project_id: task.project_id || "",
      due_date: task.due_date ? task.due_date.split("T")[0] : "",
      time_logged: task.time_logged || 0,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (task: Task) => {
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    
    if (error) {
      toast.error("Failed to delete task");
    } else {
      toast.success("Task cast into the abyss");
      fetchTasks();
    }
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", status: "pending", priority: "medium", project_id: "", due_date: "", time_logged: 0 });
    setEditingTask(null);
  };

  const filteredTasks = filterProject === "all" 
    ? tasks 
    : tasks.filter(t => t.project_id === filterProject);

  const formatTime = (minutes: number) => {
    if (!minutes) return "—";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const columns = [
    { key: "title" as keyof Task, label: "Task" },
    { 
      key: "status" as keyof Task, 
      label: "Status",
      render: (task: Task) => (
        <Badge className={statusColors[task.status || "pending"]}>
          {(task.status || "pending").replace("_", " ")}
        </Badge>
      )
    },
    { 
      key: "priority" as keyof Task, 
      label: "Priority",
      render: (task: Task) => (
        <Badge className={priorityColors[task.priority || "medium"]}>
          {task.priority || "medium"}
        </Badge>
      )
    },
    {
      key: "project" as string,
      label: "Territory",
      render: (task: Task) => {
        const project = projects.find(p => p.id === task.project_id);
        return project?.name || "—";
      }
    },
    {
      key: "time_logged" as keyof Task,
      label: "Time",
      render: (task: Task) => formatTime(task.time_logged || 0)
    },
    {
      key: "due_date" as keyof Task,
      label: "Due",
      render: (task: Task) => task.due_date 
        ? new Date(task.due_date).toLocaleDateString()
        : "—"
    },
  ];

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <PageLayout title="The Forge" subtitle="Tasks to be hammered into completion">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="w-48 bg-background/50 border-border/50">
                  <SelectValue placeholder="All Territories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Territories</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <CleaveControls
              onCleaveAI={(numGroups, luckyMode) => cleaveWithAI(filteredTasks, numGroups, luckyMode)}
              onCreateManualGroup={createManualGroup}
              onDismantleAll={dismantleAllGroups}
              hasGroups={groups.length > 0}
              cleaving={cleaving}
              loading={groupsLoading}
              entryCount={filteredTasks.length}
            />
          </div>

          {/* Add Button */}
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gothic-button-primary">
                <Plus className="h-4 w-4 mr-2" />
                Forge Task
              </Button>
            </DialogTrigger>
            <DialogContent className="gothic-card border-border/50 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-cinzel text-xl tracking-wide">
                  {editingTask ? "Reforge Task" : "Forge New Task"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="font-cinzel text-sm">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="bg-background/50 border-border/50"
                    placeholder="Name this task..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="font-cinzel text-sm">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-background/50 border-border/50"
                    placeholder="Describe the work..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status" className="font-cinzel text-sm">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger className="bg-background/50 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority" className="font-cinzel text-sm">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger className="bg-background/50 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project" className="font-cinzel text-sm">Territory</Label>
                  <Select
                    value={formData.project_id}
                    onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                  >
                    <SelectTrigger className="bg-background/50 border-border/50">
                      <SelectValue placeholder="Select territory..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="due_date" className="font-cinzel text-sm">Due Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="bg-background/50 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time_logged" className="font-cinzel text-sm">Time (min)</Label>
                    <Input
                      id="time_logged"
                      type="number"
                      min={0}
                      value={formData.time_logged}
                      onChange={(e) => setFormData({ ...formData, time_logged: parseInt(e.target.value) || 0 })}
                      className="bg-background/50 border-border/50"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="gothic-button-primary">
                    {editingTask ? "Reforge" : "Forge"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <GroupedDataTable
          data={filteredTasks}
          columns={columns}
          groups={groups}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDismantleGroup={dismantleGroup}
          onMoveEntry={moveEntryToGroup}
          onRenameGroup={renameGroup}
          emptyMessage="No tasks forged yet. Create your first task."
        />
      </div>
    </PageLayout>
  );
};

export default Tasks;
