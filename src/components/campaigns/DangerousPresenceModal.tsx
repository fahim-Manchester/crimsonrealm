import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

interface DangerousPresenceModalProps {
  countdown: number;
  onConfirm: () => void;
}

export function DangerousPresenceModal({ countdown, onConfirm }: DangerousPresenceModalProps) {
  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 p-8 max-w-md text-center">
        <div className="w-20 h-20 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center animate-pulse">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>

        <h2 className="font-cinzel text-2xl text-destructive tracking-wide">
          Presence Required
        </h2>

        <p className="font-crimson text-muted-foreground">
          Your session has been running for an extended period. Confirm your presence
          or the <strong className="text-destructive">current session progress will be reset</strong>.
        </p>

        <div className="font-cinzel text-4xl tabular-nums text-destructive">
          {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
        </div>

        <Button
          size="lg"
          onClick={onConfirm}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-cinzel tracking-wider px-10"
        >
          Mark Presence
        </Button>
      </div>
    </div>
  );
}
