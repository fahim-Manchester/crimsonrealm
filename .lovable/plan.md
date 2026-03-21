

# Add URL Tracks Directly to Queue (Without Saving to Library)

## Problem
Currently, the "Add New" button on Main/Downtime queues forces users through the Save Music Dialog, which always saves to the library first. Users want to paste a YouTube URL and add it directly to a queue without cluttering their saved library.

## Solution
Replace the current "Add New" button behavior with a new inline "Add by URL" flow in `MusicQueuePanel`, and keep "From Library" + "Save to Library" as separate options.

## Changes

### 1. `src/components/music/MusicQueuePanel.tsx`
- Add a new `onAddByUrl` callback prop
- Replace the "Add New" button with an "Add URL" button that calls `onAddByUrl`

### 2. `src/components/music/MusicPlayer.tsx`
- Add state for an inline "Add by URL" panel per queue target (`showAddUrl: "main" | "downtime" | null`)
- When active, show a small inline form (URL input + title input + "Add to Queue" button) inside the queue tab, similar to how `showThemePicker` / `showSavedBrowser` work
- On submit: create a `QueueItem` directly with `id: url-${Date.now()}`, the user-provided title (or auto-extract from URL), and the URL — add it to the target queue with `addToMainQueue` / `addToDowntimeQueue`. No library save.
- Add an optional "Also save to library" checkbox (unchecked by default) that, if checked, also calls `saveItem`
- Keep the existing "From Library" button and flow unchanged

### 3. No database or backend changes needed
Queue items are stored in `music_preferences.main_queue` / `downtime_queue` as JSONB — they already support arbitrary URLs without needing a `saved_music` row.

