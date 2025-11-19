'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
  }
}

export function OneSignalProvider() {
  useEffect(() => {
    // OneSignal is now initialized directly in the head script
    // This provider just handles additional setup and event listeners
    if (typeof window !== 'undefined' && window.OneSignal) {
      // Optional: Set up additional event listeners
      window.OneSignal.on('subscriptionChange', function(isSubscribed: boolean) {
        console.log('OneSignal subscription changed:', isSubscribed);
      });

      window.OneSignal.on('notificationDisplay', function(event: any) {
        console.log('OneSignal notification displayed:', event);
      });

      window.OneSignal.on('notificationDismiss', function(event: any) {
        console.log('OneSignal notification dismissed:', event);
      });
    }
  }, []);

  return null;
}