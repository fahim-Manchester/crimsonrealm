

# Music Player Feature

## Overview
Add a global music player with theme-specific tracks, external playlist support, and campaign timer integration. A music icon in the header opens a popup with controls and settings.

## Architecture

### 1. Music Context (`src/contexts/MusicContext.tsx`)
Global state provider managing:
- Current track, queue, loop mode
- Playback state (playing, paused, volume)
- Settings: `playOnlyWhenTimerRunning`, `playOnlyWhenTimerPaused`, `playOutsideCampaigns`, `clockTickingEnabled`
- External playlist URL
- Persist settings to localStorage

### 2. Theme Tracks (`src/lib/themes.ts`)
Add per-theme track definitions:
```typescript
interface ThemeTrack {
  id: string;
  title: string;
  url: string; // YouTube/embed URL or local audio path
}

// Add to ThemeConfig:
tracks: ThemeTrack[];  // 5 tracks per theme
```

Track themes:
- **Gothic**: Dark ambient, organ, choir (e.g., "Requiem for the Realm", "Shadows Rise")
- **Neon**: Synthwave, cyberpunk beats (e.g., "Grid Runner", "Neon Pulse")  
- **Fantasy**: Celtic, orchestral (e.g., "The Wanderer's Path", "Eldergrove")
- **Executive**: Lo-fi, jazz, focus music (e.g., "Boardroom Focus", "Executive Lounge")

### 3. Music Player Component (`src/components/music/MusicPlayer.tsx`)
Popup dialog with:
- **Now Playing**: Current track with play/pause, skip, progress
- **Track List**: 5 theme tracks + queue controls
- **External Playlist**: URL input for Spotify/YouTube/SoundCloud
- **Settings Toggles**:
  1. Music plays only when campaign timer is running
  2. Music plays only when campaign timer is paused
  3. Music plays outside of campaigns
  4. Clock ticking sounds

### 4. Header Integration
Add `<MusicButton />` to:
- `PageLayout.tsx` (all inner pages)
- `Home.tsx` (dashboard)
- **Not** on `Index.tsx` (landing page)

### 5. Campaign Timer Integration
The MusicContext subscribes to a global campaign timer state:
- Expose `campaignTimerRunning` from a lightweight global store or via custom event
- Auto play/pause music based on user's toggle settings

### 6. Audio Implementation
- Use HTML5 `<audio>` element for theme tracks (placeholder URLs initially)
- External playlists: embed iframe (YouTube/Spotify) with visibility toggle
- Clock ticking: short audio loop triggered on setting

## File Changes

| File | Change |
|------|--------|
| `src/contexts/MusicContext.tsx` | New - global state + Audio API |
| `src/components/music/MusicPlayer.tsx` | New - popup UI |
| `src/components/music/MusicButton.tsx` | New - header trigger icon |
| `src/lib/themes.ts` | Add `tracks` array to each theme |
| `src/components/layout/PageLayout.tsx` | Add MusicButton to nav |
| `src/pages/Home.tsx` | Add MusicButton to nav |
| `src/main.tsx` | Wrap app with MusicProvider |
| `src/index.css` | Optional animation styles |

## UI Design
- Music icon (Lucide `Music`) in header nav between InstallButton and ThemeSwitcher
- Popup: max-w-md, themed card with sections separated by dividers
- Track items: play icon, title, duration
- External URL input with "Load" button
- Toggle switches for each setting

## Technical Notes
- Initial implementation uses placeholder audio URLs (royalty-free ambient tracks or silent files)
- External embed detection: check URL for `spotify.com`, `youtube.com`, `soundcloud.com`
- Clock ticking: ship a small tick.mp3 in `/public/audio/`
- Settings persist in localStorage key `realm-music-settings`

