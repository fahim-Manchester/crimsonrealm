import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { THEMES, ThemeTrack } from "@/lib/themes";

export interface MusicSettings {
  playOnlyWhenTimerRunning: boolean;
  playOnlyWhenTimerPaused: boolean;
  playOutsideCampaigns: boolean;
  clockTickingEnabled: boolean;
  volume: number;
  loopTrack: boolean;
}

interface MusicState {
  isPlaying: boolean;
  currentTrack: ThemeTrack | null;
  currentTrackIndex: number;
  queue: ThemeTrack[];
  externalPlaylistUrl: string;
  useExternalPlaylist: boolean;
  externalIsPlaying: boolean;
  playAllMode: boolean;
}

interface MusicContextType {
  state: MusicState;
  settings: MusicSettings;
  themeTracks: ThemeTrack[];
  play: () => void;
  pause: () => void;
  toggle: () => void;
  playTrack: (track: ThemeTrack, index?: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setQueue: (tracks: ThemeTrack[]) => void;
  setVolume: (volume: number) => void;
  updateSettings: (settings: Partial<MusicSettings>) => void;
  setExternalPlaylist: (url: string) => void;
  clearExternalPlaylist: () => void;
  playExternal: () => void;
  pauseExternal: () => void;
  notifyCampaignTimerState: (isRunning: boolean, isInCampaign: boolean) => void;
  getEmbedUrl: (url: string) => string | null;
  setPlayAllMode: (mode: boolean) => void;
}

const STORAGE_KEY = "realm-music-settings";
const STATE_STORAGE_KEY = "realm-music-state";

const FADE_DURATION = 1200;
const FADE_INTERVAL = 20;
const FADE_STEPS = FADE_DURATION / FADE_INTERVAL;

const defaultSettings: MusicSettings = {
  playOnlyWhenTimerRunning: false,
  playOnlyWhenTimerPaused: false,
  playOutsideCampaigns: true,
  clockTickingEnabled: false,
  volume: 0.7,
  loopTrack: true,
};

const defaultState: MusicState = {
  isPlaying: false,
  currentTrack: null,
  currentTrackIndex: -1,
  queue: [],
  externalPlaylistUrl: "",
  useExternalPlaylist: false,
  externalIsPlaying: false,
  playAllMode: false,
};

const MusicContext = createContext<MusicContextType | undefined>(undefined);

function getEmbedUrl(url: string): string | null {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
    const playlistId = url.match(/[?&]list=([^"&?\/\s]+)/)?.[1];
    if (playlistId) {
      return `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&enablejsapi=1`;
    }
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
    }
  }
  if (url.includes("spotify.com")) {
    const match = url.match(/spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
    if (match) {
      return `https://open.spotify.com/embed/${match[1]}/${match[2]}?theme=0`;
    }
  }
  if (url.includes("soundcloud.com")) {
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true`;
  }
  return null;
}

// Pleasant clock ticking sound — soft woodblock/metronome style
function createTickingEngine() {
  let audioCtx: AudioContext | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  function tick() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;

    // Create a short noise burst filtered to sound like a soft wooden tick
    const bufferSize = audioCtx.sampleRate * 0.02; // 20ms
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 8);
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    // Bandpass filter to give it a woody "tok" character
    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1800, t);
    filter.Q.setValueAtTime(2, t);

    // Gentle gain envelope
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.12, t);
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
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
    destroy() {
      this.stop();
      audioCtx?.close();
      audioCtx = null;
    },
  };
}

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tickingEngineRef = useRef<ReturnType<typeof createTickingEngine> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const savedExternalUrlRef = useRef<string>("");
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetVolumeRef = useRef<number>(0.7);
  
  const [settings, setSettings] = useState<MusicSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const [state, setState] = useState<MusicState>(() => {
    try {
      const stored = localStorage.getItem(STATE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultState, ...parsed, isPlaying: false, externalIsPlaying: false };
      }
      return defaultState;
    } catch {
      return defaultState;
    }
  });

  const [campaignState, setCampaignState] = useState({ isRunning: false, isInCampaign: false });

  const themeTracks = THEMES[theme]?.tracks || [];

  // Keep targetVolumeRef in sync
  useEffect(() => {
    targetVolumeRef.current = settings.volume;
  }, [settings.volume]);

  // --- Fade helpers ---
  const cancelFade = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  const fadeOut = useCallback((callback?: () => void) => {
    cancelFade();
    const audio = audioRef.current;
    if (!audio) { callback?.(); return; }

    const startVol = audio.volume;
    if (startVol <= 0) { callback?.(); return; }
    const step = startVol / FADE_STEPS;
    let currentStep = 0;

    fadeIntervalRef.current = setInterval(() => {
      currentStep++;
      const newVol = Math.max(0, startVol - step * currentStep);
      audio.volume = newVol;
      if (currentStep >= FADE_STEPS) {
        cancelFade();
        audio.volume = 0;
        callback?.();
      }
    }, FADE_INTERVAL);
  }, [cancelFade]);

  const fadeIn = useCallback(() => {
    cancelFade();
    const audio = audioRef.current;
    if (!audio) return;

    const target = targetVolumeRef.current;
    audio.volume = 0;
    const step = target / FADE_STEPS;
    let currentStep = 0;

    fadeIntervalRef.current = setInterval(() => {
      currentStep++;
      const newVol = Math.min(target, step * currentStep);
      audio.volume = newVol;
      if (currentStep >= FADE_STEPS) {
        cancelFade();
        audio.volume = target;
      }
    }, FADE_INTERVAL);
  }, [cancelFade]);

  // Initialize audio elements
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = settings.volume;
    }
    if (!tickingEngineRef.current) {
      tickingEngineRef.current = createTickingEngine();
    }
    return () => {
      cancelFade();
      tickingEngineRef.current?.destroy();
    };
  }, []);

  // Persist settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Persist state
  useEffect(() => {
    const { isPlaying, externalIsPlaying, ...stateToStore } = state;
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(stateToStore));
  }, [state]);

  // Update volume (only when not fading)
  useEffect(() => {
    if (audioRef.current && !fadeIntervalRef.current) {
      audioRef.current.volume = settings.volume;
    }
  }, [settings.volume]);

  // Handle track ending
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (state.playAllMode && state.queue.length > 1) {
        // Play All mode: always advance sequentially
        const nextIndex = state.currentTrackIndex + 1;
        if (nextIndex < state.queue.length) {
          fadeInTrackAtIndex(nextIndex);
        } else if (settings.loopTrack) {
          // Wrap around to first track
          fadeInTrackAtIndex(0);
        } else {
          setState(s => ({ ...s, isPlaying: false }));
        }
      } else if (settings.loopTrack && state.currentTrackIndex >= 0) {
        // Single track loop
        fadeInTrackAtIndex(state.currentTrackIndex);
      } else if (state.queue.length > 0) {
        const nextIndex = state.currentTrackIndex + 1;
        if (nextIndex < state.queue.length) {
          fadeInTrackAtIndex(nextIndex);
        } else {
          setState(s => ({ ...s, isPlaying: false }));
        }
      }
    };

    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [state.queue, state.currentTrackIndex, settings.loopTrack, state.playAllMode]);

  // --- YouTube volume control helpers ---
  const isYouTubeUrl = useCallback((url: string) => {
    return url.includes("youtube.com") || url.includes("youtu.be");
  }, []);

  const setYouTubeVolume = useCallback((volume: number) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "setVolume", args: [volume] }),
        "*"
      );
    }
  }, []);

  const youtubeFadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cancelYouTubeFade = useCallback(() => {
    if (youtubeFadeIntervalRef.current) {
      clearInterval(youtubeFadeIntervalRef.current);
      youtubeFadeIntervalRef.current = null;
    }
  }, []);

  const fadeOutYouTube = useCallback((callback?: () => void) => {
    cancelYouTubeFade();
    let currentStep = 0;
    const step = 100 / FADE_STEPS;

    youtubeFadeIntervalRef.current = setInterval(() => {
      currentStep++;
      const newVol = Math.max(0, 100 - step * currentStep);
      setYouTubeVolume(newVol);
      if (currentStep >= FADE_STEPS) {
        cancelYouTubeFade();
        setYouTubeVolume(0);
        callback?.();
      }
    }, FADE_INTERVAL);
  }, [cancelYouTubeFade, setYouTubeVolume]);

  const fadeInYouTube = useCallback(() => {
    cancelYouTubeFade();
    setYouTubeVolume(0);
    let currentStep = 0;
    const step = 100 / FADE_STEPS;

    youtubeFadeIntervalRef.current = setInterval(() => {
      currentStep++;
      const newVol = Math.min(100, step * currentStep);
      setYouTubeVolume(newVol);
      if (currentStep >= FADE_STEPS) {
        cancelYouTubeFade();
        setYouTubeVolume(100);
      }
    }, FADE_INTERVAL);
  }, [cancelYouTubeFade, setYouTubeVolume]);

  // --- External playlist control helpers ---
  const playExternal = useCallback(() => {
    if (!state.externalPlaylistUrl) return;
    const embedUrl = getEmbedUrl(state.externalPlaylistUrl);
    if (!embedUrl) return;

    if (isYouTubeUrl(state.externalPlaylistUrl)) {
      if (iframeRef.current?.contentWindow) {
        setYouTubeVolume(0);
        iframeRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        fadeInYouTube();
      }
    } else {
      if (iframeRef.current && !iframeRef.current.src) {
        iframeRef.current.src = embedUrl;
      }
    }
    setState(s => ({ ...s, externalIsPlaying: true }));
  }, [state.externalPlaylistUrl, isYouTubeUrl, setYouTubeVolume, fadeInYouTube]);

  const pauseExternal = useCallback(() => {
    if (!state.externalPlaylistUrl) return;

    if (isYouTubeUrl(state.externalPlaylistUrl)) {
      fadeOutYouTube(() => {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        }
      });
    } else {
      if (iframeRef.current) {
        savedExternalUrlRef.current = iframeRef.current.src;
        iframeRef.current.src = "";
      }
    }
    setState(s => ({ ...s, externalIsPlaying: false }));
  }, [state.externalPlaylistUrl, isYouTubeUrl, fadeOutYouTube]);

  // Handle campaign timer state changes
  useEffect(() => {
    const { isRunning, isInCampaign } = campaignState;
    
    // Clock ticking sound (separate from music)
    if (settings.clockTickingEnabled && isRunning && tickingEngineRef.current) {
      tickingEngineRef.current.start();
    } else if (tickingEngineRef.current) {
      tickingEngineRef.current.stop();
    }

    // Auto play/pause for INTERNAL tracks
    if (!state.useExternalPlaylist) {
      if (settings.playOnlyWhenTimerRunning) {
        if (isRunning && isInCampaign && !state.isPlaying && state.currentTrack) {
          audioRef.current?.play().catch(() => {});
          fadeIn();
          setState(s => ({ ...s, isPlaying: true }));
        } else if (!isRunning && state.isPlaying) {
          fadeOut(() => {
            audioRef.current?.pause();
          });
          setState(s => ({ ...s, isPlaying: false }));
        }
      }

      if (settings.playOnlyWhenTimerPaused) {
        if (!isRunning && isInCampaign && !state.isPlaying && state.currentTrack) {
          audioRef.current?.play().catch(() => {});
          fadeIn();
          setState(s => ({ ...s, isPlaying: true }));
        } else if (isRunning && state.isPlaying) {
          fadeOut(() => {
            audioRef.current?.pause();
          });
          setState(s => ({ ...s, isPlaying: false }));
        }
      }

      if (!settings.playOutsideCampaigns && !isInCampaign && state.isPlaying) {
        fadeOut(() => {
          audioRef.current?.pause();
        });
        setState(s => ({ ...s, isPlaying: false }));
      }
    }

    // Auto play/pause for EXTERNAL playlists
    if (state.useExternalPlaylist && state.externalPlaylistUrl) {
      if (settings.playOnlyWhenTimerRunning) {
        if (isRunning && isInCampaign && !state.externalIsPlaying) {
          playExternal();
        } else if (!isRunning && state.externalIsPlaying) {
          pauseExternal();
        }
      }

      if (settings.playOnlyWhenTimerPaused) {
        if (!isRunning && isInCampaign && !state.externalIsPlaying) {
          playExternal();
        } else if (isRunning && state.externalIsPlaying) {
          pauseExternal();
        }
      }

      if (!settings.playOutsideCampaigns && !isInCampaign && state.externalIsPlaying) {
        pauseExternal();
      }
    }
  }, [campaignState, settings, state.currentTrack, state.useExternalPlaylist, state.externalPlaylistUrl, state.isPlaying, state.externalIsPlaying, playExternal, pauseExternal, fadeIn, fadeOut]);

  // Play a track at index with fade-in
  const fadeInTrackAtIndex = useCallback((index: number) => {
    const track = state.queue[index];
    if (!track || !audioRef.current) return;

    audioRef.current.src = track.url;
    audioRef.current.volume = 0;
    audioRef.current.play().catch(console.error);
    fadeIn();
    setState(s => ({
      ...s,
      currentTrack: track,
      currentTrackIndex: index,
      isPlaying: true,
    }));
  }, [state.queue, fadeIn]);

  // Direct play (no fade, used internally)
  const playTrackAtIndex = useCallback((index: number) => {
    const track = state.queue[index];
    if (!track || !audioRef.current) return;

    audioRef.current.src = track.url;
    audioRef.current.play().catch(console.error);
    setState(s => ({
      ...s,
      currentTrack: track,
      currentTrackIndex: index,
      isPlaying: true,
    }));
  }, [state.queue]);

  const play = useCallback(() => {
    if (state.useExternalPlaylist) {
      playExternal();
      return;
    }
    
    if (state.currentTrack && audioRef.current) {
      audioRef.current.play().catch(console.error);
      fadeIn();
      setState(s => ({ ...s, isPlaying: true }));
    } else if (state.queue.length > 0) {
      fadeInTrackAtIndex(0);
    } else if (themeTracks.length > 0) {
      setState(s => ({ ...s, queue: themeTracks }));
      setTimeout(() => fadeInTrackAtIndex(0), 0);
    }
  }, [state.currentTrack, state.queue, state.useExternalPlaylist, themeTracks, fadeInTrackAtIndex, playExternal, fadeIn]);

  const pause = useCallback(() => {
    if (state.useExternalPlaylist) {
      pauseExternal();
      return;
    }
    fadeOut(() => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    });
    setState(s => ({ ...s, isPlaying: false }));
  }, [state.useExternalPlaylist, pauseExternal, fadeOut]);

  const toggle = useCallback(() => {
    if (state.useExternalPlaylist) {
      if (state.externalIsPlaying) pauseExternal();
      else playExternal();
      return;
    }
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, state.useExternalPlaylist, state.externalIsPlaying, play, pause, playExternal, pauseExternal]);

  const playTrack = useCallback((track: ThemeTrack, index?: number) => {
    if (!audioRef.current) return;

    const switchToTrack = () => {
      audioRef.current!.src = track.url;
      audioRef.current!.volume = 0;
      audioRef.current!.play().catch(console.error);
      fadeIn();
      setState(s => ({
        ...s,
        currentTrack: track,
        currentTrackIndex: index ?? s.queue.findIndex(t => t.id === track.id),
        isPlaying: true,
        useExternalPlaylist: false,
      }));
    };

    // If currently playing, fade out first then switch
    if (state.isPlaying && audioRef.current && !audioRef.current.paused) {
      fadeOut(switchToTrack);
    } else {
      switchToTrack();
    }
  }, [state.isPlaying, fadeOut, fadeIn]);

  const nextTrack = useCallback(() => {
    if (state.queue.length === 0) return;
    const nextIndex = (state.currentTrackIndex + 1) % state.queue.length;
    
    if (state.isPlaying && audioRef.current && !audioRef.current.paused) {
      fadeOut(() => fadeInTrackAtIndex(nextIndex));
    } else {
      fadeInTrackAtIndex(nextIndex);
    }
  }, [state.queue, state.currentTrackIndex, state.isPlaying, fadeOut, fadeInTrackAtIndex]);

  const prevTrack = useCallback(() => {
    if (state.queue.length === 0) return;
    const prevIndex = state.currentTrackIndex <= 0 ? state.queue.length - 1 : state.currentTrackIndex - 1;
    
    if (state.isPlaying && audioRef.current && !audioRef.current.paused) {
      fadeOut(() => fadeInTrackAtIndex(prevIndex));
    } else {
      fadeInTrackAtIndex(prevIndex);
    }
  }, [state.queue, state.currentTrackIndex, state.isPlaying, fadeOut, fadeInTrackAtIndex]);

  const setQueue = useCallback((tracks: ThemeTrack[]) => {
    setState(s => ({ ...s, queue: tracks }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setSettings(s => ({ ...s, volume }));
  }, []);

  const updateSettings = useCallback((newSettings: Partial<MusicSettings>) => {
    setSettings(s => ({ ...s, ...newSettings }));
  }, []);

  const setPlayAllMode = useCallback((mode: boolean) => {
    setState(s => ({ ...s, playAllMode: mode }));
  }, []);

  const setExternalPlaylist = useCallback((url: string) => {
    if (audioRef.current) {
      fadeOut(() => {
        audioRef.current?.pause();
      });
    }
    setState(s => ({
      ...s,
      externalPlaylistUrl: url,
      useExternalPlaylist: true,
      isPlaying: false,
      externalIsPlaying: true,
    }));
  }, [fadeOut]);

  const clearExternalPlaylist = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = "";
    }
    setState(s => ({
      ...s,
      externalPlaylistUrl: "",
      useExternalPlaylist: false,
      externalIsPlaying: false,
    }));
  }, []);

  const notifyCampaignTimerState = useCallback((isRunning: boolean, isInCampaign: boolean) => {
    setCampaignState({ isRunning, isInCampaign });
  }, []);

  const currentEmbedUrl = state.useExternalPlaylist && state.externalPlaylistUrl 
    ? getEmbedUrl(state.externalPlaylistUrl) 
    : null;

  return (
    <MusicContext.Provider
      value={{
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
        playExternal,
        pauseExternal,
        notifyCampaignTimerState,
        getEmbedUrl,
        setPlayAllMode,
      }}
    >
      {children}
      {currentEmbedUrl && (
        <iframe
          ref={iframeRef}
          src={currentEmbedUrl}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          style={{
            position: "fixed",
            top: -9999,
            left: -9999,
            width: 1,
            height: 1,
            border: "none",
            pointerEvents: "none",
          }}
          tabIndex={-1}
          aria-hidden="true"
        />
      )}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error("useMusic must be used within MusicProvider");
  }
  return context;
};
