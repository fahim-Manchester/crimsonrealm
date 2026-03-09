import { Music } from "lucide-react";
import { useMusic } from "@/contexts/MusicContext";
import { cn } from "@/lib/utils";

interface MusicButtonProps {
  onClick: () => void;
}

const MusicButton = ({ onClick }: MusicButtonProps) => {
  const { state } = useMusic();

  return (
    <button
      onClick={onClick}
      className={cn(
        "p-2 rounded-sm transition-colors relative",
        "hover:bg-primary/10",
        state.isPlaying && "text-primary"
      )}
      title="Music Player"
    >
      <Music className="h-5 w-5 text-muted-foreground hover:text-primary" />
      {state.isPlaying && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
      )}
    </button>
  );
};

export default MusicButton;
