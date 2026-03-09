# Audio Fade Transitions & Play All + Loop Track Behavior

## Changes  
  
0. Also change the ticking sound effect to something more pleasant please like normal clock ticking sounds instead of this weird beep. The sound should feel a bit like a metronome but at the rate of a clock here.  It should feel pleasant, not annoying.

### 1. Audio fade in/out (internal tracks only)

Add fade helpers that use `audioRef.current.volume` ramping over ~500ms:

- `**fadeOut(callback)**`: Ramp volume from current to 0 over 500ms, then call callback (pause, switch track, etc.)
- `**fadeIn()**`: Set volume to 0, play, ramp to `settings.volume` over 500ms

Apply fades to:

- Timer-triggered pause/play (campaign state changes)
- Manual pause/play toggle
- Track switching (manual selection, next/prev, auto-advance on track end)
- When `handleEnded` fires and advances to next track, crossfade by starting new track at vol 0 and fading in

External playlists (YouTube/Spotify) can't be volume-controlled from JS, so fades only apply to internal library tracks.

### 2. Play All + Loop Track interaction

Current behavior: `loopTrack` = replay same track forever. But when "Play All" was used (queue has all theme tracks), the user wants sequential playback with wrap-around.

New `handleEnded` logic:

- **loopTrack ON + queue has multiple tracks (Play All)**: advance to next track; after the last track, wrap to index 0 (infinite sequential loop of the full queue)
- **loopTrack ON + single track selected (not Play All)**: replay the same track (current behavior)
- **loopTrack OFF**: advance to next track; stop after the last one

Detection: if `queue.length > 1`, treat as "Play All" mode. If `queue.length <= 1` or the user clicked a single track without Play All, treat as single-track mode.

To distinguish: when user clicks a single track, we still `setQueue(themeTracks)` (line 166). So we need a new state flag `playAllMode: boolean` set to `true` by `handleLoadThemeTracks` and `false` when user clicks an individual track.

### 3. File changes


| File                                   | Change                                                                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/contexts/MusicContext.tsx`        | Add `fadeIn`/`fadeOut` helpers; wrap all play/pause/switch calls with fades; add `playAllMode` to state; update `handleEnded` logic for Play All + Loop Track combo |
| `src/components/music/MusicPlayer.tsx` | Set `playAllMode: false` when clicking individual track; `handleLoadThemeTracks` sets `playAllMode: true` via new context method                                    |


### 4. Fade implementation detail

```text
fadeOut (500ms):
  current volume → 0 via setInterval(20ms steps)
  on complete: execute callback (pause / switch src)

fadeIn (500ms):
  set volume = 0
  play()
  0 → target volume via setInterval(20ms steps)
```

Using `setInterval` with 20ms steps = 25 steps over 500ms for smooth ramping. Store interval ID in a ref to cancel if interrupted.