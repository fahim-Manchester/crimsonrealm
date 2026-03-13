
# Fix: Mobile PWA Layout -- Cramped UI and Overflow Issues

## Problem

When running as a PWA on mobile (standalone mode), several screens have layout issues:

1. **Campaign Session page (screenshot 4)**: The 4 clocks in a row (`grid-cols-4`) are too cramped on small screens -- labels like "CAMPAIGN TOTAL" and "CURRENT TASK" overflow their boxes, and time values like "01:17:34" get cut off.

2. **Campaign Cards (screenshots 2-3)**: The action buttons (edit, pause, play, complete, delete, refresh) all sit in one row next to the campaign title, causing the title to wrap excessively and buttons to feel cramped.

3. **Quest Items (screenshot 4)**: Items like "Dishes POP..." and "Coo..." are truncated too aggressively because the row has too many inline elements (grip + icon + bookmark + name + badge + time + edit button + status).

4. **Home page header (screenshot 1)**: "REALM", settings icon, install checkmark, and "Leave Realm" button are tight but functional -- minor improvement possible.

## Solution

### 1. SessionClock -- Responsive sizing for small screens

**File: `src/components/campaigns/SessionClock.tsx`**

- Reduce padding on mobile: `p-2 md:p-6` instead of `p-4 md:p-6`
- Reduce time font size on mobile: `text-lg md:text-4xl` instead of `text-2xl md:text-4xl`
- Reduce label font size: `text-[10px] md:text-sm`

### 2. Campaign Session Clocks Grid -- 2x2 on mobile, 4 columns on desktop

**File: `src/pages/CampaignSession.tsx`**

- Change `grid-cols-4` to `grid-cols-2 md:grid-cols-4` so the 4 clocks arrange as a 2x2 grid on mobile
- Reduce section padding on mobile

### 3. Campaign Session Header -- Wrap buttons on mobile

**File: `src/pages/CampaignSession.tsx`**

- Allow the header buttons ("New Session", "End Session") to wrap or stack on small screens using `flex-wrap`
- Use shorter button text on mobile (icon-only or abbreviated)

### 4. Campaign Card Action Buttons -- Wrap on mobile

**File: `src/components/campaigns/CampaignCard.tsx`**

- Change the action buttons container from a single row to `flex-wrap` so buttons wrap to a second line on small screens instead of cramming next to the title

### 5. SortableTaskItem -- Better mobile layout

**File: `src/components/campaigns/SortableTaskItem.tsx`**

- Reduce gap and padding on mobile: `gap-2 p-2 md:gap-3 md:p-3`
- Allow the task name to use `min-w-0` to ensure proper truncation
- Hide the "POP-UP" / "HIDDEN" badge text on very small screens (keep just the icon)
- Make the time display more compact on mobile

### 6. Campaigns Page -- Reduce padding on mobile

**File: `src/pages/Campaigns.tsx`**

- Reduce horizontal padding: `px-4 md:px-12` instead of `px-6 md:px-12`
- Reduce hero section margins on mobile

---

## Technical Changes Summary

| File | Changes |
|------|---------|
| `src/components/campaigns/SessionClock.tsx` | Smaller padding, font sizes on mobile |
| `src/pages/CampaignSession.tsx` | 2x2 clock grid on mobile, wrap header buttons, reduce padding |
| `src/components/campaigns/CampaignCard.tsx` | `flex-wrap` on action buttons |
| `src/components/campaigns/SortableTaskItem.tsx` | Tighter mobile spacing, hide badge text on small screens |
| `src/pages/Campaigns.tsx` | Reduce mobile padding |

---

## Key Principle

All changes use responsive Tailwind classes (e.g., `text-lg md:text-4xl`, `grid-cols-2 md:grid-cols-4`) so desktop remains unchanged while mobile gets a properly spaced layout.
