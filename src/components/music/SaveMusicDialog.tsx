import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface SaveMusicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: { title: string; url: string; type: "track" | "playlist"; description?: string }) => Promise<any>;
  defaultUrl?: string;
  editItem?: { id: string; title: string; url: string; type: string; description: string | null } | null;
  onUpdate?: (id: string, updates: { title?: string; url?: string; type?: "track" | "playlist"; description?: string | null }) => Promise<boolean>;
}

const SaveMusicDialog = ({ open, onOpenChange, onSave, defaultUrl, editItem, onUpdate }: SaveMusicDialogProps) => {
  const [title, setTitle] = useState(editItem?.title || "");
  const [url, setUrl] = useState(editItem?.url || defaultUrl || "");
  const [type, setType] = useState<"track" | "playlist">(editItem?.type as any || "track");
  const [description, setDescription] = useState(editItem?.description || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    setSaving(true);
    if (editItem && onUpdate) {
      await onUpdate(editItem.id, { title: title.trim(), url: url.trim(), type, description: description.trim() || null });
    } else {
      await onSave({ title: title.trim(), url: url.trim(), type, description: description.trim() || undefined });
    }
    setSaving(false);
    onOpenChange(false);
    setTitle(""); setUrl(""); setDescription(""); setType("track");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-cinzel">{editItem ? "Edit Saved Music" : "Save to Library"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Track name..." />
          </div>
          <div className="space-y-2">
            <Label>URL</Label>
            <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <RadioGroup value={type} onValueChange={v => setType(v as any)} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="track" id="type-track" />
                <Label htmlFor="type-track">Track</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="playlist" id="type-playlist" />
                <Label htmlFor="type-playlist">Playlist</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Notes..." rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !title.trim() || !url.trim()}>
              {saving ? "Saving..." : editItem ? "Update" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SaveMusicDialog;
