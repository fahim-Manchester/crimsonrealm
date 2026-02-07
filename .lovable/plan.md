
## What’s actually broken (and why the last fix didn’t help)
I checked the database and confirmed the bug: several newly-created campaigns exist, but they have **0 rows in `campaign_items`** (so the Campaign Session correctly shows “No items in this campaign yet.”).

The root cause is in `createCampaign()` (`src/hooks/useCampaigns.ts`):

- We insert a mixed array of items: normal task rows + normal territory rows + temporary rows.
- Temporary rows include `is_temporary: true`.
- Normal rows currently **do not include `is_temporary` at all**.

Because `campaign_items.is_temporary` is **NOT NULL**, the multi-row insert can fail when PostgREST builds one INSERT statement using the union of keys. Rows that don’t provide `is_temporary` can end up as `NULL` for that column, violating the constraint—so **none of the rows are inserted**.

This explains exactly why Quick Add items “aren’t included” and why brand new campaigns can end up with zero items.

## Goal behavior
- When creating a campaign, all selected items are reliably written to `campaign_items`:
  - Forge tasks and Territories are included.
  - Quick Add “Pop-up Quests / Hidden Territories” are included as **temporary campaign items**.
- Temporary items must **not** appear elsewhere (Forge/Territories) unless explicitly “Mark Permanent”. This behavior stays unchanged.

## Fix approach (safe + minimal)
### Change 1 — Make `is_temporary` explicit on ALL inserted rows
In `src/hooks/useCampaigns.ts` inside `createCampaign()`:
- Add `is_temporary: false` to every normal task item row and every normal project item row.
- Keep temporary items as `is_temporary: true` (already done).
- Keep the existing type normalization:
  - `popup_quest -> task`
  - `hidden_territory -> project`

This prevents NULL violations and ensures the entire batch insert succeeds.

### Change 2 (optional but recommended) — Insert in two steps if we want maximum robustness
Even with Change 1, a single batch insert is fine. But for extra safety and clearer debugging:
- Insert normal items first (tasks/projects)
- Insert temporary items second
This makes failures easier to isolate and prevents any future “mixed object shape” problems from breaking everything.

I’ll implement either:
- **Option A (simpler):** Keep single insert, just set `is_temporary` on all rows.
- **Option B (most robust):** Do two inserts.

I recommend Option A unless you want the extra safety of Option B.

## Files I will inspect/edit (implementation)
1) **`src/hooks/useCampaigns.ts`**
   - Update `taskItems` mapping to include:
     - `is_temporary: false`
   - Update `projectItems` mapping to include:
     - `is_temporary: false`
   - Keep `tempItems` mapping as:
     - `is_temporary: true`
     - `temporary_type: item.type === "popup_quest" ? "task" : "project"`
   - (Optional) Change insertion to two-step inserts and show a clearer toast error depending on which insert failed.

2) (Optional) **Add improved error logging**
   - If insert fails, toast a message that indicates whether it failed adding items vs creating the campaign, and log the error details.

## How we’ll verify it’s fixed (end-to-end)
### Test A — Create campaign with ONLY Quick Add items
1. Campaigns → Create Campaign
2. Quick Add → Add Pop-up Quest (and/or Hidden Territory)
3. Create Campaign
4. Open the campaign session
Expected:
- The quick items appear immediately in the Quest Items list with correct styling.
- Campaign no longer shows “No items in this campaign yet.”

### Test B — Create campaign with tasks + territories + quick add
Expected:
- All items appear, in the expected order.

### Test C — Ensure temporary items don’t leak elsewhere
1. After creating the campaign, go to Forge (Tasks) and Territories (Projects)
Expected:
- The quick-added temporary items do **not** appear there.
2. In campaign session, use “Mark Permanent”
Expected:
- Only then do they show up in Forge/Territories.

## Notes about existing “empty” campaigns
Because the insert failed previously, you may now have a few campaigns that were created with 0 items.
After the fix, those won’t magically populate (we don’t know what selections were intended), but you can:
- Add items using “Add Item” inside the session, or
- Delete those empty campaigns if they were accidental.

(If you want, I can add a small UI warning on the Campaigns list to flag “Empty campaign” so they’re easy to spot and clean up—but that’s optional.)

## No backend/schema changes needed
This is a frontend insertion payload fix only. No database migrations required.
