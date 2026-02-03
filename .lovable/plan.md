

# AI Usage Cap System for Beta Testers

## Overview
This plan creates a usage tracking and rate limiting system to protect your Lovable AI credits during beta testing. Each user will have daily AI request limits, and when they exceed these limits, they'll see a friendly message instead of the AI feature working (preventing credit drain).

---

## How It Works

The system tracks every AI request per user per day. When a user hits their daily limit, AI features gracefully degrade:
- "Generate Name" and "AI Guess" buttons show a message like "Daily AI limit reached"
- "Cleave" feature shows a similar message
- Users can still use the app normally - only AI features are restricted

---

## Configuration Options

You can configure:
- **Daily request limit per user** (e.g., 10 requests/day)
- **Which actions count** (name generation, difficulty guessing, cleaving)
- **Reset time** (midnight UTC each day)

---

## Database Schema

A new `ai_usage` table to track requests:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | The user making requests |
| action_type | text | Which AI action (generate_name, guess_difficulty, cleave) |
| created_at | timestamp | When the request was made |

This allows counting requests per user per day with a simple query.

---

## Architecture

```text
Frontend                    Edge Function                   AI Gateway
   |                              |                              |
   |-- Request AI feature ------->|                              |
   |                              |-- Check usage count -------->|
   |                              |<-- Count for today ----------|
   |                              |                              |
   |                              |-- If limit exceeded -------->|
   |<-- "Limit reached" error ----|                              |
   |                              |                              |
   |                              |-- If allowed --------------->|
   |                              |     - Call AI gateway ------>|
   |                              |<-------- Response -----------|
   |                              |     - Log usage ------------>|
   |<-- AI response --------------|                              |
```

---

## Implementation Steps

### Step 1: Create ai_usage Table
Create a new database table to store usage records with RLS policies ensuring users can only see their own usage (though edge functions use service role to bypass this for tracking).

### Step 2: Add Usage Limit Configuration
Create a configuration constant in a shared location defining:
- `DAILY_AI_LIMIT = 10` (adjustable)
- List of tracked action types

### Step 3: Update campaign-ai Edge Function
Before calling the AI gateway:
1. Get user ID from request (via auth header or passed in body)
2. Count today's requests for this user
3. If count >= limit, return a `429 Too Many Requests` with friendly message
4. After successful AI call, insert a usage record

### Step 4: Update cleave Edge Function
Same pattern as campaign-ai:
1. Check usage count
2. Return limit error if exceeded
3. Log usage after successful call

### Step 5: Update Frontend Error Handling
The frontend already handles 429 errors with toast messages. We'll ensure the error message clearly indicates it's a daily limit (not a temporary rate limit).

---

## Technical Details

### Usage Check Query (in Edge Functions)
```typescript
// Supabase client with service role for internal operations
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Get today's start (UTC midnight)
const todayStart = new Date();
todayStart.setUTCHours(0, 0, 0, 0);

// Count requests for this user today
const { count } = await supabaseAdmin
  .from('ai_usage')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)
  .gte('created_at', todayStart.toISOString());

const DAILY_LIMIT = 10;
if ((count || 0) >= DAILY_LIMIT) {
  return new Response(
    JSON.stringify({ 
      error: "Daily AI limit reached. Resets at midnight UTC.",
      code: "DAILY_LIMIT_EXCEEDED"
    }),
    { status: 429, headers: corsHeaders }
  );
}
```

### Logging Usage After Success
```typescript
// After successful AI response
await supabaseAdmin.from('ai_usage').insert({
  user_id: userId,
  action_type: action // 'generate_name', 'guess_difficulty', 'cleave'
});
```

### Getting User ID in Edge Functions
The edge functions currently have `verify_jwt = false`. To identify users, we'll:
1. Pass `userId` in the request body from the authenticated frontend
2. Validate this matches the auth token if provided

---

## Frontend Changes

### Update Error Messages
In the hooks that call AI functions, differentiate between:
- `DAILY_LIMIT_EXCEEDED` - "You've reached your daily AI limit (10/day). Resets at midnight UTC."
- Generic 429 - "Rate limit exceeded. Try again in a moment."

### Optional: Show Remaining Count
Add a small indicator showing "AI requests: 3/10 remaining today" in the UI.

---

## Adjustable Settings

The daily limit will be defined as a constant in the edge functions. To change it:
- Update `DAILY_LIMIT` value in both `campaign-ai/index.ts` and `cleave/index.ts`
- No database changes needed

For a future enhancement, you could add a `settings` table with `ai_daily_limit` to make this configurable without code changes.

---

## Summary

| Feature | Before | After |
|---------|--------|-------|
| AI Name Generation | Unlimited | 10/day per user |
| AI Difficulty Guess | Unlimited | Shared limit with above |
| AI Cleave | Unlimited | Shared limit with above |
| Credit Protection | None | Full - requests blocked after limit |
| User Experience | Unlimited | Clear "limit reached" messages |

This system ensures beta testers can explore AI features while protecting your credits. The 10/day limit is a starting point - you can adjust it based on your credit budget and user feedback.

