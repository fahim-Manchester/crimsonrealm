

# Multi-Theme System for Crimson Realm

## Scope Assessment

This is a large feature touching nearly every file in the app. I recommend implementing it in **3 phases** across multiple messages to keep changes manageable and testable. This plan covers **Phase 1: Foundation + Theme Switcher UI**, which is the critical infrastructure. Phases 2-3 (full text mapping + per-page polish) follow after.

## The 4 Themes

| Theme ID | Label | Personality | Color Palette | Font Pairing | Background Vibe |
|----------|-------|-------------|---------------|-------------|-----------------|
| `gothic` | **Crimson Realm** (default) | Dark, atmospheric, mysterious | Deep blacks, crimson, stone gray | Cinzel + Crimson Text | Dark castle/fog |
| `neon` | **Neon Slayers** | Edgy, vibrant, demon-hunter energy | Deep purple/black, hot pink, electric cyan | Orbitron + Rajdhani | Neon cityscape / dark urban |
| `fantasy` | **Eldergrove** | Classic fantasy, warm adventure | Forest green, gold, warm brown, parchment | MedievalSharp + Lora | Enchanted forest / tavern map |
| `executive` | **The Pinnacle** | Sleek, powerful, luxurious | Navy, gold, marble white, charcoal | Playfair Display + Inter | Skyline / marble texture |

## Text Label Mapping (examples)

| Concept | Gothic | Neon | Fantasy | Executive |
|---------|--------|------|---------|-----------|
| App name | REALM | REALM | REALM | REALM |
| Home | Crimson Keep | Neon Hub | The Tavern | The Boardroom |
| Resources | Chronicles | Intel Files | Scrolls | Briefs |
| Tasks | The Forge | Hit List | Quests | Action Items |
| Projects | Territories | Operations | Lands | Portfolios |
| Campaigns | Campaigns | Raids | Adventures | Sprints |
| Achievements | Achievements | Trophies | Honors | Milestones |
| Diary | Diary | Logs | Journal | Memos |
| Codex | The Codex | Field Manual | Lore Book | Handbook |
| Logout | Leave Realm | Log Off | Depart | Sign Out |
| Welcome subtitle | The Keep stands ready | Systems online. Ready to deploy. | The hearth is warm. Choose your path. | Your empire awaits. |

## Architecture

```text
src/
├── contexts/
│   └── ThemeContext.tsx        ← React context + provider, reads/writes localStorage
├── lib/
│   └── themes.ts              ← Theme definitions: colors, labels, fonts, bg keys
├── components/theme/
│   └── ThemeSwitcher.tsx       ← Dialog with 4 theme preview cards
├── assets/
│   ├── gothic-hero-bg.jpg      (existing)
│   ├── neon-hero-bg.jpg        (generated gradient/pattern via CSS)
│   ├── fantasy-hero-bg.jpg     (generated gradient/pattern via CSS)
│   └── executive-hero-bg.jpg   (generated gradient/pattern via CSS)
```

For backgrounds: since we can't add real image assets in code, each non-gothic theme will use **rich CSS gradients** that evoke the right mood (neon city glow, forest canopy, marble/steel). The gothic theme keeps its existing `gothic-hero-bg.jpg`.

## Phase 1 Plan (this message)

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/themes.ts` | All theme definitions: CSS variables, label maps, font imports, background CSS |
| `src/contexts/ThemeContext.tsx` | React context providing current theme + setter, persists to localStorage |
| `src/components/theme/ThemeSwitcher.tsx` | Dialog with 4 theme preview cards, current highlighted |

### Files to Modify

| File | Change |
|------|---------|
| `src/index.css` | Add Google Font imports for all 4 themes; keep existing gothic as default |
| `src/main.tsx` | Wrap app in `ThemeProvider` |
| `src/pages/Index.tsx` | Add theme switcher button in header; use theme context for labels + background |
| `src/pages/Home.tsx` | Add theme switcher button in header; use theme context for labels + background |
| `src/pages/Auth.tsx` | Use theme context for background + flavor text |
| `src/components/layout/PageLayout.tsx` | Use theme context for background, nav labels, logout text |

### How It Works

1. **`ThemeProvider`** wraps the entire app. On mount, reads `realm-theme` from localStorage (default: `gothic`). Exposes `{ theme, themeConfig, setTheme }`.

2. **`themes.ts`** exports a `THEMES` object keyed by theme ID. Each entry contains:
   - `cssVariables`: object of CSS custom property overrides (colors)
   - `labels`: the full text mapping (home name, section names, flavor text)
   - `fonts`: heading + body font family strings
   - `backgroundStyle`: CSS for the page background (image URL or gradient)
   - `displayName`, `description`, `previewColors` (for the switcher cards)

3. **`ThemeProvider`** applies the active theme's CSS variables to `document.documentElement.style` on theme change. This means all existing Tailwind classes (`bg-primary`, `text-foreground`, etc.) automatically pick up the new colors.

4. **`ThemeSwitcher`** renders a dialog triggered by a palette icon button. Shows 4 cards with color preview swatches, theme name, and short description. Active theme has a highlighted border.

5. **Pages** use `useTheme()` hook to get `themeConfig.labels` for text and `themeConfig.backgroundStyle` for backgrounds. The gothic background image import stays as a fallback.

### Color Palettes (CSS Variable Overrides)

**Neon Slayers:**
- `--background`: deep purple-black (270 15% 6%)
- `--primary`: hot pink (330 90% 55%)
- `--accent`: electric cyan (185 90% 50%)
- `--card`: dark purple (270 12% 10%)
- `--muted-foreground`: cool lavender
- Background: radial gradient with neon pink/cyan glow spots on dark

**Eldergrove:**
- `--background`: deep forest (150 20% 8%)
- `--primary`: warm gold (42 80% 55%)
- `--accent`: emerald (150 60% 40%)
- `--card`: dark wood brown (30 15% 12%)
- `--muted-foreground`: warm sage
- Background: gradient with deep greens and warm amber light

**The Pinnacle:**
- `--background`: near-black navy (220 20% 8%)
- `--primary`: rich gold (45 85% 55%)
- `--accent`: steel blue (210 30% 50%)
- `--card`: charcoal (220 15% 12%)
- `--muted-foreground`: silver gray
- Background: subtle gradient with navy-to-charcoal, hint of gold

## Phases 2-3 (future messages)

- **Phase 2**: Apply `themeConfig.labels` to all page titles, subtitles, card descriptions, toasts, PageLayout props, and Codex content
- **Phase 3**: Polish — theme-specific button/card class variants, campaign page theming, campaign session page, AI prompt personality hints per theme

