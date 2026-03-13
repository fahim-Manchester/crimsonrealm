

# Quick Play Theme Tracks + Add New Music Button

## Two Changes

### 1. Quick Play Tab — Add Theme Track Selection & Looping

Currently the Quick Play tab only has an external URL input. We'll add:

- A **theme tracks section** listing individual tracks from the current theme, each clickable to play temporarily
- An **"All [Theme] Music"** button that plays all theme tracks in rotation as temporary playback (loops by default)
- Quick play will **loop by default** — whatever is selected repeats until cleared
- The external URL input remains as-is below the theme section

The temporary playback system in MusicContext already supports internal tracks via `audioRef`. We'll extend `playTemporary` to accept an internal track (or set of tracks) so Quick Play can use theme music without touching the queues. This means adding a `playTemporaryInternal` method that loads a track into `audioRef` in "temporary" mode (loop enabled, queues untouched).

For "All Theme Music" rotation, we'll store a temporary internal playlist in state and auto-advance through it on track end.

### 2. "+Add New Music" Button in Queue Panels

Add a third button to `MusicQueuePanel` alongside "Theme Tracks" and "From Library":

- **"+ Add New"** button that opens the `SaveMusicDialog` to save a new external track/playlist
- On first save ever, show a confirmation dialog explaining that a Music Database section will be created in Chronicles
- After confirmation (or if music DB already has items), save the track and add it to the current queue
- The "first time" check: simply check if `savedItems.length === 0` before saving

A new `onAddNew` callback prop on `MusicQueuePanel` triggers this flow in `MusicPlayer.tsx`.

## File Changes

| File | Change |
|------|--------|
| `src/contexts/MusicContext.tsx` | Add `playTemporaryInternal(tracks: QueueItem[], startIndex?: number)` method + `temporaryInternalQueue` state + auto-advance logic for temp internal tracks + default loop for temp playback |
| `src/components/music/MusicPlayer.tsx` | Redesign Quick Play tab: add theme track list, "All Theme Music" button, keep external URL input. Add first-time music DB confirmation dialog. Wire `onAddNew` to queue panels. |
| `src/components/music/MusicQueuePanel.tsx` | Add `onAddNew` prop and render a third "+ Add New" button |

## Quick Play Tab Layout

```text
┌─────────────────────────────────┐
│ 🎵 Theme Tracks                │
│                                 │
│  ▶ Crimson Requiem              │
│  ▶ Cathedral of Shadows         │
│  ▶ Blood Moon Sonata            │
│  ...                            │
│                                 │
│  [ Play All Theme Music ]       │
│                                 │
│ ─────────────────────────────── │
│ Or paste an external link:      │
│ [_________________________] [▶] │
│                                 │
│ ⟳ Looping (on by default)      │
│                                 │
│ [Save to Library]               │
└─────────────────────────────────┘
```

## First-Time Music DB Flow

When user clicks "+ Add New" in a queue panel:
1. Check if `savedItems.length === 0`
2. If yes → show AlertDialog: "This will create a Music Database in your [Chronicles section name]. Proceed?"
3. On confirm → open SaveMusicDialog
4. On save → item saved to DB, also added to the queue
5. If savedItems already exist → skip confirmation, go straight to SaveMusicDialog

