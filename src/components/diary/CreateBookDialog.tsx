import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BOOK_COLORS } from "@/hooks/useDiary";
import { cn } from "@/lib/utils";

interface CreateBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (title: string, color: string) => void;
}

const CreateBookDialog = ({ open, onOpenChange, onSubmit }: CreateBookDialogProps) => {
  const [title, setTitle] = useState("");
  const [selectedColor, setSelectedColor] = useState(BOOK_COLORS[0].value);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit(title.trim(), selectedColor);
    setTitle("");
    setSelectedColor(BOOK_COLORS[0].value);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gothic-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-xl">Create New Book</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="font-cinzel">Book Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter book title..."
              className="font-crimson"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-cinzel">Cover Color</Label>
            <div className="flex flex-wrap gap-3">
              {BOOK_COLORS.map((color) => (
                <button
                  key={color.value}
                  className={cn(
                    "w-10 h-14 rounded-sm shadow-md transition-all hover:scale-110",
                    selectedColor === color.value && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setSelectedColor(color.value)}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            Create Book
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBookDialog;
