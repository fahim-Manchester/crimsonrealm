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
}

const STORAGE_KEY = "realm-music-settings";
const STATE_STORAGE_KEY = "realm-music-state";

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

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tickingRef = useRef<HTMLAudioElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const savedExternalUrlRef = useRef<string>("");
  
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

  // Persist state
  useEffect(() => {
    const { isPlaying, externalIsPlaying, ...stateToStore } = state;
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(stateToStore));
  }, [state]);

  // Update volume
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
      if (settings.loopTrack && state.currentTrackIndex >= 0) {
        // Loop the same track
        playTrackAtIndex(state.currentTrackIndex);
      } else if (state.queue.length > 0) {
        const nextIndex = state.currentTrackIndex + 1;
        if (nextIndex < state.queue.length) {
          playTrackAtIndex(nextIndex);
        } else {
          setState(s => ({ ...s, isPlaying: false }));
        }
      }
    };

    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [state.queue, state.currentTrackIndex, settings.loopTrack]);

  // --- External playlist control helpers ---
  const playExternal = useCallback(() => {
    if (!state.externalPlaylistUrl) return;
    const embedUrl = getEmbedUrl(state.externalPlaylistUrl);
    if (!embedUrl) return;

    // For YouTube: use postMessage
    if (state.externalPlaylistUrl.includes("youtube.com") || state.externalPlaylistUrl.includes("youtu.be")) {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
      }
    } else {
      // For Spotify/SoundCloud: restore the src if it was cleared
      if (iframeRef.current && !iframeRef.current.src) {
        iframeRef.current.src = embedUrl;
      }
    }
    setState(s => ({ ...s, externalIsPlaying: true }));
  }, [state.externalPlaylistUrl]);

  const pauseExternal = useCallback(() => {
    if (!state.externalPlaylistUrl) return;

    if (state.externalPlaylistUrl.includes("youtube.com") || state.externalPlaylistUrl.includes("youtu.be")) {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      }
    } else {
      // For Spotify/SoundCloud: clear src to stop playback
      if (iframeRef.current) {
        savedExternalUrlRef.current = iframeRef.current.src;
        iframeRef.current.src = "";
      }
    }
    setState(s => ({ ...s, externalIsPlaying: false }));
  }, [state.externalPlaylistUrl]);

  // Handle campaign timer state changes
  useEffect(() => {
    const { isRunning, isInCampaign } = campaignState;
    
    // Clock ticking sound
    if (settings.clockTickingEnabled && isRunning && tickingRef.current) {
      tickingRef.current.play().catch(() => {});
    } else if (tickingRef.current) {
      tickingRef.current.pause();
      tickingRef.current.currentTime = 0;
    }

    // Auto play/pause for INTERNAL tracks
    if (!state.useExternalPlaylist) {
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
  }, [campaignState, settings, state.currentTrack, state.useExternalPlaylist, state.externalPlaylistUrl, state.isPlaying, state.externalIsPlaying, playExternal, pauseExternal]);

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
      setState(s => ({ ...s, isPlaying: true }));
    } else if (state.queue.length > 0) {
      playTrackAtIndex(0);
    } else if (themeTracks.length > 0) {
      setState(s => ({ ...s, queue: themeTracks }));
      setTimeout(() => playTrackAtIndex(0), 0);
    }
  }, [state.currentTrack, state.queue, state.useExternalPlaylist, themeTracks, playTrackAtIndex, playExternal]);

  const pause = useCallback(() => {
    if (state.useExternalPlaylist) {
      pauseExternal();
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setState(s => ({ ...s, isPlaying: false }));
  }, [state.useExternalPlaylist, pauseExternal]);

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
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setState(s => ({
      ...s,
      externalPlaylistUrl: url,
      useExternalPlaylist: true,
      isPlaying: false,
      externalIsPlaying: true, // auto-play on load
    }));
  }, []);

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

  // Compute the embed URL for the hidden iframe
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
      }}
    >
      {children}
      {/* Persistent hidden iframe for external playlists */}
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
