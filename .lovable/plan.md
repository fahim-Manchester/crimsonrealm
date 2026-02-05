
## What’s actually happening (and why it still “reloads”)
Based on your description (“black page literally saying ‘reloading’”) and the fact it happens across multiple devices/browsers, this is almost certainly **browser tab discard / process eviction** (Chrome/Edge) or **mobile OS tab eviction** (iOS/Android). When the browser decides the tab is “inactive” and memory is needed, it **kills the page**. When you return, the browser **reloads the whole document**, and you see a “Reloading…” screen.

Important implication:
- This is **not** React Query refetch behavior.
- This is **not** the campaign timer drift bug (we fixed correctness via timestamps).
- It is a **true page reload initiated by the browser/OS**. We cannot fully prevent the browser from discarding a tab.

What we *can* do (and what users will experience as “fixed”):
- Make Campaign Mode (and other key flows) **survive a full reload** by **persisting UI state**, **rehydrating immediately**, and **committing time deltas safely** so you don’t lose progress.
- Ensure that when a reload happens, the app **restores exactly where you were** with the timer still correct, and the campaign builder draft still there.

## Goals for the fix
1. **Campaign timers remain correct** even if the browser discards the tab and reloads.
2. **Campaign session page restores itself** after reload:
   - Same campaign
   - Same selected task
   - Timer running state restored
   - No lost time (best-effort commit)
3. **Campaign Creator (new campaign dialog) does not lose work** if a reload happens:
   - Name, difficulty, planned hours
   - Selected tasks/projects
   - Quick-add temporary items and in-progress quick-add text fields
4. Reduce “feels like a reload” events caused by our own code:
   - **Stop auto-navigating inside `useAuth`** (this can cause unexpected route changes/flicker that look like a “reset”)
   - Use a proper route guard instead

---

## Implementation plan (code changes)

### 1) Fix auth flow so it doesn’t cause “jumping”/resets on focus
**Why:** `useAuth` currently calls `navigate("/auth?mode=login")` whenever session is null. During initialization or token refresh transitions, this can cause route jumps that feel like reload/resets.

**Changes:**
- Update `src/hooks/useAuth.ts` to become a **pure state hook**:
  - Keep `user`, `session`, `loading`
  - **Remove all `navigate(...)` calls**
  - Ensure initialization order is correct:
    - subscribe to `onAuthStateChange` first
    - then `getSession()`
- Add a small `RequireAuth` wrapper component (e.g. `src/components/auth/RequireAuth.tsx`) that:
  - If `loading`: show spinner
  - If no session: `<Navigate to="/auth?mode=login" replace />`
  - Else: render children

**Update routing:**
- In `src/App.tsx`, wrap protected routes:
  - `/home`, `/campaigns`, `/campaigns/:id`, `/tasks`, `/projects`, `/resources`, `/diary`, `/settings`, `/achievements`
- Keep `/` and `/auth` public.

**Result:** even if auth token refresh happens after tab return, the app won’t “randomly” route away due to the hook side-effect.

---

### 2) Accept that true reloads can happen, and make Campaign Session restore perfectly
We already store timer state in localStorage (`campaignTimer:<campaignId>`) and compute elapsed from timestamps. That’s good, but two additions will make it resilient to real reloads and reduce loss:

#### 2a) Persist “where I was” in the session (not just timerState)
**Add to Campaign Session persistence:**
- `campaignId`
- `currentTaskIndex` (already in timerState)
- optionally `scroll position` or “expanded UI state” if needed later

We already persist timerState; ensure we persist:
- on `visibilitychange` hidden
- on `pagehide` (more reliable than beforeunload on mobile)
- on `beforeunload` (best effort)

**Files:**
- `src/hooks/useCampaignSession.ts`

#### 2b) Periodic “commit deltas” while running (optional but recommended)
**Why:** If you work for 90 minutes without pausing/switching tasks, and then the browser kills the tab, you’ll rehydrate fine from localStorage, but you may still want backend totals to stay reasonably current.

