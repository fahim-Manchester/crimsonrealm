import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Share, Plus, MoreVertical, Menu, Download } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  browser: 'chrome' | 'edge' | 'samsung' | 'firefox' | 'safari' | 'opera' | 'other';
  platform: 'ios' | 'android' | 'desktop';
}

export default function InstallModal({ open, onClose, browser, platform }: Props) {
  const getInstructions = () => {
    // iOS Safari
    if (platform === 'ios' && browser === 'safari') {
      return {
        title: "Install on iOS",
        steps: [
          { icon: <Share className="h-5 w-5 text-primary" />, text: <>Tap the <strong>Share</strong> button in Safari</> },
          { icon: <Plus className="h-5 w-5 text-primary" />, text: <>Select <strong>"Add to Home Screen"</strong></> },
        ]
      };
    }

    // iOS other browsers - need to use Safari
    if (platform === 'ios') {
      return {
        title: "Install on iOS",
        steps: [
          { icon: <Share className="h-5 w-5 text-primary" />, text: <>Open this page in <strong>Safari</strong></> },
          { icon: <Share className="h-5 w-5 text-primary" />, text: <>Tap the <strong>Share</strong> button</> },
          { icon: <Plus className="h-5 w-5 text-primary" />, text: <>Select <strong>"Add to Home Screen"</strong></> },
        ],
        note: "iOS requires Safari to install web apps"
      };
    }

    // Android Firefox
    if (platform === 'android' && browser === 'firefox') {
      return {
        title: "Install on Android",
        steps: [
          { icon: <MoreVertical className="h-5 w-5 text-primary" />, text: <>Tap the <strong>menu</strong> button (⋮)</> },
          { icon: <Download className="h-5 w-5 text-primary" />, text: <>Select <strong>"Install"</strong> or <strong>"Add to Home screen"</strong></> },
        ]
      };
    }

    // Android Samsung Browser
    if (platform === 'android' && browser === 'samsung') {
      return {
        title: "Install on Android",
        steps: [
          { icon: <Menu className="h-5 w-5 text-primary" />, text: <>Tap the <strong>menu</strong> button (☰)</> },
          { icon: <Plus className="h-5 w-5 text-primary" />, text: <>Select <strong>"Add page to" → "Home screen"</strong></> },
        ]
      };
    }

    // Android Chrome/Edge/Opera (fallback if native prompt didn't work)
    if (platform === 'android') {
      return {
        title: "Install on Android",
        steps: [
          { icon: <MoreVertical className="h-5 w-5 text-primary" />, text: <>Tap the <strong>menu</strong> button (⋮)</> },
          { icon: <Download className="h-5 w-5 text-primary" />, text: <>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></> },
        ]
      };
    }

    // Desktop browsers
    if (browser === 'chrome' || browser === 'edge') {
      return {
        title: "Install on Desktop",
        steps: [
          { icon: <Download className="h-5 w-5 text-primary" />, text: <>Look for the <strong>install icon</strong> in the address bar</> },
          { icon: <Plus className="h-5 w-5 text-primary" />, text: <>Or use menu → <strong>"Install Crimson Realm"</strong></> },
        ]
      };
    }

    // Firefox desktop
    if (browser === 'firefox') {
      return {
        title: "Install App",
        steps: [
          { icon: <Download className="h-5 w-5 text-primary" />, text: <>Firefox desktop doesn't support app installation</> },
          { icon: <Share className="h-5 w-5 text-primary" />, text: <>Use <strong>Chrome</strong> or <strong>Edge</strong> to install</> },
        ],
        note: "Or bookmark this page for quick access"
      };
    }

    // Safari desktop (macOS)
    if (browser === 'safari') {
      return {
        title: "Install on macOS",
        steps: [
          { icon: <Share className="h-5 w-5 text-primary" />, text: <>Click <strong>File</strong> in the menu bar</> },
          { icon: <Plus className="h-5 w-5 text-primary" />, text: <>Select <strong>"Add to Dock"</strong></> },
        ],
        note: "Requires macOS Sonoma or later"
      };
    }

    // Generic fallback
    return {
      title: "Install App",
      steps: [
        { icon: <Download className="h-5 w-5 text-primary" />, text: <>Check your browser's menu for <strong>"Install"</strong> or <strong>"Add to Home Screen"</strong></> },
      ],
      note: "For best experience, use Chrome, Edge, or Safari"
    };
  };

  const instructions = getInstructions();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="gothic-card max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-cinzel">{instructions.title}</DialogTitle>
          <DialogDescription className="font-crimson">
            Add Crimson Realm to your phone's home screen for the full mobile experience.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {instructions.steps.map((step, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                {step.icon}
              </div>
              <p className="font-crimson text-sm">
                {step.text}
              </p>
            </div>
          ))}
          {instructions.note && (
            <p className="font-crimson text-xs text-muted-foreground italic pt-2 border-t border-border/30">
              {instructions.note}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
