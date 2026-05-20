import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa_install_dismissed';

export default function InstallPWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show again if the user dismissed it before
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible || !deferredPrompt) return null;

  function handleInstall() {
    deferredPrompt!.prompt();
    deferredPrompt!.userChoice.then(() => setVisible(false));
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  return (
    <div
      role="banner"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'linear-gradient(135deg, #22b8c2, #0c5561)',
        color: '#fff',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.3)',
        direction: 'rtl',
      }}
    >
      <span style={{ fontSize: 28 }}>📲</span>
      <span style={{ flex: 1, fontSize: '0.95rem', lineHeight: 1.4 }}>
        <strong>התקן את האפליקציה</strong><br />
        <span style={{ opacity: 0.85 }}>גישה מהירה מהמסך הראשי שלך</span>
      </span>
      <button
        onClick={handleInstall}
        style={{
          background: '#fff',
          color: '#0c5561',
          border: 'none',
          borderRadius: 8,
          padding: '8px 16px',
          fontWeight: 700,
          fontSize: '0.9rem',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        התקן
      </button>
      <button
        onClick={handleDismiss}
        aria-label="סגור"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#fff',
          fontSize: 20,
          cursor: 'pointer',
          lineHeight: 1,
          padding: '4px',
        }}
      >
        ✕
      </button>
    </div>
  );
}
