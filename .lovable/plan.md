
## What I believe is still happening (root cause)
You’re right to be upset: even if we can’t *stop* a browser/phone from killing an inactive tab, we must make sure that when it comes back:

- you don’t lose your “unsaved” work (like the campaign creator selections / quick-add list)
- you don’t get dumped back to `/` and forced to manually navigate back

From the code I inspected, there is a concrete bug that explains why “I was building a campaign and switched tabs → came back → everything was gone” can still happen:

### Key bug: Campaign Creator draft key changes after auth loads
In `CampaignCreator.tsx` we currently do:

- if `user` is not ready yet: key = `campaignCreatorDraft:anonymous`
- after auth finishes: key becomes `campaignCreatorDraft:<userId>`

But `useLocalStorageState()` **only hydrates from localStorage on the first render**. It does *not* re-hydrate when the `key` changes later.

So the common lifecycle is:
1. page reload happens → auth is still loading → `user` is null
2. CampaignCreator mounts → loads draft from `campaignCreatorDraft:anonymous` (often empty)
3. a moment later auth resolves → key changes to `campaignCreatorDraft:<userId>`
4. the hook **does not reload from the new key** → draft appears “lost”

This matches your video description very well: after reload, the UI is back but your in-progress list/draft is missing.

## What we will change
We’ll address the problem in two layers:

### Layer A — Make the Campaign Creator draft truly survive reloads (fix key-change hydration)
**Goal:** if a reload happens at any time, your campaign draft and quick-add list come back exactly as you left them.

#### A1) Fix `useLocalStorageState` to re-hydrate when the key changes
We will update `src/hooks/useLocalStorageState.ts` to:
- detect when `key` changes (e.g., anonymous → user-specific)
- immediately attempt to load the new key’s stored value
- if found, replace the in-memory state with the stored state

Important detail:
- We must avoid overwriting the “real” user draft with an empty anonymous draft during the transition.
- We’ll implement a “key migration” approach:
  - If key changes and the new key has no stored value, but the old key *did* have a stored value, we can copy it forward once (optional but recommended).

#### A2) Stop using the `anonymous` fallback key for drafts that matter
In `CampaignCreator.tsx`, we’ll do one of these (recommended option first):

**Recommended**: Don’t render the draft-backed UI until auth is resolved
- If `useAuth().loading` is true, show a small loading state inside the dialog instead of initializing the draft with an anonymous key.
- Once we have the user id, we mount the form with the correct key from the start.

This prevents “draft initialized under the wrong key” entirely.

#### A3) Add an explicit “Draft restored” indicator (small UX improvement)
When we load a non-empty draft after a reload, show a small toast like:
- “Draft restored” (only once per mount)
This reduces the confusion and gives reassurance after the browser “reloading” screen.

---

### Layer B — If the browser reload dumps the user to `/`, automatically resume the last protected route
**Goal:** even if the browser/OS reloads and the user lands at `/`, the app should take them back to where they were (especially the active campaign timer).

You already approved “Auto resume”, so we’ll implement that.

#### B1) Add auto-resume logic on `Index` (`/`)
We’ll update `src/pages/Index.tsx` so that:
- if a session exists, read `lastRoute:<userId>` from localStorage
- if that route exists and is not `/auth`, navigate there automatically
- fallback: navigate to `/home`

We’ll do this safely:
- wait until `useAuth().loading` is false
- avoid loops (don’t redirect if lastRoute is already `/`)

This directly addresses why you’re currently on route `/` after the issue.

#### B2) Add a “Resume now” button as a backup (optional but useful)
Even with auto-resume, we can also show a “Resume where you left off” button for accessibility and as a fallback if navigation is blocked.

---

## Why this “fixes it” in practical user terms (even though browsers can still reload)
We cannot force Chrome/iOS to keep a background tab alive for hours. But after these changes, a reload becomes effectively harmless:
- your campaign timer resumes accurately (timestamp-authoritative)
- your campaign-creation draft and quick-add list do not disappear
- you don’t get stranded on `/`

That’s what makes the app feel like it “didn’t reload” from the user’s perspective.

## Files we will modify
1. `src/hooks/useLocalStorageState.ts`
   - add key-change rehydration (and optional migration from old key → new key)

2. `src/components/campaigns/CampaignCreator.tsx`
   - avoid initializing draft with `anonymous` key (wait for auth), or rely on the improved hook
   - optional: “Draft restored” toast behavior

3. `src/pages/Index.tsx`
   - if already signed in, auto-resume to lastRoute or /home

(We may also lightly adjust `useAuth` usage in Index/CampaignCreator to use the existing `loading` flag correctly.)

## Acceptance tests (what you should be able to do after the fix)
### Test 1: Campaign Creator draft survives a reload
1. Go to Campaigns → Create Campaign
2. Select tasks/territories, add multiple Quick Add items
3. Switch tabs for a while (long enough to trigger your “Reloading…” behavior)
4. Come back:
   - If the browser reloads, reopen the campaign creator:
   - Your selections + quick-add list are still there

### Test 2: If you land on `/` after reload, the app resumes automatically
1. Start a timer or open Campaigns
2. Switch away long enough to trigger a reload
3. Come back:
   - if you land on `/`, within a moment it navigates you back to where you were

### Test 3: Timer still shows hours correctly
1. Start campaign timer
2. Leave laptop for 2–4 hours (sleep/lock is fine)
3. Come back:
   - timer reflects elapsed time (based on timestamps), even if the page had to reload

## Notes / constraints (being direct)
- If the browser kills the tab, you may still see a brief “Reloading…” screen (that’s outside our control).
- The fix here ensures the reload does not cost users work, time accuracy, or navigation context—so the app remains a helper, not a leash.
