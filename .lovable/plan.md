
## What’s actually happening (why it “still disappears”)
You’re seeing a real browser/OS-initiated reload (“Reloading…/Loading…”) when you switch away. We can’t fully stop that from happening for hours-long tab inactivity, but we can make it so that when you come back, your Quick Add items are still there.

From what I see in the current code, there are two concrete issues that can still cause “I added something → switched away → came back → it’s gone”:

### A) **CampaignCreator still initializes localStorage state while auth is loading**
In `CampaignCreator.tsx`, we currently call `useLocalStorageState(...)` before we return the `authLoading` spinner.

Even though we “render a loading UI”, React has already:
- initialized draft state using the `"campaignCreatorDraft:pending"` key
- started the debounced write effect which can write defaults
- potentially persisted “empty” state at the wrong time

This can overwrite/migrate incorrectly during reload/auth re-init cycles.

### B) **Race condition: state update vs. background event**
Even with our `visibilitychange/pagehide` persistence, there’s a real edge case:

1. You click “Add Task” (setState is scheduled)
2. You immediately switch tabs/apps
3. `visibilitychange/pagehide` fires before React commits the state update
4. We persist the “previous” draft (missing the item)
5. Then the page is killed/reloaded, and you come back to the stale storage

This matches your repro: “switch away immediately” and “even if I wait a few seconds” (because reload can still happen at any time, and we need stronger guarantees).

## Goals
1. **Never write drafts under a temporary/pending key** for real users.
2. **Persist the newest draft even if the browser background event happens right after a click**.
3. Keep the experience consistent after a reload:
   - draft restored
   - last route restored
   - no “lost” Quick Add items

## Implementation changes (what I will do)

### 1) Refactor `CampaignCreator` so it never uses the `pending` key
**Change:** Split `CampaignCreator` into two components:
- `CampaignCreator` (wrapper): handles `useAuth()`, shows loading while auth resolves.
- `CampaignCreatorForm` (inner): receives `userId` and calls `useLocalStorageState` with a stable key: `campaignCreatorDraft:${userId}`

**Result:** We completely remove `campaignCreatorDraft:pending` from the flow and eliminate accidental overwrites during auth initialization.

**Files:**
- `src/components/campaigns/CampaignCreator.tsx`

### 2) Upgrade `useLocalStorageState` to persist the “latest known state” using a ref-backed setter
**Change:** Make persistence read from a `stateRef` that is updated immediately when `setState` is called, not only after React re-renders.

Concretely:
- Add `const stateRef = useRef(state)` and keep it updated.
- Wrap the setter: `setStateSafe(updater)` that:
  - computes the next state synchronously
  - updates `stateRef.current = next`
  - calls React’s `setState(next)`
- Update all “persistImmediately” listeners (`pagehide`, `visibilitychange`, `beforeunload`) to write `stateRef.current` rather than the possibly-stale `state` closure.

**Why this matters:** If the browser backgrounds the page immediately after an “Add” click, we still write the updated draft, even if React hasn’t re-rendered yet.

**Files:**
- `src/hooks/useLocalStorageState.ts`

### 3) Add an explicit `persistNow()` escape hatch for critical actions (Quick Add / Remove)
Even with the ref fix, I will add a small optional capability:

- `useLocalStorageState` can return a 5th value `persistNow()` (or expose it via options) that flushes immediately.
- In `CampaignCreatorForm`, after:
  - adding a popup quest
  - adding a hidden territory
  - removing a temporary item
we call `persistNow()`.

This makes Quick Add changes “durable” instantly, rather than waiting on debouncing or lifecycle events.

**Files:**
- `src/hooks/useLocalStorageState.ts`
- `src/components/campaigns/CampaignCreator.tsx`

### 4) Make “lastRoute” persistence safer (avoid writing during render)
In `RequireAuth.tsx`, lastRoute is currently written during render (not in an effect). That’s not ideal during rapid mount/unmount after reload.

**Change:** Move lastRoute persistence into a `useEffect` that runs when `session/user/location` changes.

This won’t fix browser reloads, but it prevents edge-case route storage weirdness during auth transitions.

**Files:**
- `src/components/auth/RequireAuth.tsx`

## How we’ll verify it (acceptance tests)
### Test A — Quick Add survives immediate tab switch + reload
1. Open Campaign Creator → Quick Add
2. Add a Pop-up Quest (ensure toast appears)
3. Immediately switch browser tabs/apps (try to trigger “Reloading…”)
4. Return and reopen Campaign Creator
Expected:
- The added item is still in “Pending Items”
- The Quick Add input fields are cleared as expected (since the item was added)

### Test B — Wait a few seconds, switch away, return
Same test, but wait ~3–5 seconds before switching away.
Expected:
- Still restored (confirms both debounced and immediate persistence paths work)

### Test C — Last route restore still behaves
1. Navigate to /campaigns or active session page
2. Trigger reload/discard
3. Return
Expected:
- If the browser returns you to `/`, the app should auto-resume to last route (current behavior), and lastRoute should be accurate.

## Notes (being direct)
- We still cannot force Chrome/iOS to keep the tab alive for hours; you may still see that “Reloading…” screen.
- After these changes, that reload should no longer cost you your Quick Add items or your in-progress campaign draft, which is the practical UX requirement you’re asking for: the app should aid users, not leash them.

## Files to change (summary)
- `src/components/campaigns/CampaignCreator.tsx` (split into wrapper + form; stable key; call persistNow on critical actions)
- `src/hooks/useLocalStorageState.ts` (ref-backed state + setter; persist uses stateRef; add persistNow)
- `src/components/auth/RequireAuth.tsx` (move lastRoute write into useEffect)

