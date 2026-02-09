

# Progressive Web App (PWA) Implementation Plan

## Overview

Add full installable PWA support to Crimson Realm for both Android and iOS, while keeping the existing browser experience unchanged. 

The mobile app will be installable from the browser and launch in standalone mode (with only the mobile version) when first launching, starting at `/home`. However, if a user logged in, then whenever they reopen the app, it won't start on the home page, but the menu page, where they can overview things. Users can, of course, log out if they want to, but don't have to. 


---

## Files to Create

| File | Purpose |
|------|---------|
| `public/manifest.webmanifest` | Web app manifest for installability |
| `public/sw.js` | Service worker for caching and offline support |
| `public/icons/icon-192.png` | 192x192 app icon |
| `public/icons/icon-512.png` | 512x512 app icon |
| `public/icons/maskable-512.png` | Maskable icon for Android adaptive icons |
| `src/hooks/usePWAInstall.ts` | React hook to manage install prompt state |
| `src/components/pwa/InstallButton.tsx` | Install button component for navigation |
| `src/components/pwa/IOSInstallModal.tsx` | iOS-specific install instructions modal |

## Files to Modify

| File | Change |
|------|--------|
| `index.html` | Add manifest link, meta tags for iOS/Android, theme-color, service worker registration |
| `src/pages/Home.tsx` | Add Install button to navigation header |
| `src/components/layout/PageLayout.tsx` | Add Install button to navigation header |

---

## Technical Implementation

### 1. Web App Manifest (`public/manifest.webmanifest`)

```json
{
  "name": "Crimson Realm",
  "short_name": "Crimson Realm",
  "description": "Productivity task/project management RPG",
  "start_url": "/home",
  "scope": "/",
  "display": "standalone",
  "background_color": "#0f0f11",
  "theme_color": "#0f0f11",
  "orientation": "any",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

**Color values derived from CSS:**
- `background_color`: `#0f0f11` (HSL 240 10% 6% converted to hex - the app's dark background)
- `theme_color`: `#0f0f11` (matches background for seamless status bar)

---

### 2. Service Worker (`public/sw.js`)

Strategy:
- **Static assets (JS, CSS, images, fonts)**: Cache-first (fast loading)
- **Navigation requests**: Network-first with offline fallback
- **API requests**: Network-only (never cache authenticated data)
- **Cache cleanup**: Remove old caches on activation

```javascript
const CACHE_NAME = 'crimson-realm-v1';
const STATIC_ASSETS = [
  '/',
  '/home',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install: Pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Smart caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Never cache Supabase API calls
  if (url.hostname.includes('supabase')) {
    return;
  }
  
  // Navigation: Network-first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/home'))
    );
    return;
  }
  
  // Static assets: Cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
```

---

### 3. HTML Updates (`index.html`)

Add to `<head>`:

```html
<!-- PWA Manifest -->
<link rel="manifest" href="/manifest.webmanifest" />

<!-- Theme Color for Android -->
<meta name="theme-color" content="#0f0f11" />

<!-- iOS PWA Support -->
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Crimson Realm" />
```

Add before closing `</body>`:

```html
<!-- Service Worker Registration -->
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js');
    });
  }
</script>
```

---

### 4. PWA Install Hook (`src/hooks/usePWAInstall.ts`)

Custom hook to manage the install flow:

```typescript
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    setIsInstalled(standalone);

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Capture install prompt (Android/Chrome/Edge)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Detect successful install
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === 'accepted';
  };

  return {
    canInstall: !!deferredPrompt && !isInstalled,
    isInstalled,
    isIOS: isIOS && !isStandalone,
    isStandalone,
    promptInstall
  };
}
```

---

### 5. Install Button Component (`src/components/pwa/InstallButton.tsx`)

Visible button in navigation that adapts to platform:

