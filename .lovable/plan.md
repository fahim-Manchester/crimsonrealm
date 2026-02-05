
# Fix: Prevent App State Reset on Tab Switch / Browser Minimize

## Problem Analysis

When you switch browser tabs or minimize/restore your browser, the app loses its state and reloads data. This is particularly frustrating when building campaigns because you lose your progress in the creator dialog.

### Root Cause

**React Query's default behavior** includes:
- `refetchOnWindowFocus: true` - Refetches all active queries when you return to the tab
- `refetchOnReconnect: true` - Refetches when internet reconnects
- `staleTime: 0` - Data is immediately considered stale

These defaults cause data to refetch aggressively whenever you interact with the browser window, which can:
1. Reset form state if components re-render with new data
2. Cause loading spinners to flash
3. Lose unsaved work in dialogs and forms

### Current Code Issue

In `src/App.tsx`:
```typescript
const queryClient = new QueryClient(); // No custom options = all aggressive defaults
```

---

## Solution

### Step 1: Configure QueryClient with Sensible Defaults

Update `src/App.tsx` to disable aggressive refetching:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // Data stays fresh for 5 minutes
      gcTime: 10 * 60 * 1000,          // Cache persists for 10 minutes
      refetchOnWindowFocus: false,     // DON'T refetch when tab regains focus
      refetchOnReconnect: false,       // DON'T refetch on internet reconnect
      retry: 1,                        // Only retry failed requests once
    },
  },
});
```

### What These Options Do

| Option | Value | Effect |
|--------|-------|--------|
| `staleTime` | 5 minutes | Data won't be considered stale (needing refresh) for 5 minutes |
| `gcTime` | 10 minutes | Cached data lives for 10 minutes even after components unmount |
| `refetchOnWindowFocus` | `false` | Switching tabs or minimizing won't trigger refetches |
| `refetchOnReconnect` | `false` | Internet blips won't cause data reloads |
| `retry` | `1` | Failed requests retry once (prevents infinite loops) |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Update `QueryClient` instantiation with custom default options |

---

## User Experience After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Switch to another tab and back | Data refetches, forms may reset | State preserved, no refetch |
| Minimize browser and restore | Data refetches | State preserved |
| Alt-Tab between apps | Data refetches | State preserved |
| Click browser refresh | Data refetches | Data refetches (expected) |
| Close and reopen browser | Data refetches | Data refetches (expected) |

---

## Technical Notes

- Hooks using `useState` + `useEffect` (like `useCampaigns.ts`, `useCampaignSession.ts`) are not affected by React Query settings, but they benefit from the overall stability since they won't compete with React Query re-renders
- The `useDiary.ts` hook and `EditBookDialog.tsx` component use React Query and will directly benefit from this change
- Manual refresh is still available via the refresh buttons already in the UI
- Mutations (create, update, delete) will still invalidate relevant queries as expected
