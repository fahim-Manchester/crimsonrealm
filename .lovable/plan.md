

# Add Loop Mode Toggle to Quick Play

## What changes

Currently, Quick Play always loops (the entire internal track list wraps around, and external URLs replay indefinitely). We'll add a loop mode selector — matching the Main/Downtime queues' `none | queue | one` pattern — so users can choose no loop, loop the queue, or loop one track.

## Changes

### 1. `src/contexts/MusicContext.tsx`
- Add `temporaryLoopMode: "none" | "queue" | "one"` to `MusicSettings` (default: `queue` to preserve current behavior)
- In the `handleEnded` callback for temporary internal tracks (~line 400):
  - If `temporaryLoopMode === "one"`: replay the same track (set `audio.loop = true`)
  - If `temporaryLoopMode === "queue"`: current behavior (advance + wrap)
  - If `temporaryLoopMode === "none"`: advance but stop after last track (call `clearTemporary`)
- For external YouTube temporary playback: when YouTube video ends, respect the loop mode (currently it auto-replays via embed param `loop=1` — conditionally include that param based on setting)
- Set `audio.loop = (temporaryLoopMode === "one")` when starting temporary internal tracks

### 2. `src/components/music/MusicPlayer.tsx`
- In the Quick Play tab's active playback indicator section (~line 378), add a loop mode cycle button (reuse the same pattern as `MusicQueuePanel`'s loop button)
- Replace the hardcoded "Looping" text with the current loop mode label
- Button cycles through: No Loop → Loop Queue → Loop One

### 3. `src/hooks/useMusicPreferences.ts`
- No changes needed — `settings` is already stored as `Record<string, any>`, so the new key persists automatically

