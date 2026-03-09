import { useState } from "react";
import { Music, Play, Pause, SkipBack, SkipForward, Volume2, ExternalLink, X, ListMusic } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMusic } from "@/contexts/MusicContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import MusicButton from "./MusicButton";

const MusicPlayer = () => {
  const [open, setOpen] = useState(false);
  const [externalUrl, setExternalUrl] = useState("");
  const { themeConfig } = useTheme();
  const {
    state,
    settings,
    themeTracks,
    play,
    pause,
    toggle,
    playTrack,
    nextTrack,
    prevTrack,
    setQueue,
    setVolume,
    updateSettings,
    setExternalPlaylist,
    clearExternalPlaylist,
  } = useMusic();

  const handleLoadThemeTracks = () => {
    setQueue(themeTracks);
    if (themeTracks.length > 0) {
      playTrack(themeTracks[0], 0);
    }
  };

  const handleLoadExternalPlaylist = () => {
    if (externalUrl.trim()) {
      setExternalPlaylist(externalUrl.trim());
    }
  };

  const getEmbedUrl = (url: string): string | null => {
    // YouTube
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
      const playlistId = url.match(/[?&]list=([^"&?\/\s]+)/)?.[1];
      if (playlistId) {
        return `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1`;
      }
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      }
    }
    // Spotify
    if (url.includes("spotify.com")) {
      const match = url.match(/spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
      if (match) {
        return `https://open.spotify.com/embed/${match[1]}/${match[2]}?theme=0`;
      }
    }
    // SoundCloud
    if (url.includes("soundcloud.com")) {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true`;
    }
    return null;
  };

  const embedUrl = state.externalPlaylistUrl ? getEmbedUrl(state.externalPlaylistUrl) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div>
          <MusicButton onClick={() => setOpen(true)} />
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            Music Player
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Now Playing */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Now Playing</h3>
              <div className="flex items-center justify-between bg-card/50 rounded-lg p-4 border border-border/50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {state.currentTrack?.title || "No track selected"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {themeConfig.displayName} Soundtrack
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" onClick={prevTrack} disabled={!state.currentTrack}>
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="default" onClick={toggle} disabled={state.useExternalPlaylist && !state.currentTrack}>
                    {state.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={nextTrack} disabled={!state.currentTrack}>
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-3">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={[settings.volume * 100]}
                  onValueChange={([v]) => setVolume(v / 100)}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-8">{Math.round(settings.volume * 100)}%</span>
              </div>
            </div>

            <Separator />

            {/* Theme Tracks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ListMusic className="h-4 w-4" />
                  {themeConfig.displayName} Tracks
                </h3>
                <Button size="sm" variant="outline" onClick={handleLoadThemeTracks}>
                  Play All
                </Button>
              </div>
              <div className="space-y-1">
                {themeTracks.map((track, index) => (
                  <button
                    key={track.id}
                    onClick={() => {
                      setQueue(themeTracks);
                      playTrack(track, index);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
                      "hover:bg-primary/10",
                      state.currentTrack?.id === track.id && "bg-primary/20 text-primary"
                    )}
                  >
                    <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
                      {state.currentTrack?.id === track.id && state.isPlaying ? (
                        <Pause className="h-3 w-3 text-primary" />
                      ) : (
                        <Play className="h-3 w-3 text-primary" />
                      )}
                    </div>
                    <span className="text-sm truncate">{track.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* External Playlist */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                External Playlist
              </h3>
              <p className="text-xs text-muted-foreground">
                Paste a link from Spotify, YouTube, or SoundCloud
              </p>
              <div className="flex gap-2">
                <Input
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1"
                />
                <Button onClick={handleLoadExternalPlaylist} size="sm">
                  Load
                </Button>
              </div>
              
              {state.useExternalPlaylist && embedUrl && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">External player active</span>
                    <Button size="sm" variant="ghost" onClick={clearExternalPlaylist}>
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <div className="aspect-video rounded-lg overflow-hidden border border-border/50">
                    <iframe
                      src={embedUrl}
                      width="100%"
                      height="100%"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="border-0"
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Playback Settings</h3>
              
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm">Music plays only when timer is running</span>
                  <Switch
                    checked={settings.playOnlyWhenTimerRunning}
                    onCheckedChange={(checked) => {
                      updateSettings({ 
                        playOnlyWhenTimerRunning: checked,
                        playOnlyWhenTimerPaused: checked ? false : settings.playOnlyWhenTimerPaused 
                      });
                    }}
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-sm">Music plays only when timer is paused</span>
                  <Switch
                    checked={settings.playOnlyWhenTimerPaused}
                    onCheckedChange={(checked) => {
                      updateSettings({ 
                        playOnlyWhenTimerPaused: checked,
                        playOnlyWhenTimerRunning: checked ? false : settings.playOnlyWhenTimerRunning 
                      });
                    }}
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-sm">Music plays outside of campaigns</span>
                  <Switch
                    checked={settings.playOutsideCampaigns}
                    onCheckedChange={(checked) => updateSettings({ playOutsideCampaigns: checked })}
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-sm">Clock ticking sounds</span>
                  <Switch
                    checked={settings.clockTickingEnabled}
                    onCheckedChange={(checked) => updateSettings({ clockTickingEnabled: checked })}
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-sm">Loop playlist</span>
                  <Switch
                    checked={settings.loopPlaylist}
                    onCheckedChange={(checked) => updateSettings({ loopPlaylist: checked })}
                  />
                </label>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default MusicPlayer;
