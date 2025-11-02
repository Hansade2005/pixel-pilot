'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function PWAUpdatePrompt() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is installed but waiting to activate
                setWaitingWorker(newWorker);
                setShowUpdatePrompt(true);
              }
            });
          }
        });
      });

      // Handle controller change (when new service worker takes over)
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      // Send skip waiting message to the waiting service worker
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setShowUpdatePrompt(false);
    }
  };

  if (!showUpdatePrompt) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-4 max-w-md w-full mx-4 animate-in slide-in-from-top-5 duration-500 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-gray-900 dark:text-white font-semibold text-base mb-1">
            Update Available
          </h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
            A new version of PiPilot is available. Update now for the latest features and improvements.
          </p>
          
          <div className="flex gap-2">
            <Button
              onClick={handleUpdate}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Update Now
            </Button>
            <Button
              onClick={() => setShowUpdatePrompt(false)}
              variant="outline"
              className="flex-1"
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
