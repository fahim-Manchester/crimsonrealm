

# Fix Loop Setting & Clock Ticking Sound

## Changes

### 1. Rename "Loop playlist" → "Loop Track" and change behavior
Currently `loopPlaylist` restarts the queue from track 0 when the last track ends. The user wants it to **loop the current single track**.

**`src/contexts/MusicContext.tsx`**:
- Rename setting from `loopPlaylist` to `loopTrack` (update interface, default, all references)
- In the `handleEnded` callback: when `loopTrack` is true, replay the **same track** (`playTrackAtIndex(state.currentTrackIndex)`) instead of advancing to index 0
- When `loopTrack` is false, advance to the next track normally, and stop only if at the end of the queue

**`src/components/music/MusicPlayer.tsx`**:
- Rename the label from "Loop playlist" → "Loop track"
- Update the `onCheckedChange` to use `loopTrack`

### 2. Ensure clock ticking sound works
The ticking logic at line 220-225 looks correct — it plays `tickingRef` when `clockTickingEnabled && isRunning`. The audio file is at `/audio/tick.mp3`. Need to verify this file actually exists and contains audio. If it's empty (the file listing showed it as blank), we need a real ticking sound.

**`public/audio/tick.mp3`**: If empty/missing, we'll source a real clock tick sound (a short looping tick audio file). We can use a free CC0 tick sound from a public source, or generate a simple one.

The ticking audio is **separate from music** — it plays simultaneously via its own `tickingRef` Audio element, controlled independently. This is already wired correctly; we just need to ensure the file has actual audio content.

### 3. File changes summary

| File | Change |
|------|--------|
| `src/contexts/MusicContext.tsx` | Rename `loopPlaylist` → `loopTrack`; change ended handler to replay same track when enabled |
| `src/components/music/MusicPlayer.tsx` | Update label to "Loop track" and setting key |
| `public/audio/tick.mp3` | Verify/replace with a real clock ticking sound file |

