import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { THEMES, ThemeTrack } from "@/lib/themes";
import { useMusicPreferences, MusicPrefsData } from "@/hooks/useMusicPreferences";
import { useAuth } from "@/hooks/useAuth";

// ---- Types ----

export interface QueueItem {
  id: string;
  title: string;
  url: string;
  isInternal?: boolean;
}

export type LoopMode = "none" | "queue" | "one";

export interface MusicSettings {
  musicVolume: number;
  tickingVolume: number;
  clockTickingEnabled: boolean;
  loopMode: LoopMode;
  downtimeLoopMode: LoopMode;
  playOnlyWhenTimerRunning: boolean;
  downtimeEnabled: boolean;
  playOutsideCampaigns: boolean;
}

interface MusicState {
  isPlaying: boolean;
  currentTrack: QueueItem | null;
  currentTrackIndex: number;
  activeSource: "main" | "downtime" | "temporary";
  // Whether the current queue track uses iframe (external) vs audio element (internal)
  currentTrackIsExternal: boolean;
  // External/temporary playback
  temporaryUrl: string;
  temporaryIsPlaying: boolean;
  useTemporary: boolean;
}

interface MusicContextType {
  state: MusicState;
  settings: MusicSettings;
  themeTracks: ThemeTrack[];
  mainQueue: QueueItem[];
  downtimeQueue: QueueItem[];
  // Playback
  play: () => void;
  pause: () => void;
  toggle: () => void;
  playQueueItem: (item: QueueItem, index: number, source?: "main" | "downtime") => void;
  nextTrack: () => void;
  prevTrack: () => void;
  // Queue management
  setMainQueue: (items: QueueItem[]) => void;
  setDowntimeQueue: (items: QueueItem[]) => void;
  addToMainQueue: (item: QueueItem) => void;
  addToDowntimeQueue: (item: QueueItem) => void;
  removeFromMainQueue: (index: number) => void;
  removeFromDowntimeQueue: (index: number) => void;
  reorderMainQueue: (from: number, to: number) => void;
  reorderDowntimeQueue: (from: number, to: number) => void;
  // Settings
  setMusicVolume: (volume: number) => void;
  setTickingVolume: (volume: number) => void;
  updateSettings: (settings: Partial<MusicSettings>) => void;
  // Temporary playback
  playTemporary: (url: string) => void;
  playTemporaryInternal: (tracks: QueueItem[], startIndex?: number) => void;
  clearTemporary: () => void;
  pauseTemporary: () => void;
  resumeTemporary: () => void;
  // Campaign timer
  notifyCampaignTimerState: (isRunning: boolean, isInCampaign: boolean) => void;
  // Helpers
  getEmbedUrl: (url: string) => string | null;
}

// ---- Constants ----

const FADE_DURATION = 1200;
const FADE_INTERVAL = 20;
const FADE_STEPS = FADE_DURATION / FADE_INTERVAL;

const defaultSettings: MusicSettings = {
  musicVolume: 0.7,
  tickingVolume: 0.5,
  clockTickingEnabled: false,
  loopMode: "queue",
  downtimeLoopMode: "queue",
  playOnlyWhenTimerRunning: false,
  downtimeEnabled: false,
  playOutsideCampaigns: true,
};

const defaultState: MusicState = {
  isPlaying: false,
  currentTrack: null,
  currentTrackIndex: -1,
  activeSource: "main",
  currentTrackIsExternal: false,
  temporaryUrl: "",
  temporaryIsPlaying: false,
  useTemporary: false,
};

const MusicContext = createContext<MusicContextType | undefined>(undefined);

// ---- Helpers ----

function isExternalUrl(url: string): boolean {
  return url.includes("youtube.com") || url.includes("youtu.be") ||
    url.includes("spotify.com") || url.includes("soundcloud.com");
}

