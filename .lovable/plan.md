

# Fix External Playlist Persistence & Timer Integration

## Problems
1. The external playlist iframe lives inside the `MusicPlayer` dialog. Closing the dialog unmounts the iframe, killing audio.
2. The `MusicContext` explicitly skips timer-based auto play/pause logic when `useExternalPlaylist` is true (line 165).

## Solution

### Move iframe to MusicContext (always mounted)
Render the external playlist iframe **inside the MusicContext provider**, not the dialog. This keeps it mounted regardless of whether the dialog is open. The iframe will be rendered off-screen (visually hidden) so it persists across dialog open/close.

### Add iframe control via postMessage API
For YouTube embeds, use the [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference) to programmatically play/pause. For Spotify/SoundCloud, the embed URLs already support `autoplay` — we can control them by toggling the iframe `src` (set src to pause, restore to play).

Simpler approach: use a **ref to the iframe element** rendered in the provider, and control YouTube via postMessage:
- `iframeRef.current.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*')` 
- `iframeRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*')`

For Spotify/SoundCloud, we can't easily control via postMessage, so we'll document that timer-based control works best with YouTube. For Spotify, we can mute/unmute the iframe as a workaround (set volume to 0 / restore).

### Apply timer settings to external playlists
Remove the `if (state.useExternalPlaylist) return;` guard on line 165. Instead, when timer settings trigger pause/play, call the appropriate iframe control method.

## File Changes

| File | Change |
|------|--------|
| `src/contexts/MusicContext.tsx` | Add hidden iframe rendering in provider JSX; add `iframeRef`; add `pauseExternal()`/`playExternal()` helpers using postMessage; remove the `useExternalPlaylist` early-return in the timer effect; apply timer logic to external playlists |
| `src/components/music/MusicPlayer.tsx` | Remove the inline iframe from the dialog; instead show a status indicator ("External playlist active — playing in background"); keep the URL input + Load/Clear buttons |

## Key Details
- YouTube iframe URLs get `&enablejsapi=1` appended for postMessage control
- The hidden iframe in MusicContext uses `position: fixed; top: -9999px; width: 1px; height: 1px;` to stay off-screen but mounted
- Spotify embeds: append `&autoplay=1` when playing, swap src to empty when pausing
- State `isPlaying` now tracks external playlist status too, enabling consistent timer integration

