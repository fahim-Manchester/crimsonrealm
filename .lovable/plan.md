
# Fix: "Unknown" Display When Expanding Campaign Cards

## Problem Summary

When clicking "Click to expand" on a campaign card in the Campaigns dashboard, items display as "Unknown" instead of showing their actual names. This happens specifically for **temporary items** (Pop-up Quests and Hidden Territories).

## Root Cause

The `CampaignCard.tsx` component's expanded view (line 248) uses incomplete display logic:

```typescript
{item.task?.title || item.project?.name || "Unknown"}
```

This only checks for linked tasks/projects but **ignores temporary items**, which have their name stored in `item.temporary_name` instead.

Compare this to `SortableTaskItem.tsx` (lines 89-94) which correctly handles all item types:

```typescript
const title = item.is_temporary 
  ? item.temporary_name || "Untitled"
  : item.task?.title || item.project?.name || "Unknown";
```

## Solution

Update `CampaignCard.tsx` to properly handle all three types of campaign items:
1. Linked Tasks (use `item.task.title`)
2. Linked Projects/Territories (use `item.project.name`)
3. Temporary Items - Pop-up Quests & Hidden Territories (use `item.temporary_name`)

Also update the icon logic to show appropriate icons for temporary items.

---

## Technical Changes

### File: `src/components/campaigns/CampaignCard.tsx`

**Lines 244-255** - Update the item display in the expanded section:

**Current (broken):**
```typescript
<span className="text-xs">
  {item.task_id ? "⚒️" : "🗺️"}
</span>
<span className="flex-1 truncate">
  {item.task?.title || item.project?.name || "Unknown"}
</span>
```

**Fixed:**
```typescript
<span className="text-xs">
  {item.is_temporary 
    ? (item.temporary_type === 'task' ? "⚡" : "🌙")
    : (item.task_id ? "⚒️" : "🗺️")}
</span>
<span className="flex-1 truncate">
  {item.is_temporary 
    ? (item.temporary_name || "Untitled")
    : (item.task?.title || item.project?.name || "Unknown")}
</span>
```

This ensures:
- **Pop-up Quests** show with ⚡ icon and their temporary name
- **Hidden Territories** show with 🌙 icon and their temporary name
- **Regular Tasks** show with ⚒️ icon and task title
- **Regular Territories** show with 🗺️ icon and project name

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/campaigns/CampaignCard.tsx` | Update lines 244-255 to handle `is_temporary` items with proper name and icon display |

---

## Verification Steps

1. Create a campaign with:
   - A regular task from Forge
   - A regular territory from Territories
   - A Pop-up Quest via Quick Add
   - A Hidden Territory via Quick Add
2. On the Campaigns dashboard, click "Click to expand" on that campaign
3. Verify all items show with correct names and icons:
   - Regular task: ⚒️ + task title
   - Regular territory: 🗺️ + project name
   - Pop-up Quest: ⚡ + temporary name
   - Hidden Territory: 🌙 + temporary name
