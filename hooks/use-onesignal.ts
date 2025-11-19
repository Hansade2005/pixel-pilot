'use client';

import { useEffect, useState, useCallback } from 'react';

declare global {
  interface Window {
    OneSignal?: any;
  }
}

export interface OneSignalHook {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  sendTestNotification: () => Promise<void>;
}

export function useOneSignal(): OneSignalHook {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check OneSignal support and subscription status
  useEffect(() => {
    const checkOneSignal = async () => {
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }

      // Wait for OneSignal to be available
      const waitForOneSignal = () => {
        return new Promise<void>((resolve) => {
          if (window.OneSignal) {
            resolve();
            return;
          }

          const checkInterval = setInterval(() => {
            if (window.OneSignal) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);

          // Timeout after 10 seconds
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, 10000);
        });
      };

      await waitForOneSignal();

      if (!window.OneSignal) {
        setIsLoading(false);
        return;
      }

      try {
        setIsSupported(true);

        // Check if user is subscribed
        const isSubscribed = await window.OneSignal.Notifications.getSubscription();
        setIsSubscribed(isSubscribed);

        // Listen for subscription changes using the correct API
        if (window.OneSignal.Notifications) {
          window.OneSignal.Notifications.addEventListener('subscriptionChange', (isSubscribed: boolean) => {
            setIsSubscribed(isSubscribed);
          });
        }
      } catch (error) {
        console.error('Error checking OneSignal status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkOneSignal();
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!window.OneSignal) return false;

    try {
      setIsLoading(true);
      await window.OneSignal.Notifications.requestPermission();
      const isSubscribed = await window.OneSignal.Notifications.getSubscription();
      setIsSubscribed(isSubscribed);
      return isSubscribed;
    } catch (error) {
      console.error('Error subscribing to OneSignal:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!window.OneSignal) return false;

    try {
      setIsLoading(true);
      await window.OneSignal.Notifications.setSubscription(false);
      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error('Error unsubscribing from OneSignal:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendTestNotification = useCallback(async (): Promise<void> => {
    // OneSignal Web SDK doesn't support sending notifications from client-side
    // This is only available via REST API from server-side
    console.log('Test notification: OneSignal Web SDK does not support client-side notification sending. Use REST API for server-side notifications.');

    // Fallback: try to show a browser notification if permission granted
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Test Notification', {
          body: 'This is a test notification from PiPilot!',
          icon: '/logo.png'
        });
      } else if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification('Test Notification', {
            body: 'This is a test notification from PiPilot!',
            icon: '/logo.png'
          });
        }
      }
    } catch (error) {
      console.error('Error showing browser notification:', error);
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}