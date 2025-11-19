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
      // Set up event listeners using the correct OneSignal API
      try {
        // Check if OneSignal.Notifications is available
        if (window.OneSignal.Notifications) {
          window.OneSignal.Notifications.addEventListener('subscriptionChange', function(isSubscribed: boolean) {
            console.log('OneSignal subscription changed:', isSubscribed);
          });

          window.OneSignal.Notifications.addEventListener('foregroundWillDisplay', function(event: any) {
            console.log('OneSignal notification will display:', event);
          });

          window.OneSignal.Notifications.addEventListener('dismiss', function(event: any) {
            console.log('OneSignal notification dismissed:', event);
          });
        }
      } catch (error) {
        console.warn('OneSignal event listeners setup failed:', error);
      }
    }
  }, []);

  return null;
}