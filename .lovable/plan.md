

# Replace Placeholder Audio with Real Music Tracks

## Problem
The current track URLs in `themes.ts` are fabricated Pixabay CDN links that don't point to actual audio files. No sound plays when tracks are selected.

## Solution
Replace all 20 track URLs with real, working MP3 files from **Kevin MacLeod's incompetech.com** library (Creative Commons BY 4.0). I've confirmed the direct download URL format works: `https://incompetech.com/music/royalty-free/mp3-royaltyfree/FILENAME.mp3`

## Track Selections

**Gothic / Crimson Realm** (dark, eerie, somber):
| # | Title | File | Vibe |
|---|-------|------|------|
| 1 | Requiem for the Realm | Dark Walk | Dark, uneasy atmosphere |
| 2 | Shadows Rise | Ossuary 1 - A Beginning | Somber horror opening |
| 3 | Cathedral of Souls | Night of Chaos | Chaotic dark ambient |
| 4 | Midnight Vigil | Penumbra | Mysterious, shadowy |
| 5 | The Crimson Hour | The Dread | Pure dread atmosphere |

**Neon / Neon Slayers** (electronic, driving, cyberpunk):
| # | Title | File | Vibe |
|---|-------|------|------|
| 1 | Grid Runner | RetroFuture Dirty | Retro electronic, driving |
| 2 | Neon Pulse | Kick Shock | Electronic pulse |
| 3 | Cyber Chase | Killing Time | Tense electronic |
| 4 | Digital Dawn | Industrial Cinematic | Industrial, intense |
| 5 | Demon Hunters | Volatile Reaction | Aggressive electronic |

**Fantasy / Eldergrove** (celtic, orchestral, adventure):
| # | Title | File | Vibe |
|---|-------|------|------|
| 1 | The Wanderer's Path | Achaidh Cheide | Celtic, mystical |
| 2 | Eldergrove Theme | Arcane | Mystical world music |
| 3 | Tavern Rest | Angevin | Medieval feel |
| 4 | Quest Begins | Artifact | World/adventure |
| 5 | Forest Whispers | Arid Foothills | Atmospheric world |

**Executive / The Pinnacle** (jazz, lofi, focus):
| # | Title | File | Vibe |
|---|-------|------|------|
| 1 | Boardroom Focus | Airport Lounge | Smooth jazz, relaxed |
| 2 | Executive Lounge | Backed Vibes Clean | Clean jazz vibes |
| 3 | Strategic Mind | Backbay Lounge | Lounge jazz |
| 4 | Deep Work | Apero Hour | Calm jazz |
| 5 | The Pinnacle Suite | Jazz Brunch | Bright, professional |

## File Changes

| File | Change |
|------|--------|
| `src/lib/themes.ts` | Replace all 20 fake Pixabay URLs with real incompetech.com direct MP3 links |

## Notes
- All tracks are CC-BY 4.0 by Kevin MacLeod (incompetech.com) -- free for commercial use with attribution
- The existing track titles stay the same -- only the `url` field changes
- No code logic changes needed; the `MusicContext` and `MusicPlayer` already handle playback correctly
- The browser autoplay policy note from the stack overflow hint is relevant: first play must be user-initiated, which is already the case (user clicks play)

