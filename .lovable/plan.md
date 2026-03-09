

# Enhanced Landing Page with Scrollable Sections

## Overview

Transform the landing page from a single-screen hero into a scrollable multi-section page. Each section adapts its text and imagery to the active theme. The page background changes from `min-h-screen overflow-hidden` to a scrollable layout.

## New Sections (below existing hero)

### Section 1: "What is Realm?"
- Two-column layout: text left, themed illustration right
- Text explains the app's purpose (productivity + fun) in theme-appropriate language
- Mention PWA installability ("Install on your phone from the home page")
- Right side: a themed SVG/icon composition or styled card mockup (gothic castle, neon grid, fantasy map, executive skyline — built with CSS/Tailwind, no real images needed)

### Section 2: "Key Features" 
- 3-4 feature cards in a grid (icon + title + short description)
- Features: Theme system, Campaigns/Quests, Diary/Journal, AI-powered tools
- All card text pulled from theme labels

### Section 3: "Built for ADHD Minds"
- Centered text section with personality
- Gothic: "Forged for restless souls..."; Neon: "Engineered for chaotic energy..."; Fantasy: "Crafted for wandering minds..."; Executive: "Designed for high-performers..."
- Core message: productivity app for ADHD-minded people and anyone who wants fun in their workflow

### Section 4: "Customize Your Experience"
- Highlight the 4 themes with mini preview cards (reuse color swatches from ThemeSwitcher)
- Mention the palette icon in the top bar
- Theme-aware caption

### Section 5: "Coming Soon" + Video Placeholder
- Embedded video container with placeholder state
- Overlay text: "Tutorial coming soon" / themed equivalent
- Styled to fit the page aesthetic (dark card with play button icon)

## File Changes

### `src/lib/themes.ts`
- Add new label keys to `ThemeLabels`: `landingPurpose`, `landingPurposeDesc`, `landingADHD`, `landingADHDDesc`, `landingThemes`, `landingThemesDesc`, `landingVideoTitle`, `landingVideoDesc`, `landingFeatures` (array-like: 4 feature title+desc pairs as individual keys)
- Populate for all 4 themes

### `src/pages/Index.tsx`
- Remove `overflow-hidden` from root, change to scrollable
- Background becomes fixed/sticky so it persists while scrolling
- Add 5 new sections below the hero with proper spacing, animations, and dividers
- Each section uses `themeConfig.labels` for text
- Video section: an empty `<div>` styled as a 16:9 video container with a play icon and "Coming soon" overlay

### `src/index.css` (minor)
- Add a `scroll-smooth` utility if not present

## Design Notes
- Each section uses `max-w-6xl mx-auto` for consistent width
- Subtle fade-in animations on scroll (CSS `animate-fade-in-up` with intersection observer or just staggered delays)
- Section dividers use the existing `bg-gradient-to-r from-transparent via-border to-transparent` pattern
- "Themed illustrations" will be composed from Lucide icons + styled containers (e.g., a castle icon arrangement for gothic, circuit board for neon, tree/shield for fantasy, chart/building for executive)

