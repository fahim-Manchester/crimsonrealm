

# Timer Modes: Normal, Chess Clock & Pomodoro

## Overview

Add a **Timer Settings** popover (clock/gear icon) visible both on the Campaign Session page and the Campaigns list page. It exposes three timer modes: **Normal** (current behavior), **Chess Clock** (work/break alternation), and **Pomodoro** (structured work/short break/long break cycles). Settings persist in localStorage so your last config is remembered.

## Timer Modes

### Normal (default)
Exactly how it works now — manual start/pause, no automatic switching.

### Chess Clock
Alternates between **Work** and **Break** periods:
- Configurable work duration (default: 25 min) and break duration (default: 5 min)
- Timer auto-switches between work and break when each period ends
- Visual indicator shows current phase (Work / Break)
- During break, task timer pauses; session timer keeps counting
- Audio cue (short tone) when switching phases

### Pomodoro
Structured cycles with long break support:
- Configurable: work minutes (default: 25), short break (default: 5), long break (default: 15), cycles before long break (default: 4)
- Auto-starts next phase when current one ends
- Shows current phase + cycle count (e.g. "Work 2/4")
- After the configured number of work cycles, triggers a long break instead of short
- Audio cue on phase transitions

## UI Design

### Timer Settings Button
A small icon button (using `Timer` or `Settings2` from lucide) placed:
- **Campaign Session page**: In the header, next to the MusicPlayer button
- **Campaigns list page**: In the page header area

### Timer Settings Popover
A `Popover` (not a dialog — lightweight, non-blocking) containing:

```text
┌─────────────────────────────┐
│ ⏱ Timer Mode                │
│                             │
│ ○ Normal                    │
│ ○ Chess Clock               │
│ ○ Pomodoro                  │
│                             │
│ ─────────────────────────── │
│ (shown when Chess Clock):   │
│ Work:  [25] min             │
│ Break: [ 5] min             │
│                             │
│ (shown when Pomodoro):      │
│ Work:      [25] min         │
│ Short break: [ 5] min       │
│ Long break:  [15] min       │
│ Cycles:      [ 4]           │
└─────────────────────────────┘
```

Uses `RadioGroup` for mode selection, `Input` (type number) for durations.

## Persistence

Settings stored in localStorage under key `timerModeSettings`:
```json
{
  "mode": "normal" | "chess" | "pomodoro",
  "chess": { "workMinutes": 25, "breakMinutes": 5 },
  "pomodoro": { "workMinutes": 25, "shortBreakMinutes": 5, "longBreakMinutes": 15, "cyclesBeforeLongBreak": 4 }
}
```
Loaded on mount, saved on every change. No database needed.

## Implementation

### New Files

| File | Purpose |
|------|---------|
| `src/hooks/useTimerMode.ts` | Hook managing timer mode state, phase transitions, countdown logic, and localStorage persistence |
| `src/components/campaigns/TimerModeSettings.tsx` | Popover UI component with mode selector and config inputs |

### Modified Files

| File | Change |
|------|--------|
| `src/pages/CampaignSession.tsx` | Import & render `TimerModeSettings` in header; integrate `useTimerMode` to auto-pause/resume based on phase; show current phase indicator near the clocks |
| `src/pages/Campaigns.tsx` | Add `TimerModeSettings` button in header for pre-configuring before entering a campaign |
| `src/hooks/useCampaignSession.ts` | No changes — timer modes wrap around the existing `startTimer`/`pauseTimer` calls rather than modifying the core timer logic |

### How modes integrate with existing timer

The `useTimerMode` hook:
1. Accepts `isTimerRunning`, `startTimer`, `pauseTimer` from `useCampaignSession`
2. When a mode is active and timer is running, it runs an internal countdown for the current phase
3. When a phase ends, it calls `pauseTimer()` (for break) or `startTimer()` (for work), plays an audio cue, and advances to the next phase
4. Exposes: `currentPhase` ("work" | "shortBreak" | "longBreak" | null), `phaseTimeRemaining`, `currentCycle`, `totalCycles`
5. The phase countdown is shown as an additional display near the session clocks