export function getEmbedUrl(url: string): string | null {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
    const playlistId = url.match(/[?&]list=([^"&?\/\s]+)/)?.[1];
    if (playlistId) return `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&enablejsapi=1`;
    if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
  }
  if (url.includes("spotify.com")) {
    const match = url.match(/spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
    if (match) return `https://open.spotify.com/embed/${match[1]}/${match[2]}?theme=0`;
  }
  if (url.includes("soundcloud.com")) {
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true`;
  }
  return null;
}

function createTickingEngine() {
  let audioCtx: AudioContext | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let gainLevel = 0.12;

  function tick() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    const bufferSize = audioCtx.sampleRate * 0.02;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 8);
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1800, t);
    filter.Q.setValueAtTime(2, t);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(gainLevel, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    source.start(t);
    source.stop(t + 0.05);
  }

  return {
    start() {
      if (intervalId) return;
      if (!audioCtx) audioCtx = new AudioContext();
      if (audioCtx.state === "suspended") audioCtx.resume();
      tick();
      intervalId = setInterval(tick, 1000);
    },
    stop() {
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
    },
    setVolume(vol: number) {
      gainLevel = vol * 0.24; // scale 0-1 to 0-0.24
    },
    destroy() {
      this.stop();
      audioCtx?.close();
      audioCtx = null;
    },
  };
}

// ---- Provider ----

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const userId = user?.id;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tickingEngineRef = useRef<ReturnType<typeof createTickingEngine> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetVolumeRef = useRef(0.7);
  const youtubeFadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hydratedRef = useRef(false);

  const { loadLocal, loadFromDB, saveToDB } = useMusicPreferences(userId);

  const [settings, setSettings] = useState<MusicSettings>(() => {
    const cached = loadLocal();
    return { ...defaultSettings, ...cached.settings };
  });
  const [mainQueue, setMainQueue] = useState<QueueItem[]>(() => loadLocal().main_queue || []);
  const [downtimeQueue, setDowntimeQueue] = useState<QueueItem[]>(() => loadLocal().downtime_queue || []);
  const [state, setState] = useState<MusicState>(defaultState);
  const [temporaryInternalQueue, setTemporaryInternalQueue] = useState<QueueItem[]>([]);
  const [temporaryInternalIndex, setTemporaryInternalIndex] = useState(0);
  const [campaignState, setCampaignState] = useState({ isRunning: false, isInCampaign: false });

  const themeTracks = THEMES[theme]?.tracks || [];

  // Keep targetVolumeRef in sync
  useEffect(() => { targetVolumeRef.current = settings.musicVolume; }, [settings.musicVolume]);

  // Update ticking volume
  useEffect(() => { tickingEngineRef.current?.setVolume(settings.tickingVolume); }, [settings.tickingVolume]);

  // ---- Hydrate from DB on login ----
  useEffect(() => {
    if (!userId || hydratedRef.current) return;
    hydratedRef.current = true;
    loadFromDB().then(dbData => {
      if (dbData) {
        setSettings(s => ({ ...s, ...dbData.settings }));
        if (dbData.main_queue.length > 0) setMainQueue(dbData.main_queue);
        if (dbData.downtime_queue.length > 0) setDowntimeQueue(dbData.downtime_queue);
      }
    });
  }, [userId, loadFromDB]);

  // Reset hydration flag on logout
  useEffect(() => {
    if (!userId) hydratedRef.current = false;
  }, [userId]);

  // ---- Persist to DB on changes ----
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!userId) return;
    // Debounce a bit to avoid rapid saves
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    persistTimeoutRef.current = setTimeout(() => {
      const prefs: MusicPrefsData = { settings, main_queue: mainQueue, downtime_queue: downtimeQueue };
      saveToDB(prefs);
    }, 500);
  }, [settings, mainQueue, downtimeQueue, userId, saveToDB]);

  // ---- Audio init ----
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = settings.musicVolume;
    }
    if (!tickingEngineRef.current) {
      tickingEngineRef.current = createTickingEngine();
      tickingEngineRef.current.setVolume(settings.tickingVolume);
    }
    return () => {
      cancelFade();
      tickingEngineRef.current?.destroy();
    };
  }, []);

  // ---- Fade helpers ----
  const cancelFade = useCallback(() => {
    if (fadeIntervalRef.current) { clearInterval(fadeIntervalRef.current); fadeIntervalRef.current = null; }
  }, []);

  const fadeOut = useCallback((callback?: () => void) => {
    cancelFade();
    const audio = audioRef.current;
    if (!audio) { callback?.(); return; }
    const startVol = audio.volume;
    if (startVol <= 0) { callback?.(); return; }
    const step = startVol / FADE_STEPS;
    let cur = 0;
    fadeIntervalRef.current = setInterval(() => {
      cur++;
      audio.volume = Math.max(0, startVol - step * cur);
      if (cur >= FADE_STEPS) { cancelFade(); audio.volume = 0; callback?.(); }
    }, FADE_INTERVAL);
  }, [cancelFade]);

  const fadeIn = useCallback(() => {
    cancelFade();
    const audio = audioRef.current;
    if (!audio) return;
    const target = targetVolumeRef.current;
    audio.volume = 0;
    const step = target / FADE_STEPS;
    let cur = 0;
    fadeIntervalRef.current = setInterval(() => {
      cur++;
      audio.volume = Math.min(target, step * cur);
      if (cur >= FADE_STEPS) { cancelFade(); audio.volume = target; }
    }, FADE_INTERVAL);
  }, [cancelFade]);

  // ---- YouTube helpers ----
  const isYouTubeUrl = useCallback((url: string) => url.includes("youtube.com") || url.includes("youtu.be"), []);

  const setYouTubeVolume = useCallback((vol: number) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [vol] }), "*");
  }, []);

  const cancelYTFade = useCallback(() => {
    if (youtubeFadeIntervalRef.current) { clearInterval(youtubeFadeIntervalRef.current); youtubeFadeIntervalRef.current = null; }
  }, []);

  const fadeOutYT = useCallback((cb?: () => void) => {
    cancelYTFade();
    let cur = 0;
    const step = 100 / FADE_STEPS;
    youtubeFadeIntervalRef.current = setInterval(() => {
      cur++;
      setYouTubeVolume(Math.max(0, 100 - step * cur));
      if (cur >= FADE_STEPS) { cancelYTFade(); setYouTubeVolume(0); cb?.(); }
    }, FADE_INTERVAL);
  }, [cancelYTFade, setYouTubeVolume]);

  const fadeInYT = useCallback(() => {
    cancelYTFade();
    setYouTubeVolume(0);
    let cur = 0;
    const step = 100 / FADE_STEPS;
    youtubeFadeIntervalRef.current = setInterval(() => {
      cur++;
      setYouTubeVolume(Math.min(100, step * cur));
      if (cur >= FADE_STEPS) { cancelYTFade(); setYouTubeVolume(100); }
    }, FADE_INTERVAL);
  }, [cancelYTFade, setYouTubeVolume]);

  // ---- Volume sync ----
  useEffect(() => {
    if (audioRef.current && !fadeIntervalRef.current) audioRef.current.volume = settings.musicVolume;
  }, [settings.musicVolume]);

  // ---- Active queue helper ----
  const getActiveQueue = useCallback(() => {
    return state.activeSource === "downtime" ? downtimeQueue : mainQueue;
  }, [state.activeSource, mainQueue, downtimeQueue]);

  const getActiveLoopMode = useCallback(() => {
    return state.activeSource === "downtime" ? settings.downtimeLoopMode : settings.loopMode;
  }, [state.activeSource, settings.loopMode, settings.downtimeLoopMode]);

  // ---- Track ending ----
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnded = () => {
      // Handle temporary internal playback (Quick Play theme tracks)
      if (state.useTemporary && temporaryInternalQueue.length > 0) {
        const nextIdx = temporaryInternalIndex + 1;
        if (nextIdx < temporaryInternalQueue.length) {
          // Play next in temp rotation
          setTemporaryInternalIndex(nextIdx);
          const track = temporaryInternalQueue[nextIdx];
          audio.src = track.url;
          audio.loop = temporaryInternalQueue.length === 1;
          audio.volume = 0;
          audio.play().catch(() => {});
          fadeIn();
          setState(s => ({ ...s, temporaryIsPlaying: true }));
        } else {
          // Loop back to start (Quick Play always loops)
          setTemporaryInternalIndex(0);
          const track = temporaryInternalQueue[0];
          audio.src = track.url;
          audio.loop = temporaryInternalQueue.length === 1;
          audio.volume = 0;
          audio.play().catch(() => {});
          fadeIn();
          setState(s => ({ ...s, temporaryIsPlaying: true }));
        }
        return;
      }

      const queue = getActiveQueue();
      const loopMode = getActiveLoopMode();

      if (loopMode === "one" && state.currentTrackIndex >= 0) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }

      const nextIndex = state.currentTrackIndex + 1;
      if (nextIndex < queue.length) {
        playQueueAtIndex(nextIndex);
      } else if (loopMode === "queue" && queue.length > 0) {
        playQueueAtIndex(0);
      } else {
        setState(s => ({ ...s, isPlaying: false }));
      }
    };
    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [state.currentTrackIndex, state.activeSource, state.useTemporary, temporaryInternalQueue, temporaryInternalIndex, mainQueue, downtimeQueue, settings.loopMode, settings.downtimeLoopMode]);

  // ---- Queue playback (handles both internal audio & external iframe) ----
  const playQueueAtIndex = useCallback((index: number) => {
    const queue = state.activeSource === "downtime" ? downtimeQueue : mainQueue;
    const track = queue[index];
    if (!track) return;

    const external = isExternalUrl(track.url);

    if (external) {
      // Stop any internal audio
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
      // Load the embed URL into the iframe
      const embedUrl = getEmbedUrl(track.url);
      if (embedUrl && iframeRef.current) {
        iframeRef.current.src = embedUrl;
      }
      setState(s => ({
        ...s, currentTrack: track, currentTrackIndex: index, isPlaying: true,
        useTemporary: false, currentTrackIsExternal: true,
      }));
    } else {
      // Stop iframe if it was playing
      if (iframeRef.current) iframeRef.current.src = "";
      // Play via audio element
      if (!audioRef.current) return;
      audioRef.current.src = track.url;
      audioRef.current.volume = 0;
      audioRef.current.play().catch(console.error);
      fadeIn();
      setState(s => ({
        ...s, currentTrack: track, currentTrackIndex: index, isPlaying: true,
        useTemporary: false, currentTrackIsExternal: false,
      }));
    }
  }, [mainQueue, downtimeQueue, state.activeSource, fadeIn]);

  // ---- Temporary (external) playback ----
  const playTemporaryExternal = useCallback((url: string) => {
    const embedUrl = getEmbedUrl(url);
    if (!embedUrl) return;
    if (isYouTubeUrl(url)) {
      if (iframeRef.current?.contentWindow) {
        setYouTubeVolume(0);
        iframeRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        fadeInYT();
      }
    } else {
      if (iframeRef.current && !iframeRef.current.src) {
        iframeRef.current.src = embedUrl;
      }
    }
    setState(s => ({ ...s, temporaryIsPlaying: true }));
  }, [isYouTubeUrl, setYouTubeVolume, fadeInYT]);

  const pauseTemporaryExternal = useCallback(() => {
    const url = state.temporaryUrl;
    if (!url) return;
    if (isYouTubeUrl(url)) {
      fadeOutYT(() => {
        iframeRef.current?.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      });
    } else {
      if (iframeRef.current) iframeRef.current.src = "";
    }
    setState(s => ({ ...s, temporaryIsPlaying: false }));
  }, [state.temporaryUrl, isYouTubeUrl, fadeOutYT]);

  // ---- Campaign timer state ----
  useEffect(() => {
    const { isRunning, isInCampaign } = campaignState;

    // Ticking
    if (settings.clockTickingEnabled && isRunning && tickingEngineRef.current) {
      tickingEngineRef.current.start();
    } else {
      tickingEngineRef.current?.stop();
    }

    // Skip music management for temporary playback
    if (state.useTemporary) return;

    // Auto-switch between main and downtime queues
    if (settings.playOnlyWhenTimerRunning && settings.downtimeEnabled && isInCampaign) {
      if (isRunning) {
        // Switch to main queue
        if (state.activeSource !== "main") {
          fadeOut(() => { audioRef.current?.pause(); });
          setState(s => ({ ...s, activeSource: "main", isPlaying: false }));
          // Auto-play main queue
          if (mainQueue.length > 0) {
            setTimeout(() => {
              const idx = state.currentTrack && mainQueue.some(q => q.id === state.currentTrack!.id) 
                ? mainQueue.findIndex(q => q.id === state.currentTrack!.id) : 0;
              playQueueAtIndex(Math.max(0, idx));
            }, 100);
          }
        } else if (!state.isPlaying && mainQueue.length > 0) {
          playQueueAtIndex(state.currentTrackIndex >= 0 ? state.currentTrackIndex : 0);
        }
      } else {
        // Switch to downtime queue
        if (state.activeSource !== "downtime") {
          fadeOut(() => { audioRef.current?.pause(); });
          setState(s => ({ ...s, activeSource: "downtime", isPlaying: false }));
          if (downtimeQueue.length > 0) {
            setTimeout(() => playQueueAtIndex(0), 100);
          }
        } else if (!state.isPlaying && downtimeQueue.length > 0) {
          playQueueAtIndex(state.currentTrackIndex >= 0 ? state.currentTrackIndex : 0);
        }
      }
    } else if (settings.playOnlyWhenTimerRunning && !settings.downtimeEnabled) {
      // Only play when timer running, no downtime
      if (isRunning && isInCampaign && !state.isPlaying && mainQueue.length > 0) {
        playQueueAtIndex(state.currentTrackIndex >= 0 ? state.currentTrackIndex : 0);
      } else if (!isRunning && state.isPlaying) {
        fadeOut(() => { audioRef.current?.pause(); });
        setState(s => ({ ...s, isPlaying: false }));
      }
    }

    if (!settings.playOutsideCampaigns && !isInCampaign && state.isPlaying) {
      fadeOut(() => { audioRef.current?.pause(); });
      setState(s => ({ ...s, isPlaying: false }));
    }
  }, [campaignState, settings.playOnlyWhenTimerRunning, settings.downtimeEnabled, settings.playOutsideCampaigns, settings.clockTickingEnabled]);

  // ---- Public API ----
  const play = useCallback(() => {
    if (state.useTemporary) {
      if (temporaryInternalQueue.length > 0 && audioRef.current) {
        audioRef.current.play().catch(() => {});
        fadeIn();
        setState(s => ({ ...s, temporaryIsPlaying: true }));
      } else {
        playTemporaryExternal(state.temporaryUrl);
      }
      return;
    }
    // Resume external track
    if (state.currentTrackIsExternal && state.currentTrack) {
      // Re-load iframe (can't really "resume" an iframe embed)
      const embedUrl = getEmbedUrl(state.currentTrack.url);
      if (embedUrl && iframeRef.current) iframeRef.current.src = embedUrl;
      setState(s => ({ ...s, isPlaying: true }));
      return;
    }
    const queue = getActiveQueue();
    if (state.currentTrack && audioRef.current) {
      audioRef.current.play().catch(() => {});
      fadeIn();
      setState(s => ({ ...s, isPlaying: true }));
    } else if (queue.length > 0) {
      playQueueAtIndex(0);
    } else if (themeTracks.length > 0) {
      // Auto-load theme tracks into main queue
      const items: QueueItem[] = themeTracks.map(t => ({ id: t.id, title: t.title, url: t.url, isInternal: true }));
      setMainQueue(items);
      setState(s => ({ ...s, activeSource: "main" }));
      setTimeout(() => playQueueAtIndex(0), 0);
    }
  }, [state, themeTracks, playQueueAtIndex, fadeIn, playTemporaryExternal, getActiveQueue]);

  const pause = useCallback(() => {
    if (state.useTemporary) { pauseTemporaryExternal(); return; }
    if (state.currentTrackIsExternal) {
      // Stop iframe
      if (iframeRef.current) iframeRef.current.src = "";
      setState(s => ({ ...s, isPlaying: false }));
      return;
    }
    fadeOut(() => { audioRef.current?.pause(); });
    setState(s => ({ ...s, isPlaying: false }));
  }, [state.useTemporary, state.currentTrackIsExternal, pauseTemporaryExternal, fadeOut]);

  const toggle = useCallback(() => {
    if (state.useTemporary) {
      state.temporaryIsPlaying ? pauseTemporaryExternal() : playTemporaryExternal(state.temporaryUrl);
      return;
    }
    state.isPlaying ? pause() : play();
  }, [state, play, pause, playTemporaryExternal, pauseTemporaryExternal]);

  const playQueueItem = useCallback((item: QueueItem, index: number, source?: "main" | "downtime") => {
    if (source && source !== state.activeSource) {
      setState(s => ({ ...s, activeSource: source }));
    }
    const external = isExternalUrl(item.url);

    const doSwitch = () => {
      if (external) {
        // Stop internal audio
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
        const embedUrl = getEmbedUrl(item.url);
        if (embedUrl && iframeRef.current) {
          iframeRef.current.src = embedUrl;
        }
        setState(s => ({
          ...s, currentTrack: item, currentTrackIndex: index, isPlaying: true,
          useTemporary: false, currentTrackIsExternal: true,
          activeSource: source || s.activeSource,
        }));
      } else {
        // Stop iframe
        if (iframeRef.current) iframeRef.current.src = "";
        if (!audioRef.current) return;
        audioRef.current.src = item.url;
        audioRef.current.volume = 0;
        audioRef.current.play().catch(console.error);
        fadeIn();
        setState(s => ({
          ...s, currentTrack: item, currentTrackIndex: index, isPlaying: true,
          useTemporary: false, currentTrackIsExternal: false,
          activeSource: source || s.activeSource,
        }));
      }
    };
    if (state.isPlaying && !external && audioRef.current && !audioRef.current.paused) {
      fadeOut(doSwitch);
    } else if (state.isPlaying && state.currentTrackIsExternal) {
      // Currently playing external, just switch
      doSwitch();
    } else {
      doSwitch();
    }
  }, [state.isPlaying, state.activeSource, state.currentTrackIsExternal, fadeOut, fadeIn]);

  const nextTrack = useCallback(() => {
    const queue = getActiveQueue();
    if (queue.length === 0) return;
    const nextIdx = (state.currentTrackIndex + 1) % queue.length;
    if (state.isPlaying && audioRef.current && !audioRef.current.paused) {
      fadeOut(() => playQueueAtIndex(nextIdx));
    } else {
      playQueueAtIndex(nextIdx);
    }
  }, [getActiveQueue, state.currentTrackIndex, state.isPlaying, fadeOut, playQueueAtIndex]);

  const prevTrack = useCallback(() => {
    const queue = getActiveQueue();
    if (queue.length === 0) return;
    const prevIdx = state.currentTrackIndex <= 0 ? queue.length - 1 : state.currentTrackIndex - 1;
    if (state.isPlaying && audioRef.current && !audioRef.current.paused) {
      fadeOut(() => playQueueAtIndex(prevIdx));
    } else {
      playQueueAtIndex(prevIdx);
    }
  }, [getActiveQueue, state.currentTrackIndex, state.isPlaying, fadeOut, playQueueAtIndex]);

  // Queue management
  const addToMainQueue = useCallback((item: QueueItem) => setMainQueue(q => [...q, item]), []);
  const addToDowntimeQueue = useCallback((item: QueueItem) => setDowntimeQueue(q => [...q, item]), []);
  const removeFromMainQueue = useCallback((index: number) => setMainQueue(q => q.filter((_, i) => i !== index)), []);
  const removeFromDowntimeQueue = useCallback((index: number) => setDowntimeQueue(q => q.filter((_, i) => i !== index)), []);

  const reorderQueue = (queue: QueueItem[], from: number, to: number): QueueItem[] => {
    const arr = [...queue];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    return arr;
  };
  const reorderMainQueue = useCallback((from: number, to: number) => setMainQueue(q => reorderQueue(q, from, to)), []);
  const reorderDowntimeQueue = useCallback((from: number, to: number) => setDowntimeQueue(q => reorderQueue(q, from, to)), []);

  const setMusicVolume = useCallback((vol: number) => setSettings(s => ({ ...s, musicVolume: vol })), []);
  const setTickingVolume = useCallback((vol: number) => setSettings(s => ({ ...s, tickingVolume: vol })), []);
  const updateSettingsFn = useCallback((newSettings: Partial<MusicSettings>) => setSettings(s => ({ ...s, ...newSettings })), []);

  // Temporary playback (external URL via iframe)
  const playTemporary = useCallback((url: string) => {
    // Fade out internal audio without clearing queue
    if (audioRef.current && state.isPlaying) {
      fadeOut(() => { audioRef.current?.pause(); });
    }
    setTemporaryInternalQueue([]);
    setTemporaryInternalIndex(0);
    setState(s => ({
      ...s,
      temporaryUrl: url,
      useTemporary: true,
      temporaryIsPlaying: true,
      isPlaying: false,
    }));
  }, [state.isPlaying, fadeOut]);

  // Temporary playback (internal theme tracks via audioRef, loops by default)
  const playTemporaryInternal = useCallback((tracks: QueueItem[], startIndex = 0) => {
    if (!audioRef.current || tracks.length === 0) return;
    // Fade out current audio if playing
    const startPlayback = () => {
      const track = tracks[startIndex];
      setTemporaryInternalQueue(tracks);
      setTemporaryInternalIndex(startIndex);
      audioRef.current!.src = track.url;
      audioRef.current!.loop = tracks.length === 1; // single track loops itself
      audioRef.current!.volume = 0;
      audioRef.current!.play().catch(console.error);
      fadeIn();
      setState(s => ({
        ...s,
        useTemporary: true,
        temporaryIsPlaying: true,
        temporaryUrl: "",
        isPlaying: false,
      }));
    };
    if (state.isPlaying && audioRef.current && !audioRef.current.paused) {
      fadeOut(startPlayback);
    } else {
      startPlayback();
    }
  }, [state.isPlaying, fadeOut, fadeIn]);

  const clearTemporary = useCallback(() => {
    if (iframeRef.current) iframeRef.current.src = "";
    if (audioRef.current && temporaryInternalQueue.length > 0) {
      audioRef.current.pause();
      audioRef.current.loop = false;
    }
    setTemporaryInternalQueue([]);
    setTemporaryInternalIndex(0);
    setState(s => ({ ...s, temporaryUrl: "", useTemporary: false, temporaryIsPlaying: false }));
  }, [temporaryInternalQueue]);

  const notifyCampaignTimerState = useCallback((isRunning: boolean, isInCampaign: boolean) => {
    setCampaignState({ isRunning, isInCampaign });
  }, []);

  // Embed URL — for temporary external playback OR queue external tracks
  const currentEmbedUrl = state.useTemporary && state.temporaryUrl
    ? getEmbedUrl(state.temporaryUrl)
    : null;
  // Note: queue external tracks set iframe.src directly in playQueueAtIndex/playQueueItem,
  // so we always render the iframe element (hidden).

  return (
    <MusicContext.Provider
      value={{
        state,
        settings,
        themeTracks,
        mainQueue,
        downtimeQueue,
        play,
        pause,
        toggle,
        playQueueItem,
        nextTrack,
        prevTrack,
        setMainQueue,
        setDowntimeQueue,
        addToMainQueue,
        addToDowntimeQueue,
        removeFromMainQueue,
        removeFromDowntimeQueue,
        reorderMainQueue,
        reorderDowntimeQueue,
        setMusicVolume,
        setTickingVolume,
        updateSettings: updateSettingsFn,
        playTemporary,
        playTemporaryInternal,
        clearTemporary,
        pauseTemporary: pauseTemporaryExternal,
        resumeTemporary: () => {
          if (temporaryInternalQueue.length > 0 && audioRef.current) {
            audioRef.current.play().catch(() => {});
            fadeIn();
            setState(s => ({ ...s, temporaryIsPlaying: true }));
          } else {
            playTemporaryExternal(state.temporaryUrl);
          }
        },
        notifyCampaignTimerState,
        getEmbedUrl,
      }}
    >
      {children}
      {currentEmbedUrl && (
        <iframe
          ref={iframeRef}
          src={currentEmbedUrl}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          style={{ position: "fixed", top: -9999, left: -9999, width: 1, height: 1, border: "none", pointerEvents: "none" }}
          tabIndex={-1}
          aria-hidden="true"
        />
      )}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) throw new Error("useMusic must be used within MusicProvider");
  return context;
};
