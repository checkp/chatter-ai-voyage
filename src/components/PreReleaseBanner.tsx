import React, { useState, useEffect } from 'react';
import { X, Zap } from 'lucide-react';

const STORAGE_KEY = 'prerelease-banner-dismissed-v1';

const PreReleaseBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!visible) return null;

  return (
    <div className="relative shrink-0 bg-gradient-to-r from-amber-300 via-orange-200 to-amber-300 border-b border-amber-400/40 px-4 py-2 shadow-md">
      <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          <Zap className="h-4 w-4 text-amber-800 shrink-0 fill-amber-600" />
          <span className="text-sm font-semibold text-amber-900 truncate">
            Pre-Release Mode — 300 free credits daily, no charge!
          </span>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-md p-1 hover:bg-black/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5 text-amber-900" />
        </button>
      </div>
    </div>
  );
};

export default PreReleaseBanner;
