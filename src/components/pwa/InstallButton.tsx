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
        <Check className="h-4 w-4 text-primary" />
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
