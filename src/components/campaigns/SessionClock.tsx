import { cn } from "@/lib/utils";

interface SessionClockProps {
  label: string;
  timeInSeconds: number;
  variant?: "campaign" | "session" | "task";
  isActive?: boolean;
}

export function SessionClock({ 
  label, 
  timeInSeconds, 
  variant = "session",
  isActive = false 
}: SessionClockProps) {
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    // Always show HH:MM:SS format for consistency
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  const variantStyles = {
    campaign: "border-primary/50 bg-primary/10",
    session: "border-accent/50 bg-accent/10",
    task: "border-muted-foreground/50 bg-muted/20"
  };

  const glowStyles = {
    campaign: "shadow-[0_0_30px_hsl(var(--primary)/0.4)]",
    session: "shadow-[0_0_30px_hsl(var(--accent)/0.4)]",
    task: "shadow-[0_0_20px_hsl(var(--muted-foreground)/0.2)]"
  };

  return (
    <div className={cn(
      "flex flex-col items-center p-2 md:p-6 rounded-sm border-2 transition-all duration-500",
      variantStyles[variant],
      isActive && glowStyles[variant]
    )}>
      <span className="font-cinzel text-[10px] md:text-sm tracking-widest uppercase text-muted-foreground mb-1 md:mb-2 text-center leading-tight">
        {label}
      </span>
      <span className={cn(
        "font-cinzel text-lg md:text-4xl tracking-wider tabular-nums",
        isActive && "animate-pulse"
      )}>
        {formatTime(timeInSeconds)}
      </span>
    </div>
  );
}
