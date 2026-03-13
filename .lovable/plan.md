

# Mega Music-Audio System Upgrade

## Scope Summary

This is a large-scale overhaul touching the database, context, UI, and multiple pages. The plan covers all 10 requirements.

## Database Changes

### New table: `saved_music`
Stores user's permanent saved external tracks/playlists.

```sql
CREATE TABLE public.saved_music (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title varchar NOT NULL,
  url varchar NOT NULL,
  type varchar NOT NULL DEFAULT 'track', -- 'track' or 'playlist'
  source_platform varchar, -- 'youtube', 'spotify', 'soundcloud', or null
  description varchar,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_music ENABLE ROW LEVEL SECURITY;
-- Standard CRUD policies for own rows
```

### New table: `music_preferences`
Stores per-user music settings and queues as JSON (single row per user).

```sql
CREATE TABLE public.music_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  settings jsonb NOT NULL DEFAULT '{}',
  main_queue jsonb NOT NULL DEFAULT '[]',
  downtime_queue jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.music_preferences ENABLE ROW LEVEL SECURITY;
-- Standard CRUD policies for own rows
```

## Architecture Overview

```text
┌─────────────────────────────────────────────────┐
│ MusicProvider (wraps entire app in main.tsx)     │
│                                                 │
│  State:                                         │
│  - settings (volume, ticking vol, loop, etc.)   │
│  - mainQueue[] (persistent work queue)           │
│  - downtimeQueue[] (persistent break queue)      │
│  - temporaryPlayback (non-saved direct play)     │
│  - activeSource: 'main'|'downtime'|'temporary'   │
│                                                 │
│  Persistence: Supabase music_preferences table   │
│  (debounced writes, localStorage fallback)       │
│                                                 │
│  Saved Music DB: Supabase saved_music table      │
└─────────────────────────────────────────────────┘

┌──────────────────────────┐
│ Global Floating Player   │ ← Fixed position, all pages
│ (MusicButton + controls) │
└──────────────────────────┘
```

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `src/hooks/useSavedMusic.ts` | CRUD hook for `saved_music` table |
| `src/hooks/useMusicPreferences.ts` | Load/save `music_preferences` from Supabase with debounce + localStorage fallback |
| `src/components/music/MusicQueuePanel.tsx` | Drag-and-drop queue UI (shared between main & downtime queues) |
| `src/components/music/SavedMusicBrowser.tsx` | Browse/select from saved music to add to queues |
| `src/components/music/SaveMusicDialog.tsx` | Dialog to save an external URL with title, type, description |
| `src/components/music/GlobalMusicBar.tsx` | Fixed-position floating music controls visible on all pages |

### Modified Files

| File | Change |
|------|--------|
| `src/contexts/MusicContext.tsx` | Major rewrite: add mainQueue, downtimeQueue, tickingVolume, downtimeEnabled settings; queue switching logic based on timer state; separate temporary playback from saved queues; load/save via `useMusicPreferences`; expose saved music CRUD |
| `src/components/music/MusicPlayer.tsx` | Redesigned dialog with tabs: Now Playing, Main Queue, Downtime Queue, Saved Music, Settings. Each queue has drag-drop reorder, add from saved/internal/external, remove, loop options |
| `src/components/music/MusicButton.tsx` | Minor: also show indicator for downtime playing |
| `src/App.tsx` | Add `GlobalMusicBar` component (rendered inside routes, after auth check) |
| `src/pages/Resources.tsx` | Add special "Music Database" section that renders saved_music items; protect from "Dismantle All"; show confirmation on manual delete |
| `src/hooks/useCleaveDismantle.ts` | `dismantleAllGroups` must skip the music database section (no entry_groups change needed since music DB is its own table, but we add UI protection) |
| `src/pages/Home.tsx` | Remove per-page MusicPlayer (now global) |
| `src/pages/CampaignSession.tsx` | Remove per-page MusicPlayer (now global) |
| `src/components/layout/PageLayout.tsx` | Remove per-page MusicPlayer (now global) |
| `src/pages/Campaigns.tsx` | No MusicPlayer removal needed (wasn't there) |

## Key Behaviors

### Queue System
- **Main Queue**: Items from internal tracks + saved music. Plays during work/timer-on. Drag-and-drop reorder. Loop options: loop queue, loop one, no loop.
- **Downtime Queue**: Same capabilities. Plays during breaks/timer-off when both checkboxes are ON.
- **Temporary Playback**: Paste-and-play external URL without saving. Does NOT touch queues.

### Timer Integration (replaces current `playOnlyWhenTimerRunning` / `playOnlyWhenTimerPaused`)
- "Only play music when timer is on" checkbox (existing, renamed)
- "Add downtime music list" checkbox (new) with tooltip
- When both ON: timer running → main queue; timer paused → downtime queue (crossfade between them)
- When only timer checkbox ON: timer running → main queue; timer paused → silence
- When neither ON: free play from whichever queue/source user chooses

### Settings Model (saved per account)
```typescript
interface MusicSettings {
  musicVolume: number;           // 0-1
  tickingVolume: number;         // 0-1 (NEW - separate from music)
  clockTickingEnabled: boolean;
  loopMode: 'none' | 'queue' | 'one';
  downtimeLoopMode: 'none' | 'queue' | 'one';
  playOnlyWhenTimerRunning: boolean;
  downtimeEnabled: boolean;      // NEW
  playOutsideCampaigns: boolean;
}
```

### Clock Ticking Volume
- Separate slider in settings section
- Ticking engine gain node scaled by `tickingVolume` instead of hardcoded 0.12
- Saved per account

### Saved Music in Chronicles
- Rendered as a visually distinct section at the bottom of the Resources/Chronicles page
- Title adapts to theme (e.g. "Sound Archives" for gothic, "Audio Intel" for neon)
- Add, edit, delete individual items
- "Dismantle All" in Chronicles skips this section entirely
- Manual deletion of the entire section shows a confirmation warning
- Items from saved music can be added to either queue from the music player

### Global Music Access
- Remove `<MusicPlayer />` from individual page headers (Home, PageLayout, CampaignSession)
- Add a `<GlobalMusicBar />` component rendered in `App.tsx` that shows a small fixed-position music button/mini-player in the bottom-right corner on all authenticated pages
- Music continues uninterrupted across page navigation (already works since MusicProvider wraps the app)

### Account-Based Persistence
- On login: fetch `music_preferences` row → hydrate MusicContext state
- On setting/queue change: debounced (2s) write to `music_preferences`
- localStorage used as immediate cache and offline fallback
- On first login with no DB row: create default row

