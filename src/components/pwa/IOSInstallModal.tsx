import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Share, Plus } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function IOSInstallModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="gothic-card max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-cinzel">Install Crimson Realm</DialogTitle>
          <DialogDescription className="font-crimson">
            Add this app to your home screen for the full experience.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
              <Share className="h-5 w-5 text-primary" />
            </div>
            <p className="font-crimson text-sm">
              Tap the <strong>Share</strong> button in Safari
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <p className="font-crimson text-sm">
              Select <strong>"Add to Home Screen"</strong>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
