import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageLayout from "@/components/layout/PageLayout";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import DataTable from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  paused: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  archived: "bg-muted text-muted-foreground border-border",
};

const Projects = () => {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active",
  });

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      toast.error("Failed to fetch projects");
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    const projectData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      status: formData.status,
      user_id: user!.id,
    };

    if (editingProject) {
      const { error } = await supabase
        .from("projects")
        .update(projectData)
        .eq("id", editingProject.id);
      
      if (error) {
        toast.error("Failed to update project");
      } else {
        toast.success("Territory updated");
        fetchProjects();
      }
    } else {
      const { error } = await supabase.from("projects").insert(projectData);
      
      if (error) {
        toast.error("Failed to create project");
      } else {
        toast.success("New territory claimed");
        fetchProjects();
      }
    }

    resetForm();
    setDialogOpen(false);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || "",
      status: project.status || "active",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (project: Project) => {
    const { error } = await supabase.from("projects").delete().eq("id", project.id);
    
    if (error) {
      toast.error("Failed to delete project");
    } else {
      toast.success("Territory abandoned");
      fetchProjects();
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", status: "active" });
    setEditingProject(null);
  };

  const columns = [
    { key: "name" as keyof Project, label: "Name" },
    { key: "description" as keyof Project, label: "Description" },
    { 
      key: "status" as keyof Project, 
      label: "Status",
      render: (project: Project) => (
        <Badge className={statusColors[project.status || "active"]}>
          {project.status || "active"}
        </Badge>
      )
    },
  ];

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <PageLayout title="Territories" subtitle="The projects you've claimed in your conquest">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gothic-button-primary">
                <Plus className="h-4 w-4 mr-2" />
                Claim Territory
              </Button>
            </DialogTrigger>
            <DialogContent className="gothic-card border-border/50 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-cinzel text-xl tracking-wide">
                  {editingProject ? "Edit Territory" : "Claim New Territory"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-cinzel text-sm">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-background/50 border-border/50"
                    placeholder="Name this territory..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="font-cinzel text-sm">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-background/50 border-border/50"
                    placeholder="Describe its purpose..."
                  />
                </div>
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
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="gothic-button-primary">
                    {editingProject ? "Update" : "Claim"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <DataTable
          data={projects}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage="No territories claimed. Stake your first claim."
        />
      </div>
    </PageLayout>
  );
};

export default Projects;
