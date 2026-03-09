import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { THEMES, ThemeTrack } from "@/lib/themes";

export interface MusicSettings {
  playOnlyWhenTimerRunning: boolean;
  playOnlyWhenTimerPaused: boolean;
  playOutsideCampaigns: boolean;
  clockTickingEnabled: boolean;
  volume: number;
  loopPlaylist: boolean;
}

interface MusicState {
  isPlaying: boolean;
  currentTrack: ThemeTrack | null;
  currentTrackIndex: number;
  queue: ThemeTrack[];
  externalPlaylistUrl: string;
  useExternalPlaylist: boolean;
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
  // Campaign timer integration
  notifyCampaignTimerState: (isRunning: boolean, isInCampaign: boolean) => void;
}

const STORAGE_KEY = "realm-music-settings";
const STATE_STORAGE_KEY = "realm-music-state";

const defaultSettings: MusicSettings = {
  playOnlyWhenTimerRunning: false,
  playOnlyWhenTimerPaused: false,
  playOutsideCampaigns: true,
  clockTickingEnabled: false,
  volume: 0.7,
  loopPlaylist: true,
};

const defaultState: MusicState = {
  isPlaying: false,
  currentTrack: null,
  currentTrackIndex: -1,
  queue: [],
  externalPlaylistUrl: "",
  useExternalPlaylist: false,
};

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tickingRef = useRef<HTMLAudioElement | null>(null);
  
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
        // Don't auto-play on load
        return { ...defaultState, ...parsed, isPlaying: false };
      }
      return defaultState;
    } catch {
      return defaultState;
    }
  });

  // Campaign state tracking
  const [campaignState, setCampaignState] = useState({ isRunning: false, isInCampaign: false });

  // Get theme tracks
  const themeTracks = THEMES[theme]?.tracks || [];

  // Initialize audio elements
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = settings.volume;
    }
    if (!tickingRef.current) {
      tickingRef.current = new Audio("/audio/tick.mp3");
      tickingRef.current.loop = true;
      tickingRef.current.volume = 0.3;
    }
  }, []);

  // Persist settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Persist state (excluding isPlaying)
  useEffect(() => {
    const { isPlaying, ...stateToStore } = state;
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(stateToStore));
  }, [state]);

  // Update volume when settings change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = settings.volume;
    }
  }, [settings.volume]);

  // Handle track ending
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (state.queue.length > 0) {
        const nextIndex = state.currentTrackIndex + 1;
        if (nextIndex < state.queue.length) {
          playTrackAtIndex(nextIndex);
        } else if (settings.loopPlaylist) {
          playTrackAtIndex(0);
        } else {
          setState(s => ({ ...s, isPlaying: false }));
        }
      }
    };

    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [state.queue, state.currentTrackIndex, settings.loopPlaylist]);

  // Handle campaign timer state changes for auto play/pause
  useEffect(() => {
    const { isRunning, isInCampaign } = campaignState;
    
    // Clock ticking sound
    if (settings.clockTickingEnabled && isRunning && tickingRef.current) {
      tickingRef.current.play().catch(() => {});
    } else if (tickingRef.current) {
      tickingRef.current.pause();
      tickingRef.current.currentTime = 0;
    }

    // Auto play/pause based on settings
    if (state.useExternalPlaylist) return; // Don't control external playlists

    if (settings.playOnlyWhenTimerRunning) {
      if (isRunning && isInCampaign && !state.isPlaying && state.currentTrack) {
        audioRef.current?.play().catch(() => {});
        setState(s => ({ ...s, isPlaying: true }));
      } else if (!isRunning && state.isPlaying) {
        audioRef.current?.pause();
        setState(s => ({ ...s, isPlaying: false }));
      }
    }

    if (settings.playOnlyWhenTimerPaused) {
      if (!isRunning && isInCampaign && !state.isPlaying && state.currentTrack) {
        audioRef.current?.play().catch(() => {});
        setState(s => ({ ...s, isPlaying: true }));
      } else if (isRunning && state.isPlaying) {
        audioRef.current?.pause();
        setState(s => ({ ...s, isPlaying: false }));
      }
    }

    if (!settings.playOutsideCampaigns && !isInCampaign && state.isPlaying) {
      audioRef.current?.pause();
      setState(s => ({ ...s, isPlaying: false }));
    }
  }, [campaignState, settings, state.currentTrack, state.useExternalPlaylist]);

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
    if (state.useExternalPlaylist) return;
    
    if (state.currentTrack && audioRef.current) {
      audioRef.current.play().catch(console.error);
      setState(s => ({ ...s, isPlaying: true }));
    } else if (state.queue.length > 0) {
      playTrackAtIndex(0);
    } else if (themeTracks.length > 0) {
      setState(s => ({ ...s, queue: themeTracks }));
      // Queue will trigger playTrackAtIndex via effect
      setTimeout(() => playTrackAtIndex(0), 0);
    }
  }, [state.currentTrack, state.queue, state.useExternalPlaylist, themeTracks, playTrackAtIndex]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setState(s => ({ ...s, isPlaying: false }));
  }, []);

  const toggle = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const playTrack = useCallback((track: ThemeTrack, index?: number) => {
    if (!audioRef.current) return;

    audioRef.current.src = track.url;
    audioRef.current.play().catch(console.error);
    setState(s => ({
      ...s,
      currentTrack: track,
      currentTrackIndex: index ?? s.queue.findIndex(t => t.id === track.id),
      isPlaying: true,
      useExternalPlaylist: false,
    }));
  }, []);

  const nextTrack = useCallback(() => {
    if (state.queue.length === 0) return;
    const nextIndex = (state.currentTrackIndex + 1) % state.queue.length;
    playTrackAtIndex(nextIndex);
  }, [state.queue, state.currentTrackIndex, playTrackAtIndex]);

  const prevTrack = useCallback(() => {
    if (state.queue.length === 0) return;
    const prevIndex = state.currentTrackIndex <= 0 ? state.queue.length - 1 : state.currentTrackIndex - 1;
    playTrackAtIndex(prevIndex);
  }, [state.queue, state.currentTrackIndex, playTrackAtIndex]);

  const setQueue = useCallback((tracks: ThemeTrack[]) => {
    setState(s => ({ ...s, queue: tracks }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setSettings(s => ({ ...s, volume }));
  }, []);

  const updateSettings = useCallback((newSettings: Partial<MusicSettings>) => {
    setSettings(s => ({ ...s, ...newSettings }));
  }, []);

  const setExternalPlaylist = useCallback((url: string) => {
    // Pause current track
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setState(s => ({
      ...s,
      externalPlaylistUrl: url,
      useExternalPlaylist: true,
      isPlaying: false,
    }));
  }, []);

  const clearExternalPlaylist = useCallback(() => {
    setState(s => ({
      ...s,
      externalPlaylistUrl: "",
      useExternalPlaylist: false,
    }));
  }, []);

  const notifyCampaignTimerState = useCallback((isRunning: boolean, isInCampaign: boolean) => {
    setCampaignState({ isRunning, isInCampaign });
  }, []);

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
        notifyCampaignTimerState,
      }}
    >
      {children}
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
