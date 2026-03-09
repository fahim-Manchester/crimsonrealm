

# Improve Fade Transitions for External Playlists & Slow Down Duration

## Current State

- **Fade duration**: 500ms (`FADE_DURATION = 500` on line 50)
- **YouTube control**: Uses `postMessage` to send `playVideo`/`pauseVideo` commands instantly (no fade)
- **Spotify/SoundCloud**: Paused by clearing the iframe `src` (also instant)

## Problem

YouTube audio cuts abruptly when timer-triggered pause/resume happens. The fade is too fast to notice.

## Solution

### 1. Increase fade duration
Change from 500ms to **1200ms** — slow enough to be noticeable, fast enough not to feel sluggish.

### 2. Add YouTube volume fade via postMessage
YouTube's iframe API supports `setVolume(0-100)` commands. We can ramp volume similarly to internal tracks:

**Fade out YouTube:**
- Ramp volume from 100 → 0 over 1200ms using `setInterval`
- After reaching 0, send `pauseVideo` command

**Fade in YouTube:**
- Send `playVideo` command
- Ramp volume from 0 → 100 over 1200ms

### 3. Spotify/SoundCloud limitation
These don't expose volume control via iframe API, so they'll continue with instant pause. We can add a small delay before clearing src to feel less abrupt, but true fading isn't possible.

## File Changes

| File | Change |
|------|--------|
| `src/contexts/MusicContext.tsx` | Increase `FADE_DURATION` to 1200ms; create `fadeOutYouTube` and `fadeInYouTube` helpers using `setVolume` postMessage; update `playExternal`/`pauseExternal` to use these fades when URL is YouTube |

## Implementation Detail

```typescript
// YouTube volume control via postMessage
const setYouTubeVolume = (volume: number) => {
  iframeRef.current?.contentWindow?.postMessage(
    JSON.stringify({ event: "command", func: "setVolume", args: [volume] }),
    "*"
  );
};

// fadeOutYouTube: ramp 100 → 0, then pauseVideo
// fadeInYouTube: playVideo, then ramp 0 → 100
```

