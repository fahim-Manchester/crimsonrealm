import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type BrowserType = 'chrome' | 'edge' | 'samsung' | 'firefox' | 'safari' | 'opera' | 'other';
type PlatformType = 'ios' | 'android' | 'desktop';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [browser, setBrowser] = useState<BrowserType>('other');
  const [platform, setPlatform] = useState<PlatformType>('desktop');

  useEffect(() => {
    // Check if already in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    setIsInstalled(standalone);

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /ipad|iphone|ipod/.test(userAgent) && !(window as any).MSStream;
    const isAndroid = /android/.test(userAgent);
    setPlatform(isIOS ? 'ios' : isAndroid ? 'android' : 'desktop');

    // Detect browser
    if (/edg/.test(userAgent)) {
      setBrowser('edge');
    } else if (/samsungbrowser/.test(userAgent)) {
      setBrowser('samsung');
    } else if (/opr|opera/.test(userAgent)) {
      setBrowser('opera');
    } else if (/chrome|chromium|crios/.test(userAgent)) {
      setBrowser('chrome');
    } else if (/firefox|fxios/.test(userAgent)) {
      setBrowser('firefox');
    } else if (/safari/.test(userAgent)) {
      setBrowser('safari');
    } else {
      setBrowser('other');
    }

    // Capture install prompt (Chromium browsers)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Detect successful install
    const installedHandler = () => setIsInstalled(true);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === 'accepted';
  };

  // Can use native prompt (Chromium browsers)
  const canInstallNative = !!deferredPrompt && !isInstalled;
  
  // Can show manual instructions (all other browsers)
  const canShowInstructions = !canInstallNative && !isInstalled && !isStandalone;

  return {
    canInstallNative,
    canShowInstructions,
    isInstalled,
    isStandalone,
    browser,
    platform,
    promptInstall
  };
}
