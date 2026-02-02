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
import { Plus, ExternalLink } from "lucide-react";

interface Resource {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  category: string | null;
  project_id: string | null;
  group_id: string | null;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
}

const Resources = () => {
  const { user, loading: authLoading } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    url: "",
    category: "",
    project_id: "",
  });

  const fetchResources = useCallback(async () => {
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      toast.error("Failed to fetch resources");
    } else {
      setResources(data || []);
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
  } = useCleaveDismantle<Resource>("resources", user?.id, fetchResources);

  useEffect(() => {
    if (user) {
      Promise.all([fetchResources(), fetchProjects(), fetchGroups()]).finally(() => setLoading(false));
    }
  }, [user, fetchResources, fetchGroups]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    const resourceData = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      url: formData.url.trim() || null,
      category: formData.category.trim() || null,
      project_id: formData.project_id === "none" ? null : formData.project_id || null,
      user_id: user!.id,
    };

    if (editingResource) {
      const { error } = await supabase
        .from("resources")
        .update(resourceData)
        .eq("id", editingResource.id);
      
      if (error) {
        toast.error("Failed to update resource");
      } else {
        toast.success("Resource updated");
        fetchResources();
      }
    } else {
      const { error } = await supabase.from("resources").insert(resourceData);
      
      if (error) {
        toast.error("Failed to create resource");
      } else {
        toast.success("Resource created");
        fetchResources();
      }
    }

    resetForm();
    setDialogOpen(false);
  };

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    setFormData({
      title: resource.title,
      description: resource.description || "",
      url: resource.url || "",
      category: resource.category || "",
      project_id: resource.project_id || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (resource: Resource) => {
    const { error } = await supabase.from("resources").delete().eq("id", resource.id);
    
    if (error) {
      toast.error("Failed to delete resource");
    } else {
      toast.success("Resource banished to the void");
      fetchResources();
    }
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", url: "", category: "", project_id: "" });
    setEditingResource(null);
  };

  const columns = [
    { key: "title" as keyof Resource, label: "Title" },
    { key: "category" as keyof Resource, label: "Category" },
    { 
      key: "url" as keyof Resource, 
      label: "Link",
      render: (resource: Resource) => resource.url ? (
        <a 
          href={resource.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 inline-flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" />
          View
        </a>
      ) : null
    },
    {
      key: "project" as string,
      label: "Project",
      render: (resource: Resource) => {
        const project = projects.find(p => p.id === resource.project_id);
        return project?.name || "—";
      }
    },
  ];

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <PageLayout title="Chronicles" subtitle="Your collection of sacred resources and ancient knowledge">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <CleaveControls
            onCleaveAI={(numGroups, luckyMode) => cleaveWithAI(resources, numGroups, luckyMode)}
            onCreateManualGroup={createManualGroup}
            onDismantleAll={dismantleAllGroups}
            hasGroups={groups.length > 0}
            cleaving={cleaving}
            loading={groupsLoading}
            entryCount={resources.length}
          />

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gothic-button-primary">
                <Plus className="h-4 w-4 mr-2" />
                Add Resource
              </Button>
            </DialogTrigger>
            <DialogContent className="gothic-card border-border/50 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-cinzel text-xl tracking-wide">
                  {editingResource ? "Edit Chronicle" : "New Chronicle Entry"}
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
                    placeholder="Name this resource..."
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
                  <Label htmlFor="url" className="font-cinzel text-sm">URL</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="bg-background/50 border-border/50"
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="font-cinzel text-sm">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="bg-background/50 border-border/50"
                    placeholder="e.g., Documentation, Tutorial..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project" className="font-cinzel text-sm">Link to Project</Label>
                  <Select
                    value={formData.project_id}
                    onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                  >
                    <SelectTrigger className="bg-background/50 border-border/50">
                      <SelectValue placeholder="Select a territory..." />
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
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="gothic-button-primary">
                    {editingResource ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <GroupedDataTable
          data={resources}
          columns={columns}
          groups={groups}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDismantleGroup={dismantleGroup}
          onMoveEntry={moveEntryToGroup}
          onRenameGroup={renameGroup}
          emptyMessage="No resources yet. Begin documenting your knowledge."
        />
      </div>
    </PageLayout>
  );
};

export default Resources;
