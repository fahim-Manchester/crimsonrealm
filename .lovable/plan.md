

# Diary Feature Implementation Plan

## Overview
This plan replaces the "Settings" card on the Home dashboard with a new "Diary" feature and moves Settings to a gear icon in the top-right corner of the header. The Diary provides an immersive book-reading experience where users can create books on a shelf, link entries from other modules, write free-form content, and read using a page-flip animation.

---

## Visual Changes Summary

**Home Page Header:**
- Add a gear icon (Settings) to the right of the user email in the navigation bar
- Clicking it navigates to `/settings` (placeholder page for now)

**Dashboard Grid:**
- Replace the grayed-out "Settings" card with a new "Diary" card
- Diary card links to `/diary`

**Diary Page:**
- Displays an empty bookshelf UI where books appear as visual book images
- Each book has three action icons: Edit (link entries), Scribe (write), Read (page-flip view)

---

## Database Schema

Two new tables are required:

### `diary_books` table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | References auth.users |
| title | text | Book name |
| cover_color | text | Color theme for book spine/cover |
| created_at | timestamp | Auto-generated |
| updated_at | timestamp | Auto-updated |

### `diary_entries` table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| book_id | uuid | References diary_books |
| entry_type | text | 'linked' or 'scribed' |
| content | text | Free-form content (for scribed entries) |
| resource_id | uuid | Optional link to resources |
| project_id | uuid | Optional link to projects |
| task_id | uuid | Optional link to tasks |
| campaign_id | uuid | Optional link to campaigns |
| note | text | Personal note for linked entries |
| page_number | int | Page ordering |
| created_at | timestamp | Auto-generated |

RLS policies will be applied to ensure users only access their own books and entries.

---

## New Dependencies

```
react-pageflip
```

This library provides the `HTMLFlipBook` component for the page-turning animation in Read mode.

---

## File Structure

```text
src/
  components/
    diary/
      BookShelf.tsx          # Visual shelf with book items
      BookCard.tsx           # Individual book with 3 action icons
      EditBookDialog.tsx     # Dialog to link entries from other modules
      ScribeBookDialog.tsx   # Free-form writing interface
      ReadBookDialog.tsx     # Page-flip reading experience
    ui/
      book-slider.tsx        # Page-flip component wrapper
  hooks/
    useDiary.ts              # CRUD operations for books and entries
  pages/
    Diary.tsx                # Main diary page with shelf
    Settings.tsx             # Placeholder settings page
```

---

## Implementation Steps

### Step 1: Database Migration
Create the `diary_books` and `diary_entries` tables with appropriate foreign keys and RLS policies restricting access to the authenticated user.

### Step 2: Install react-pageflip
Add the npm dependency for the page-flip animation library.

### Step 3: Create book-slider.tsx Component
A reusable component that wraps `HTMLFlipBook` with gothic styling. Pages are passed as children and rendered with appropriate pagination.

### Step 4: Create useDiary Hook
Handles:
- Fetching all books for the user
- Creating/deleting books
- Fetching entries for a specific book
- Adding linked entries (from Chronicles, Territories, Forge, Campaigns)
- Adding scribed entries (free-form text, splitting on `===` for page breaks)
- Updating entry content

### Step 5: Create BookShelf Component
Displays books in a grid/shelf layout. Each book is rendered as a visual card with:
- Book title on spine
- Color-coded cover
- Three icon buttons: Edit (Pencil), Scribe (Feather/Pen), Read (Book-Open)

### Step 6: Create BookCard Component
Individual book display with hover effects and action icons. Clicking an icon opens the corresponding dialog.

### Step 7: Create EditBookDialog Component
Multi-tab interface to select entries from:
- **Chronicles** (resources)
- **Territories** (projects)
- **Forge** (tasks)
- **Campaign** (campaigns)

Each selected item can have a personal note attached. Saves as `entry_type: 'linked'`.

### Step 8: Create ScribeBookDialog Component
A free-form writing interface with:
- Large textarea for content entry
- Auto-save functionality (debounced)
- Instructions explaining that `===` on an empty line creates a new page
- Parses content on save, splitting by `===` into separate page entries

### Step 9: Create ReadBookDialog Component
Uses the book-slider component to display all entries:
- Linked entries show the item name, type badge, and personal note
- Scribed entries show the free-form content
- Pages can be flipped with mouse drag or arrow buttons

### Step 10: Create Diary.tsx Page
Main page using PageLayout with:
- "Add Book" button to create a new book (prompts for title and color)
- BookShelf component displaying all user books
- Empty state when no books exist

### Step 11: Create Settings.tsx Placeholder Page
Simple page with "Settings coming soon" message, maintaining the gothic aesthetic.

### Step 12: Update Home.tsx
- Add Settings gear icon to header navigation (between email and "Leave Realm" button)
- Replace Settings card with Diary card linking to `/diary`

### Step 13: Update App.tsx Routes
Add new routes:
- `/diary` - Diary page
- `/settings` - Settings placeholder

---

## Technical Considerations

### Page Breaks for Scribed Content
When saving scribed content, the hook splits text on lines containing only `===`:
```typescript
const pages = content.split(/\n===\n/).filter(p => p.trim());
```
Each segment becomes a separate `diary_entries` row with incrementing `page_number`.

### Book Cover Colors
Predefined color palette matching the gothic theme:
- Crimson (`#8B0000`)
- Midnight Blue (`#191970`)
- Forest Green (`#228B22`)
- Gold (`#DAA520`)
- Purple (`#4B0082`)
- Charcoal (`#36454F`)

### Page-Flip Component Styling
The book-slider will use fixed dimensions (400px width x 500px height) with gothic-styled pages featuring parchment textures via CSS.

### Linking Multiple Entries
The Edit dialog allows selecting multiple items across all modules. Each selection creates one `diary_entries` row with the appropriate foreign key set.

---

## Summary
This feature adds a personal journaling system that integrates with all existing modules. Users can document their journey by linking relevant items and writing reflections, then enjoy reading their compiled books with an immersive page-flip experience.

