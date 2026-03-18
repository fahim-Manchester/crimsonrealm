

## Fix: Quick Play music not pausing when campaign timer stops

### Problem
In `MusicContext.tsx` line 523, the campaign timer state effect has an early return for temporary (Quick Play) playback:
```js
if (state.useTemporary) return;
```
This means when `playOnlyWhenTimerRunning` is enabled and the timer pauses, Quick Play tracks are completely skipped — no fade-out, no pause.

### Solution
Remove the early return and add temporary playback handling to the timer state effect. When the timer stops and `playOnlyWhenTimerRunning` is on, fade out and pause Quick Play tracks (both internal audio and external iframe). When the timer resumes, resume them.

### Changes: `src/contexts/MusicContext.tsx`

**In the `campaignState` effect (line 512-566):**
1. Replace the `if (state.useTemporary) return;` early return with conditional logic that handles temporary playback pause/resume based on timer state.
2. When timer stops + `playOnlyWhenTimerRunning` + temporary is playing → fade out internal audio or pause external (YouTube fade-out, iframe clear for others).
3. When timer starts + `playOnlyWhenTimerRunning` + temporary was playing → resume internal audio with fade-in or resume external playback.
4. Add `state.useTemporary`, `state.temporaryIsPlaying`, `state.temporaryUrl`, and `temporaryInternalQueue` to the effect's dependency considerations.

