

# Fix YouTube Playback + Upload Tab Visibility

## Issue 1: YouTube Audio Dies After a Few Seconds

**Root cause**: In `MusicContext.tsx` line 786, the iframe has `src={currentEmbedUrl || ""}` as a React prop. When queue tracks play, `playQueueAtIndex` sets `iframeRef.current.src` imperatively, but `currentEmbedUrl` is `null` for queue tracks. On the next React re-render (triggered by state changes like `isPlaying: true`), React overwrites the iframe `src` back to `""`, killing the YouTube embed.

**Fix**: Remove the `src` prop from the iframe entirely. Instead, manage the iframe src imperatively everywhere — set it in `playQueueAtIndex` (already done), and set it in a `useEffect` for temporary external playback (replacing the declarative prop). This prevents React re-renders from clearing the iframe.

## Issue 2: Upload Tab Not Accessible From Queue Panels

The `SaveMusicDialog` already has upload tab logic, and `onUpload` is passed from `MusicPlayer.tsx`. However, the user wants upload capability to be more prominent/accessible directly from the Main and Downtime queue sections. The current flow requires clicking "+Add New" which opens the save dialog with tabs.

The issue is that the `SaveMusicDialog` tabs for URL/Upload are working but may not be obvious. I'll verify the wiring is correct and ensure the upload tab renders properly in both the MusicPlayer queue context and the Resources page.

## File Changes

| File | Change |
|------|--------|
| `src/contexts/MusicContext.tsx` | Remove `src` prop from iframe, manage temporary URL via `useEffect` imperatively |
| `src/components/music/SaveMusicDialog.tsx` | Minor: ensure Upload tab always shows when `onUpload` is provided (already correct, but will verify rendering) |

The key fix is a small but critical change: removing `src={currentEmbedUrl || ""}` from the iframe element and using a `useEffect` to set it for temporary playback only.

