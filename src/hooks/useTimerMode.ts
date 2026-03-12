import { useState, useEffect, useRef, useCallback } from "react";

export type TimerMode = "normal" | "chess" | "pomodoro";
export type TimerPhase = "work" | "shortBreak" | "longBreak" | null;

export interface ChessSettings {
  workMinutes: number;
  breakMinutes: number;
}

export interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  cyclesBeforeLongBreak: number;
}

export interface TimerModeSettings {
  mode: TimerMode;
  chess: ChessSettings;
  pomodoro: PomodoroSettings;
}

const DEFAULT_SETTINGS: TimerModeSettings = {
  mode: "normal",
  chess: { workMinutes: 25, breakMinutes: 5 },
  pomodoro: { workMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, cyclesBeforeLongBreak: 4 },
};

const STORAGE_KEY = "timerModeSettings";

function loadSettings(): TimerModeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: TimerModeSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

interface UseTimerModeParams {
  isTimerRunning: boolean;
  startTimer: () => void;
  pauseTimer: () => void;
}

export function useTimerMode({ isTimerRunning, startTimer, pauseTimer }: UseTimerModeParams) {
  const [settings, setSettings] = useState<TimerModeSettings>(loadSettings);
  const [currentPhase, setCurrentPhase] = useState<TimerPhase>(null);
  const [phaseTimeRemaining, setPhaseTimeRemaining] = useState(0);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [isPhaseActive, setIsPhaseActive] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef(currentPhase);
  const cycleRef = useRef(currentCycle);
  const settingsRef = useRef(settings);

  phaseRef.current = currentPhase;
  cycleRef.current = currentCycle;
  settingsRef.current = settings;

  // Persist settings on change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((partial: Partial<TimerModeSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  const updateChessSettings = useCallback((partial: Partial<ChessSettings>) => {
    setSettings(prev => ({ ...prev, chess: { ...prev.chess, ...partial } }));
  }, []);

  const updatePomodoroSettings = useCallback((partial: Partial<PomodoroSettings>) => {
    setSettings(prev => ({ ...prev, pomodoro: { ...prev.pomodoro, ...partial } }));
  }, []);

  const playPhaseSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch { /* audio not available */ }
  }, []);

  const getPhaseSeconds = useCallback((phase: TimerPhase): number => {
    const s = settingsRef.current;
    switch (phase) {
      case "work":
        return s.mode === "chess" ? s.chess.workMinutes * 60 : s.pomodoro.workMinutes * 60;
      case "shortBreak":
        return s.mode === "chess" ? s.chess.breakMinutes * 60 : s.pomodoro.shortBreakMinutes * 60;
      case "longBreak":
        return s.pomodoro.longBreakMinutes * 60;
      default:
        return 0;
    }
  }, []);

  const advancePhase = useCallback(() => {
    const s = settingsRef.current;
    const phase = phaseRef.current;

    playPhaseSound();

    if (s.mode === "chess") {
      if (phase === "work") {
        // Switch to break → pause task timer
        pauseTimer();
        setCurrentPhase("shortBreak");
        setPhaseTimeRemaining(getPhaseSeconds("shortBreak"));
      } else {
        // Switch to work → resume task timer
        startTimer();
        setCurrentPhase("work");
        setPhaseTimeRemaining(getPhaseSeconds("work"));
      }
    } else if (s.mode === "pomodoro") {
      if (phase === "work") {
        const cycle = cycleRef.current;
        if (cycle >= s.pomodoro.cyclesBeforeLongBreak) {
          // Long break
          pauseTimer();
          setCurrentPhase("longBreak");
          setPhaseTimeRemaining(getPhaseSeconds("longBreak"));
          setCurrentCycle(1);
        } else {
          // Short break
          pauseTimer();
          setCurrentPhase("shortBreak");
          setPhaseTimeRemaining(getPhaseSeconds("shortBreak"));
        }
      } else {
        // Break ended → start work
        if (phase === "shortBreak") {
          setCurrentCycle(prev => prev + 1);
        }
        startTimer();
        setCurrentPhase("work");
        setPhaseTimeRemaining(getPhaseSeconds("work"));
      }
    }
  }, [pauseTimer, startTimer, playPhaseSound, getPhaseSeconds]);

  // Start phase tracking when timer starts and mode is not normal
  const startPhaseTracking = useCallback(() => {
    if (settings.mode === "normal") return;
    if (!currentPhase) {
      setCurrentPhase("work");
      setPhaseTimeRemaining(getPhaseSeconds("work"));
    }
    setIsPhaseActive(true);
  }, [settings.mode, currentPhase, getPhaseSeconds]);

  const stopPhaseTracking = useCallback(() => {
    setIsPhaseActive(false);
  }, []);

  const resetPhases = useCallback(() => {
    setCurrentPhase(null);
    setPhaseTimeRemaining(0);
    setCurrentCycle(1);
    setIsPhaseActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // React to timer running state
  useEffect(() => {
    if (settings.mode === "normal") return;

    if (isTimerRunning) {
      startPhaseTracking();
    } else {
      stopPhaseTracking();
    }
  }, [isTimerRunning, settings.mode, startPhaseTracking, stopPhaseTracking]);

  // Countdown interval
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Phase active means we're counting down (both during work AND during breaks)
    const shouldCount = isPhaseActive || (currentPhase && currentPhase !== "work" && settings.mode !== "normal");

    if (!shouldCount || !currentPhase) return;

    intervalRef.current = setInterval(() => {
      setPhaseTimeRemaining(prev => {
        if (prev <= 1) {
          advancePhase();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPhaseActive, currentPhase, settings.mode, advancePhase]);

  // Reset phases when mode changes
  useEffect(() => {
    resetPhases();
  }, [settings.mode, resetPhases]);

  return {
    settings,
    currentPhase,
    phaseTimeRemaining,
    currentCycle,
    totalCycles: settings.pomodoro.cyclesBeforeLongBreak,
    updateSettings,
    updateChessSettings,
    updatePomodoroSettings,
    resetPhases,
  };
}