Add a low-frequency commit (example: every 60–120 seconds while running *and visible*, or on hidden/pagehide):
- compute elapsed seconds for current task since last commit
- write delta to the campaign_item and source entities using timestamp-derived deltas
- update a `lastCommittedAt` in localStorage so we only commit the delta once

This protects against:
- losing localStorage (rare but possible)
- users switching devices mid-session

**Files:**
- `src/hooks/useCampaignSession.ts`

---

### 3) Persist Campaign Creator draft so a reload doesn’t wipe your work
**Why:** Campaign creation currently uses local component state only. A real browser reload will wipe it.

**Approach:**
- Add a “draft state” saved to localStorage under a stable key:
  - `campaignCreatorDraft:<userId>` (or `:<userId>:v1` for migrations)
- Persist:
  - `campaignName`, `difficulty`, `plannedHours`
  - `selectedTasks`, `selectedProjects`
  - `temporaryItems`
  - quick-add inputs: `questTitle`, `questDescription`, `territoryName`, `territoryDescription`
  - `activeTab` in the creator (tasks/territories/quick)

**Implementation details:**
- Create a small reusable hook:
  - `useLocalStorageState<T>(key, initialValue, options?)`
  - It should:
    - hydrate on mount
    - write on changes (debounced ~150–300ms to avoid excessive writes)
- In `CampaignCreator`:
  - replace `useState(...)` for draft fields with `useLocalStorageState(...)`
  - provide a “Clear draft” button inside the dialog (so the user can discard)
  - automatically clear the draft on successful campaign creation and close

**Files:**
- `src/components/campaigns/CampaignCreator.tsx`
- `src/hooks/useLocalStorageState.ts` (new)

---

### 4) Restore last visited page (optional but strongly improves “it forgot where I was”)
If the browser reloads, it normally reloads at the same URL. But in some cases (auth redirects, open-at-root flows), you can end up back at `/`.

To improve this:
- Track last “protected route” visited in localStorage:
  - key: `lastRoute:<userId>`
- On app start:
  - if user has a session and current route is `/` (landing page), offer an automatic redirect or a “Resume” button/toast that takes you back.

**Files:**
- `src/App.tsx` (or a small `RoutePersistence` component)
- Possibly a new `src/components/system/ResumeLastRouteToast.tsx`

---

## Acceptance tests (what we’ll verify)
1. **Campaign Session – tab discard simulation**
   - Start a campaign session timer
   - Switch away for 30–90 minutes (ACTUALLY I WANT IT POSSIBLE FOR A USER TO SWITCH AWAY FROM THE TAB/BROWSER FOR A FEW HOURS ON END)
   - Return:
     - if the browser reloads the page, the app should come back with:
       - same campaign page
       - timer still running and showing correct elapsed time immediately
       - current task index preserved
2. **Campaign Creator draft**
   - Open Campaign Creator dialog
   - Fill name, select tasks, add quick items
   - Switch tabs for a while; if reload occurs:
     - reopening the dialog shows the draft exactly as left
3. **Auth stability**
   - Switch tabs repeatedly:
     - no unexpected jumps to `/auth` unless genuinely signed out
     - no flicker-loop routing behavior

---

## Notes / constraints (being direct)
- We cannot guarantee “it will never reload for hours” because browsers/phones can and do discard background tabs.
- What we *can* guarantee is: **if it reloads, you don’t lose your place or your time.** That’s the practical fix that makes the app usable as a “non-distracting” companion.

---

## Files we expect to touch
- `src/hooks/useAuth.ts` (remove navigation side-effects; stabilize auth state)
- `src/App.tsx` (protected routes via `RequireAuth`; optional resume-last-route)
- `src/components/auth/RequireAuth.tsx` (new)
- `src/hooks/useCampaignSession.ts` (add `pagehide`, optional periodic commit, ensure robust hydration)
- `src/components/campaigns/CampaignCreator.tsx` (persist draft state)
- `src/hooks/useLocalStorageState.ts` (new)