```typescript
import { Download, Check, Smartphone } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useState } from 'react';
import IOSInstallModal from './IOSInstallModal';

export default function InstallButton() {
  const { canInstall, isInstalled, isIOS, isStandalone, promptInstall } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Already installed - show checkmark
  if (isInstalled || isStandalone) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Check className="h-4 w-4 text-green-500" />
        <span className="hidden md:inline">Installed</span>
      </div>
    );
  }

  // iOS Safari - show instructions modal
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSModal(true)}
          className="flex items-center gap-2 p-2 rounded-sm hover:bg-primary/10 transition-colors"
          title="Install Crimson Realm"
        >
          <Smartphone className="h-5 w-5 text-primary" />
          <span className="hidden md:inline font-crimson text-sm text-muted-foreground hover:text-foreground">
            Install
          </span>
        </button>
        <IOSInstallModal open={showIOSModal} onClose={() => setShowIOSModal(false)} />
      </>
    );
  }

  // Android/Chrome - trigger native prompt
  if (canInstall) {
    return (
      <button
        onClick={promptInstall}
        className="flex items-center gap-2 p-2 rounded-sm hover:bg-primary/10 transition-colors"
        title="Install Crimson Realm"
      >
        <Download className="h-5 w-5 text-primary" />
        <span className="hidden md:inline font-crimson text-sm text-muted-foreground hover:text-foreground">
          Install
        </span>
      </button>
    );
  }

  // Browser doesn't support install - subtle tip
  return (
    <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground/50" title="Use Chrome to install">
      <Download className="h-4 w-4" />
    </div>
  );
}
```

---

### 6. iOS Install Modal (`src/components/pwa/IOSInstallModal.tsx`)

Simple modal with iOS-specific instructions:

```typescript
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Share, Plus } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function IOSInstallModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="gothic-card max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-cinzel">Install Crimson Realm</DialogTitle>
          <DialogDescription className="font-crimson">
            Add this app to your home screen for the full experience.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
              <Share className="h-5 w-5 text-primary" />
            </div>
            <p className="font-crimson text-sm">
              Tap the <strong>Share</strong> button in Safari
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <p className="font-crimson text-sm">
              Select <strong>"Add to Home Screen"</strong>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

### 7. Navigation Updates

#### `src/pages/Home.tsx` - Add Install button to header nav

```typescript
// Add import
import InstallButton from "@/components/pwa/InstallButton";

// In the nav section (line 46-63), add before Settings link:
<InstallButton />
```

#### `src/components/layout/PageLayout.tsx` - Add Install button to header nav

```typescript
// Add import
import InstallButton from "@/components/pwa/InstallButton";

// In the nav section (line 47-57), add before Sanctum link:
<InstallButton />
```

---

### 8. App Icons

Create placeholder icons in `public/icons/`:
- `icon-192.png` - 192x192 PNG with app logo
- `icon-512.png` - 512x512 PNG with app logo  
- `maskable-512.png` - 512x512 PNG with extra padding for adaptive icons

**Note:** You'll need to provide actual icon images. I can create placeholder solid-color icons initially, or you can upload your preferred icon designs.

---

## Architecture Summary

```text
Browser Visit
     |
     v
index.html loads
     |
     ├─> Service Worker registers (sw.js)
     |     └─> Caches static assets
     |
     └─> React App loads
           |
           └─> usePWAInstall hook
                 |
                 ├─> Android: Captures beforeinstallprompt
                 |     └─> InstallButton shows Download icon
                 |           └─> Click triggers native prompt
                 |
                 ├─> iOS: Detects Safari
                 |     └─> InstallButton shows Smartphone icon
                 |           └─> Click opens instruction modal
                 |
                 └─> Already Installed: Shows checkmark
```

---

## Verification Checklist

| Check | How to Verify |
|-------|---------------|
| Lighthouse PWA score | Run Lighthouse audit in Chrome DevTools |
| Android install works | Visit in Chrome, see install prompt in address bar |
| iOS install works | Visit in Safari, use Share > Add to Home Screen |
| Standalone mode starts at /home | Install app, open it, verify URL is /home |
| Offline fallback works | Turn off network, reload - should show cached shell |
| API calls not cached | Complete tasks, verify changes persist after refresh |
| Normal browser unaffected | Visit in browser, all routes work normally |

---

## Summary

This implementation:
1. Creates a proper web manifest with app identity and icons
2. Adds a lightweight service worker that caches safely (no auth data)
3. Provides a discoverable Install button in the navigation
4. Handles Android (native prompt) and iOS (instruction modal) separately
5. Detects standalone mode to show "Installed" status
6. Keeps all existing browser functionality intact

