import { Music, ListMusic, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SavedMusicItem } from "@/hooks/useSavedMusic";

interface SavedMusicBrowserProps {
  items: SavedMusicItem[];
  loading: boolean;
  onSelect: (item: SavedMusicItem) => void;
  onClose: () => void;
}

const platformIcon: Record<string, string> = {
  youtube: "🎬",
  spotify: "🎵",
  soundcloud: "☁️",
};

const SavedMusicBrowser = ({ items, loading, onSelect, onClose }: SavedMusicBrowserProps) => {
  if (loading) {
    return <p className="text-xs text-muted-foreground py-4 text-center">Loading library...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="py-4 text-center space-y-2">
        <p className="text-xs text-muted-foreground">No saved music yet.</p>
        <p className="text-xs text-muted-foreground">Save tracks from the "Temporary Play" section or from Chronicles.</p>
        <Button size="sm" variant="ghost" onClick={onClose}>Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">Select from Library</h4>
        <Button size="sm" variant="ghost" onClick={onClose} className="text-xs h-7">Done</Button>
      </div>
      <ScrollArea className="max-h-52">
        <div className="space-y-1">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="w-full flex items-center gap-2 p-2 rounded-md text-left hover:bg-primary/10 transition-colors"
            >
              {item.type === "playlist" ? (
                <ListMusic className="h-4 w-4 text-primary flex-shrink-0" />
              ) : (
                <Music className="h-4 w-4 text-primary flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <span className="text-sm truncate block">{item.title}</span>
                {item.description && (
                  <span className="text-[10px] text-muted-foreground truncate block">{item.description}</span>
                )}
              </div>
              {item.source_platform && (
                <span className="text-xs">{platformIcon[item.source_platform] || "🔗"}</span>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default SavedMusicBrowser;
