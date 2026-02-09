import { Download, Check, Smartphone } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useState } from 'react';
import InstallModal from './InstallModal';

export default function InstallButton() {
  const { canInstallNative, canShowInstructions, isInstalled, isStandalone, browser, platform, promptInstall } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // Already installed - show checkmark
  if (isInstalled || isStandalone) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Check className="h-4 w-4 text-primary" />
        <span className="hidden md:inline">Installed</span>
      </div>
    );
  }

  // Can use native install prompt (Chromium browsers)
  if (canInstallNative) {
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

  // Show manual instructions for all other browsers
  if (canShowInstructions) {
    const isMobile = platform === 'ios' || platform === 'android';
    
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 p-2 rounded-sm hover:bg-primary/10 transition-colors"
          title="Install Crimson Realm"
        >
          {isMobile ? (
            <Smartphone className="h-5 w-5 text-primary" />
          ) : (
            <Download className="h-5 w-5 text-primary" />
          )}
          <span className="hidden md:inline font-crimson text-sm text-muted-foreground hover:text-foreground">
            Install
          </span>
        </button>
        <InstallModal 
          open={showModal} 
          onClose={() => setShowModal(false)} 
          browser={browser}
          platform={platform}
        />
      </>
    );
  }

  // Fallback - shouldn't reach here but show subtle install option
  return (
    <button
      onClick={() => setShowModal(true)}
      className="flex items-center gap-2 p-2 rounded-sm hover:bg-primary/10 transition-colors opacity-50"
      title="Install Crimson Realm"
    >
      <Download className="h-4 w-4 text-muted-foreground" />
      <InstallModal 
        open={showModal} 
        onClose={() => setShowModal(false)} 
        browser={browser}
        platform={platform}
      />
    </button>
  );
}
