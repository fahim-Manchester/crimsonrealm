# SMS Reminders System — Implementation Plan

## Overview

Add a Twilio-powered SMS reminder system with rate limiting, secret-code-gated settings, and three campaign-level reminder types. This requires database tables, an edge function, new UI in Settings and CampaignSession, and a React hook to orchestrate everything.

## Architecture

```text
Settings Page                    Campaign Session
┌─────────────────┐             ┌─────────────────────┐
│ Secret Code Gate │             │ Reminder Settings   │
│ → Phone Number   │             │ Panel (per campaign)│
│ → SMS consent    │             │ • Check-in          │
└────────┬────────┘             │ • Dangerous         │
         │                      │ • Task Switch       │
         ▼                      └────────┬────────────┘
   user_settings table                   │
   (phone, sms_enabled)                  ▼
                               useReminders hook
                                    │
                                    ▼
                          Edge Function: send-sms
                          (rate limiting + Twilio gateway)
                                    │
                                    ▼
                           sms_log table (audit + rate limit)
```

FYI -> You should be able to access the settings page using the gear icon that currently takes you to a settings page from the home page.   
  
Database Changes (2 new tables)

### Table: `user_settings`

- `id` uuid PK default gen_random_uuid()
- `user_id` uuid NOT NULL (unique)
- `phone_number` varchar (nullable)
- `sms_enabled` boolean default false
- `external_unlocked` boolean default false
- `created_at` / `updated_at` timestamps
- RLS: users can CRUD their own row only

### Table: `sms_log`

- `id` uuid PK
- `user_id` uuid NOT NULL
- `campaign_id` uuid (nullable)
- `reminder_type` varchar (check_in | dangerous | task_switch)
- `status` varchar (sent | failed)
- `created_at` timestamp default now()
- RLS: users can INSERT and SELECT their own rows only (no UPDATE/DELETE for audit integrity)

## Edge Function: `send-sms`

- Connects Twilio via the connector gateway
- Accepts: `{ phone, message, userId, campaignId, reminderType }`
- Server-side rate limiting: queries `sms_log` for count in last 24h (max 20) and current session marker (max 5)
- On success: inserts into `sms_log`
- On failure: returns error, caller disables reminders
- JWT verification disabled in config.toml; validates auth in code

## New Files

### `src/hooks/useReminders.ts`

- Loads user settings (phone, sms_enabled) from `user_settings`
- Manages campaign-level reminder config in localStorage per campaign:
  - `enabled`: boolean
  - `checkIn`: { enabled, minutes }
  - `dangerous`: { enabled, minutes, confirmWindowSeconds }
  - `taskSwitch`: { enabled }
- Tracks continuous timer duration; fires check-in/dangerous reminders
- On task switch (called from CampaignSession), fires task-switch reminder
- Tracks session SMS count client-side as first gate
- Calls edge function `send-sms`
- On "dangerous" timeout without confirmation: calls a provided `resetSession` callback

### `src/components/campaigns/ReminderSettingsPanel.tsx`

- Sheet/popover in campaign header (like TimerModeSettings)
- Only visible when user has phone + sms_enabled
- Toggle: "Allow this campaign to send SMS reminders"
- When enabled, shows 3 reminder type cards with toggles and minute inputs

### `src/components/campaigns/DangerousPresenceModal.tsx`

- Full-screen overlay with countdown timer and "Mark Presence" button
- Shows when dangerous reminder fires
- If countdown expires, resets session

### Settings Page (`src/pages/Settings.tsx`)

- Replace "Coming Soon" with actual settings UI
- Section: "External Connections" with secret code input (GDG26)
- Once unlocked: phone number input (international format) + SMS consent checkbox
- Saves to `user_settings` table

## Modified Files

### `src/pages/CampaignSession.tsx`

- Import and initialize `useReminders` hook
- Pass timer running state so hook can track continuous duration
- On queue advance / task switch, call `reminders.notifyTaskSwitch(nextTaskName)`
- Render `ReminderSettingsPanel` in header (conditionally)
- Render `DangerousPresenceModal` when triggered

### `supabase/config.toml`

- Add `[functions.send-sms]` with `verify_jwt = false`

## Twilio Connector

Will use `standard_connectors--connect` with connector_id `twilio` to link the Twilio connection. The edge function will use the gateway pattern (`https://connector-gateway.lovable.dev/twilio/Messages.json`).

## Safety Summary

- Secret code gate prevents casual access
- Explicit SMS consent checkbox required
- Client-side session limit (5) + server-side daily limit (20)
- Auto-disable on send failure
- Audit log in `sms_log` table (immutable — no UPDATE/DELETE policies)