import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DiaryBook, DiaryEntry } from "@/hooks/useDiary";
import { Feather, Save } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface ScribeBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: DiaryBook | null;
  entries: DiaryEntry[];
  onSave: (content: string) => void;
}

const ScribeBookDialog = ({ 
  open, 
  onOpenChange, 
  book, 
  entries,
  onSave 
}: ScribeBookDialogProps) => {
  const [content, setContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  
  // Load existing scribed content when dialog opens
  useEffect(() => {
    if (open && entries) {
      const scribedEntries = entries
        .filter(e => e.entry_type === 'scribed')
        .sort((a, b) => a.page_number - b.page_number);
      
      const combinedContent = scribedEntries
        .map(e => e.content)
        .join('\n===\n');
      
      setContent(combinedContent);
      setHasChanges(false);
    }
  }, [open, entries]);

  const handleContentChange = (value: string) => {
    setContent(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(content);
    setHasChanges(false);
  };

  if (!book) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gothic-card border-primary/30 max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-xl flex items-center gap-2">
            <Feather className="h-5 w-5" />
            Scribe in "{book.title}"
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <p className="text-sm text-muted-foreground font-crimson">
            Write freely. Use <code className="bg-muted px-1 rounded">===</code> on an empty line to start a new page.
          </p>
          
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Begin your writing here..."
            className="flex-1 resize-none font-crimson text-base leading-relaxed min-h-[400px]"
          />
        </div>

        <DialogFooter className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-sm text-primary font-crimson italic mr-auto">
              Unsaved changes
            </span>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScribeBookDialog;
