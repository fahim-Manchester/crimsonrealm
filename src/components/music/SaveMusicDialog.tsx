import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Upload, Link } from "lucide-react";

interface SaveMusicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: { title: string; url: string; type: "track" | "playlist"; description?: string }) => Promise<any>;
  defaultUrl?: string;
  editItem?: { id: string; title: string; url: string; type: string; description: string | null } | null;
  onUpdate?: (id: string, updates: { title?: string; url?: string; type?: "track" | "playlist"; description?: string | null }) => Promise<boolean>;
  onUpload?: (file: File, title: string, description?: string) => Promise<any>;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const SaveMusicDialog = ({ open, onOpenChange, onSave, defaultUrl, editItem, onUpdate, onUpload }: SaveMusicDialogProps) => {
  const [title, setTitle] = useState(editItem?.title || "");
  const [url, setUrl] = useState(editItem?.url || defaultUrl || "");
  const [type, setType] = useState<"track" | "playlist">(editItem?.type as any || "track");
  const [description, setDescription] = useState(editItem?.description || "");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<string>(editItem ? "url" : "url");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);
    if (!file) { setSelectedFile(null); return; }
    if (file.size > MAX_FILE_SIZE) {
      setFileError("File too large (max 20MB)");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    if (!title.trim()) {
      const name = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setTitle(name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setUploadProgress(10);

    if (editItem && onUpdate) {
      await onUpdate(editItem.id, { title: title.trim(), url: url.trim(), type, description: description.trim() || null });
    } else if (tab === "upload" && selectedFile && onUpload) {
      setUploadProgress(30);
      await onUpload(selectedFile, title.trim(), description.trim() || undefined);
      setUploadProgress(100);
    } else {
      if (!title.trim() || !url.trim()) { setSaving(false); return; }
      await onSave({ title: title.trim(), url: url.trim(), type, description: description.trim() || undefined });
    }

    setSaving(false);
    setUploadProgress(0);
    onOpenChange(false);
    setTitle(""); setUrl(""); setDescription(""); setType("track"); setSelectedFile(null);
  };

  const canSubmit = editItem
    ? title.trim() && url.trim()
    : tab === "upload"
      ? selectedFile && title.trim()
      : title.trim() && url.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-cinzel">{editItem ? "Edit Saved Music" : "Save to Library"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editItem && onUpload && (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="w-full">
                <TabsTrigger value="url" className="flex-1 gap-1"><Link className="h-3.5 w-3.5" />URL</TabsTrigger>
                <TabsTrigger value="upload" className="flex-1 gap-1"><Upload className="h-3.5 w-3.5" />Upload</TabsTrigger>
              </TabsList>
              <TabsContent value="url">
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
                </div>
              </TabsContent>
              <TabsContent value="upload">
                <div className="space-y-2">
                  <Label>Audio File</Label>
                  <Input
                    ref={fileRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                  {fileError && <p className="text-sm text-destructive">{fileError}</p>}
                  {selectedFile && <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>}
                  {saving && uploadProgress > 0 && <Progress value={uploadProgress} className="h-2" />}
                </div>
              </TabsContent>
            </Tabs>
          )}

          {editItem && (
            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
            </div>
          )}

          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Track name..." />
          </div>

          {(tab === "url" || editItem) && (
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
          )}

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Notes..." rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !canSubmit}>
              {saving ? (tab === "upload" ? "Uploading..." : "Saving...") : editItem ? "Update" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SaveMusicDialog;
