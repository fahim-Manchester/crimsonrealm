

# Add Music Player to Campaign Session Page

## Problem
The `CampaignSession` page has its own custom header layout and doesn't use the shared `PageLayout` component, so the `MusicPlayer` wasn't added there.

## Solution
Import and add `MusicPlayer` to the campaign session header, alongside the existing "New Session" and "End Session" buttons.

## File Changes

| File | Change |
|------|--------|
| `src/pages/CampaignSession.tsx` | Import `MusicPlayer` and add it to the header nav (before the action buttons) |

## Implementation
Add the MusicPlayer component in the header's right section:
```tsx
<div className="flex items-center gap-2 flex-wrap">
  <MusicPlayer />  {/* Add here */}
  <Button ...>New Session</Button>
  <Button ...>End Session</Button>
</div>
```

This ensures music controls are accessible during active campaign sessions, which is especially important given the "play only when timer running" setting.

