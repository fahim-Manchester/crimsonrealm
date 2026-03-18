import { useState } from "react";
import {
  Music, Play, Pause, SkipBack, SkipForward, Volume2, X,
  Radio, HelpCircle, Clock, Repeat,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMusic, QueueItem } from "@/contexts/MusicContext";
import { useSavedMusic } from "@/hooks/useSavedMusic";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import MusicButton from "./MusicButton";
import MusicQueuePanel from "./MusicQueuePanel";
import SavedMusicBrowser from "./SavedMusicBrowser";
import SaveMusicDialog from "./SaveMusicDialog";

const MusicPlayer = () => {
  const [open, setOpen] = useState(false);
  const [tempUrl, setTempUrl] = useState("");
  const [showSavedBrowser, setShowSavedBrowser] = useState<"main" | "downtime" | null>(null);
  const [showThemePicker, setShowThemePicker] = useState<"main" | "downtime" | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDefaultUrl, setSaveDefaultUrl] = useState("");
  const [addNewTarget, setAddNewTarget] = useState<"main" | "downtime" | null>(null);
  const [showFirstTimeConfirm, setShowFirstTimeConfirm] = useState(false);

  const { themeConfig } = useTheme();
  const { user } = useAuth();
  const {
    state, settings, themeTracks, mainQueue, downtimeQueue,
    play, pause, toggle, playQueueItem, nextTrack, prevTrack,
    setMainQueue, setDowntimeQueue,
    addToMainQueue, addToDowntimeQueue,
    removeFromMainQueue, removeFromDowntimeQueue,
    reorderMainQueue, reorderDowntimeQueue,
    setMusicVolume, setTickingVolume, updateSettings,
    playTemporary, playTemporaryInternal, clearTemporary, pauseTemporary, resumeTemporary,
    notifyMenuOpen,
  } = useMusic();

  const { items: savedItems, loading: savedLoading, addItem: saveItem, updateItem: updateSavedItem, uploadAndSave: uploadItem } = useSavedMusic(user?.id);

  // Theme-aware label for "all theme music"
  const allThemeLabel = `All ${themeConfig.displayName} Music`;
  const musicDbLabel = themeConfig.labels.resources;

  // Add theme tracks to a queue
  const handleAddThemeTracks = (target: "main" | "downtime") => {
    const items: QueueItem[] = themeTracks.map(t => ({ id: t.id, title: t.title, url: t.url, isInternal: true }));
    if (target === "main") setMainQueue([...mainQueue, ...items]);
    else setDowntimeQueue([...downtimeQueue, ...items]);
    setShowThemePicker(null);
  };

  // Add saved item to queue
  const handleAddSavedToQueue = (item: { id: string; title: string; url: string }, target: "main" | "downtime") => {
    const queueItem: QueueItem = { id: `saved-${item.id}-${Date.now()}`, title: item.title, url: item.url };
    if (target === "main") addToMainQueue(queueItem);
    else addToDowntimeQueue(queueItem);
  };

  // Quick Play: play a single theme track temporarily
  const handleQuickPlayTrack = (track: { id: string; title: string; url: string }) => {
    playTemporaryInternal([{ id: track.id, title: track.title, url: track.url, isInternal: true }]);
  };

  // Quick Play: play all theme tracks in rotation
  const handleQuickPlayAllTheme = () => {
    const items: QueueItem[] = themeTracks.map(t => ({ id: t.id, title: t.title, url: t.url, isInternal: true }));
    playTemporaryInternal(items);
  };

  // Quick Play: temporary external playback
  const handleLoadTemporary = () => {
    if (tempUrl.trim()) {
      playTemporary(tempUrl.trim());
    }
  };

  // "+Add New" flow
  const handleAddNew = (target: "main" | "downtime") => {
    setAddNewTarget(target);
    if (savedItems.length === 0) {
      setShowFirstTimeConfirm(true);
    } else {
      setSaveDefaultUrl("");
      setShowSaveDialog(true);
    }
  };

  const handleFirstTimeConfirm = () => {
    setShowFirstTimeConfirm(false);
    setSaveDefaultUrl("");
    setShowSaveDialog(true);
  };

  // After saving a new track, also add it to the target queue
  const handleSaveAndAddToQueue = async (item: { title: string; url: string; type: "track" | "playlist"; description?: string }) => {
    const saved = await saveItem(item);
    if (saved && addNewTarget) {
      const queueItem: QueueItem = { id: `saved-${saved.id}-${Date.now()}`, title: saved.title, url: saved.url };
      if (addNewTarget === "main") addToMainQueue(queueItem);
      else addToDowntimeQueue(queueItem);
    }
    setAddNewTarget(null);
    return saved;
  };

  const isPlaying = state.useTemporary ? state.temporaryIsPlaying : state.isPlaying;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); notifyMenuOpen(v); }}>
        <DialogTrigger asChild>
          <div>
            <MusicButton onClick={() => setOpen(true)} />
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Music className="h-5 w-5 text-primary" />
              Music Player
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[75vh] pr-4">
            <div className="space-y-4">
              {/* Now Playing Bar */}
              <div className="flex items-center justify-between bg-card/50 rounded-lg p-3 border border-border/50">
                <div className="flex-1 min-w-0">
                  {state.useTemporary ? (
                    <>
                      <p className="font-medium truncate flex items-center gap-2 text-sm">
                        <Radio className="h-4 w-4 text-primary animate-pulse" />
                        Quick Play
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {state.temporaryIsPlaying ? "Playing" : "Paused"} — queues preserved
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium truncate text-sm">
                        {state.currentTrack?.title || "No track selected"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {state.activeSource === "downtime" ? "Downtime Queue" : "Main Queue"}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!state.useTemporary && (
                    <Button size="icon" variant="ghost" onClick={prevTrack} disabled={!state.currentTrack} className="h-8 w-8">
                      <SkipBack className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="default"
                    className="h-8 w-8"
                    onClick={() => {
                      if (state.useTemporary) {
                        state.temporaryIsPlaying ? pause() : resumeTemporary();
                      } else {
                        toggle();
                      }
                    }}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  {!state.useTemporary && (
                    <Button size="icon" variant="ghost" onClick={nextTrack} disabled={!state.currentTrack} className="h-8 w-8">
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  )}
                  {state.useTemporary && (
                    <Button size="icon" variant="ghost" onClick={clearTemporary} className="h-8 w-8">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="main" className="w-full">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="main" className="text-xs">Main</TabsTrigger>
                  <TabsTrigger value="downtime" className="text-xs">Downtime</TabsTrigger>
                  <TabsTrigger value="temp" className="text-xs">Quick Play</TabsTrigger>
                  <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
                </TabsList>

                {/* Main Queue Tab */}
                <TabsContent value="main">
                  {showThemePicker === "main" ? (
                    <div className="space-y-2">
                      <h4 className="text-sm text-muted-foreground">Add {themeConfig.displayName} Tracks</h4>
                      <div className="space-y-1">
                        {themeTracks.map(track => (
                          <button
                            key={track.id}
                            onClick={() => {
                              addToMainQueue({ id: track.id, title: track.title, url: track.url, isInternal: true });
                            }}
                            className="w-full flex items-center gap-2 p-2 rounded-md text-left hover:bg-primary/10 text-sm"
                          >
                            <Music className="h-3 w-3 text-primary" />
                            {track.title}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleAddThemeTracks("main")} className="text-xs">Add All</Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowThemePicker(null)} className="text-xs">Back</Button>
                      </div>
                    </div>
                  ) : showSavedBrowser === "main" ? (
                    <SavedMusicBrowser
                      items={savedItems}
                      loading={savedLoading}
                      onSelect={item => handleAddSavedToQueue(item, "main")}
                      onClose={() => setShowSavedBrowser(null)}
                    />
                  ) : (
                    <MusicQueuePanel
                      items={mainQueue}
                      currentId={state.activeSource === "main" ? state.currentTrack?.id : undefined}
                      isPlaying={state.isPlaying && state.activeSource === "main"}
                      loopMode={settings.loopMode}
                      onPlay={(item, idx) => playQueueItem(item, idx, "main")}
                      onRemove={removeFromMainQueue}
                      onReorder={reorderMainQueue}
                      onLoopChange={mode => updateSettings({ loopMode: mode })}
                      onAddFromLibrary={() => setShowSavedBrowser("main")}
                      onAddInternal={() => setShowThemePicker("main")}
                      onAddNew={() => handleAddNew("main")}
                      label="Main Music Queue"
                    />
                  )}
                </TabsContent>

                {/* Downtime Queue Tab */}
                <TabsContent value="downtime">
                  {!settings.downtimeEnabled ? (
                    <div className="py-6 text-center space-y-3">
                      <Clock className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        Enable "Downtime music" in Settings to use a separate break queue.
                      </p>
                    </div>
                  ) : showThemePicker === "downtime" ? (
                    <div className="space-y-2">
                      <h4 className="text-sm text-muted-foreground">Add {themeConfig.displayName} Tracks</h4>
                      <div className="space-y-1">
                        {themeTracks.map(track => (
                          <button
                            key={track.id}
                            onClick={() => {
                              addToDowntimeQueue({ id: track.id, title: track.title, url: track.url, isInternal: true });
                            }}
                            className="w-full flex items-center gap-2 p-2 rounded-md text-left hover:bg-primary/10 text-sm"
                          >
                            <Music className="h-3 w-3 text-primary" />
                            {track.title}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleAddThemeTracks("downtime")} className="text-xs">Add All</Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowThemePicker(null)} className="text-xs">Back</Button>
                      </div>
                    </div>
                  ) : showSavedBrowser === "downtime" ? (
                    <SavedMusicBrowser
                      items={savedItems}
                      loading={savedLoading}
                      onSelect={item => handleAddSavedToQueue(item, "downtime")}
                      onClose={() => setShowSavedBrowser(null)}
                    />
                  ) : (
                    <MusicQueuePanel
                      items={downtimeQueue}
                      currentId={state.activeSource === "downtime" ? state.currentTrack?.id : undefined}
                      isPlaying={state.isPlaying && state.activeSource === "downtime"}
                      loopMode={settings.downtimeLoopMode}
                      onPlay={(item, idx) => playQueueItem(item, idx, "downtime")}
                      onRemove={removeFromDowntimeQueue}
                      onReorder={reorderDowntimeQueue}
                      onLoopChange={mode => updateSettings({ downtimeLoopMode: mode })}
                      onAddFromLibrary={() => setShowSavedBrowser("downtime")}
                      onAddInternal={() => setShowThemePicker("downtime")}
                      onAddNew={() => handleAddNew("downtime")}
                      label="Downtime Queue"
                    />
                  )}
                </TabsContent>

                {/* Quick Play Tab */}
                <TabsContent value="temp">
                  <div className="space-y-4">
                    {/* Theme Tracks Section */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Music className="h-3.5 w-3.5" />
                        {themeConfig.displayName} Tracks
                      </h4>
                      <div className="space-y-1">
                        {themeTracks.map(track => (
                          <button
                            key={track.id}
                            onClick={() => handleQuickPlayTrack(track)}
                            className={cn(
                              "w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors text-sm",
                              "hover:bg-primary/10"
                            )}
                          >
                            <Play className="h-3 w-3 text-primary flex-shrink-0" />
                            <span className="truncate">{track.title}</span>
                          </button>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleQuickPlayAllTheme}
                        className="w-full text-xs"
                      >
                        <Repeat className="h-3 w-3 mr-1" />
                        {allThemeLabel}
                      </Button>
                    </div>

                    <Separator />

                    {/* External URL Section */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Or paste an external link to play temporarily:
                      </p>
                      <div className="flex gap-2">
                        <Input
                          value={tempUrl}
                          onChange={e => setTempUrl(e.target.value)}
                          placeholder="YouTube, Spotify, SoundCloud..."
                          className="flex-1"
                        />
                        <Button onClick={handleLoadTemporary} size="sm">Play</Button>
                      </div>
                      {tempUrl.trim() && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setSaveDefaultUrl(tempUrl.trim()); setAddNewTarget(null); setShowSaveDialog(true); }}
                          className="text-xs"
                        >
                          Save to Library
                        </Button>
                      )}
                    </div>

                    {/* Active temporary playback indicator */}
                    {state.useTemporary && (
                      <div className="flex items-center justify-between bg-primary/5 rounded-lg p-3 border border-primary/20">
                        <div className="flex items-center gap-2">
                          <Radio className="h-4 w-4 text-primary animate-pulse" />
                          <span className="text-sm text-primary font-medium">
                            {state.temporaryIsPlaying ? "Playing" : "Paused"} — Looping
                          </span>
                        </div>
                        <Button size="sm" variant="ghost" onClick={clearTemporary}>
                          <X className="h-3 w-3 mr-1" /> Clear
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings">
                  <div className="space-y-4">
                    {/* Music Volume */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Music Volume</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Slider
                          value={[settings.musicVolume * 100]}
                          onValueChange={([v]) => setMusicVolume(v / 100)}
                          max={100}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-xs text-muted-foreground w-8">{Math.round(settings.musicVolume * 100)}%</span>
                      </div>
                    </div>

                    {/* Ticking Volume */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Clock Ticking Volume</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Slider
                          value={[settings.tickingVolume * 100]}
                          onValueChange={([v]) => setTickingVolume(v / 100)}
                          max={100}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-xs text-muted-foreground w-8">{Math.round(settings.tickingVolume * 100)}%</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Toggles */}
                    <div className="space-y-3">
                      <label className="flex items-center justify-between">
                        <span className="text-sm">Clock ticking sounds</span>
                        <Switch
                          checked={settings.clockTickingEnabled}
                          onCheckedChange={checked => updateSettings({ clockTickingEnabled: checked })}
                        />
                      </label>

                      <label className="flex items-center justify-between">
                        <span className="text-sm">Only play music when timer is on</span>
                        <Switch
                          checked={settings.playOnlyWhenTimerRunning}
                          onCheckedChange={checked => updateSettings({ playOnlyWhenTimerRunning: checked })}
                        />
                      </label>

                      <label className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-sm">Add downtime music list</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[240px]">
                              <p className="text-xs">
                                Set separate music for breaks or downtime, so both work mode and break mode feel active and intentional.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Switch
                          checked={settings.downtimeEnabled}
                          onCheckedChange={checked => updateSettings({ downtimeEnabled: checked })}
                        />
                      </label>

                      <label className="flex items-center justify-between">
                        <span className="text-sm">Music plays outside of campaigns</span>
                        <Switch
                          checked={settings.playOutsideCampaigns}
                          onCheckedChange={checked => updateSettings({ playOutsideCampaigns: checked })}
                        />
                      </label>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* First-time music DB confirmation */}
      <AlertDialog open={showFirstTimeConfirm} onOpenChange={setShowFirstTimeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Music Library</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a Music Database section in your {musicDbLabel} where saved tracks and playlists will be stored. You can manage them there anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAddNewTarget(null)}>Later</AlertDialogCancel>
            <AlertDialogAction onClick={handleFirstTimeConfirm}>Proceed</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SaveMusicDialog
        open={showSaveDialog}
        onOpenChange={(open) => { setShowSaveDialog(open); if (!open) setAddNewTarget(null); }}
        onSave={addNewTarget ? handleSaveAndAddToQueue : saveItem}
        defaultUrl={saveDefaultUrl}
        onUpload={uploadItem}
      />
    </>
  );
};

export default MusicPlayer;
