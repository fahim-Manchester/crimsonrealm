import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCleaveDismantle } from "@/hooks/useCleaveDismantle";
import { useSavedMusic, SavedMusicItem } from "@/hooks/useSavedMusic";
import { useTheme } from "@/contexts/ThemeContext";
import PageLayout from "@/components/layout/PageLayout";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import GroupedDataTable from "@/components/shared/GroupedDataTable";
import { CleaveControls } from "@/components/shared/CleaveControls";
import SaveMusicDialog from "@/components/music/SaveMusicDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, ExternalLink, Music, Trash2, Edit, ListMusic } from "lucide-react";

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

// Theme-aware music section names
const musicSectionNames: Record<string, string> = {
  gothic: "Sound Archives",
  neon: "Audio Intel",
  fantasy: "Bardic Collection",
  executive: "Media Library",
};

const Resources = () => {
  const { user, loading: authLoading } = useAuth();
  const { theme, themeConfig } = useTheme();
  const labels = themeConfig.labels;
  const [resources, setResources] = useState<Resource[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  
  // Music database
  const { items: savedMusic, loading: musicLoading, addItem: saveMusicItem, updateItem: updateMusicItem, deleteItem: deleteMusicItem } = useSavedMusic(user?.id);
  const [showMusicDialog, setShowMusicDialog] = useState(false);
  const [editingMusic, setEditingMusic] = useState<SavedMusicItem | null>(null);
  const [showDeleteMusicConfirm, setShowDeleteMusicConfirm] = useState<string | null>(null);
  const [showDeleteAllMusicConfirm, setShowDeleteAllMusicConfirm] = useState(false);
  
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

  const handleDeleteMusicItem = async (id: string) => {
    await deleteMusicItem(id);
    setShowDeleteMusicConfirm(null);
  };

  const handleDeleteAllMusic = async () => {
    for (const item of savedMusic) {
      await deleteMusicItem(item.id);
    }
    setShowDeleteAllMusicConfirm(false);
    toast.success("Music database cleared");
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

  const musicSectionTitle = musicSectionNames[theme] || "Sound Archives";

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <PageLayout title={labels.resources} subtitle={labels.resourcesSubtitle}>
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

        {/* Music Database Section */}
        <Separator className="my-8" />
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
                <Music className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-cinzel text-lg tracking-wide">{musicSectionTitle}</h2>
                <p className="text-xs text-muted-foreground">Your saved tracks and playlists</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setEditingMusic(null); setShowMusicDialog(true); }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
              {savedMusic.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteAllMusicConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {musicLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
          ) : savedMusic.length === 0 ? (
            <div className="gothic-card p-6 text-center">
              <Music className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No saved music yet. Save tracks from the Music Player or add them here.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {savedMusic.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-md bg-card/30 border border-border/30 hover:border-border/50 transition-colors group"
                >
                  {item.type === "playlist" ? (
                    <ListMusic className="h-4 w-4 text-primary flex-shrink-0" />
                  ) : (
                    <Music className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <div className="flex items-center gap-2">
                      {item.source_platform && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded capitalize">
                          {item.source_platform}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground capitalize">{item.type}</span>
                      {item.description && (
                        <span className="text-[10px] text-muted-foreground truncate">· {item.description}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:text-primary transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      onClick={() => { setEditingMusic(item); setShowMusicDialog(true); }}
                      className="p-1 hover:text-primary transition-colors"
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setShowDeleteMusicConfirm(item.id)}
                      className="p-1 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save/Edit Music Dialog */}
      <SaveMusicDialog
        open={showMusicDialog}
        onOpenChange={open => { setShowMusicDialog(open); if (!open) setEditingMusic(null); }}
        onSave={saveMusicItem}
        editItem={editingMusic}
        onUpdate={updateMusicItem}
      />

      {/* Delete single music confirmation */}
      <AlertDialog open={!!showDeleteMusicConfirm} onOpenChange={() => setShowDeleteMusicConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete saved music?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this item from your music library. It will also be removed from any queue it was added to.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => showDeleteMusicConfirm && handleDeleteMusicItem(showDeleteMusicConfirm)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete all music confirmation */}
      <AlertDialog open={showDeleteAllMusicConfirm} onOpenChange={setShowDeleteAllMusicConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entire music database?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete ALL your saved tracks and playlists. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllMusic} className="bg-destructive hover:bg-destructive/90">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};

export default Resources;
