'use client';

import { useEffect } from 'react';

export function ServiceWorkerProvider() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.workbox !== undefined
    ) {
      const wb = window.workbox;
      
      // Add event listeners for service worker updates
      wb.addEventListener('installed', (event: any) => {
        console.log('[SW] Service worker installed:', event);
      });

      wb.addEventListener('controlling', (event: any) => {
        console.log('[SW] Service worker controlling:', event);
      });

      wb.addEventListener('activated', (event: any) => {
        console.log('[SW] Service worker activated:', event);
      });

      // Register the service worker
      wb.register();
    }
  }, []);

  return null;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    workbox: any;
  }
}
