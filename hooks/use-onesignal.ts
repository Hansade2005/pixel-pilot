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
        const isSubscribed = await window.OneSignal.getSubscription();
        setIsSubscribed(isSubscribed);

        // Listen for subscription changes
        window.OneSignal.on('subscriptionChange', (isSubscribed: boolean) => {
          setIsSubscribed(isSubscribed);
        });
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
      await window.OneSignal.showSlidedownPrompt();
      const isSubscribed = await window.OneSignal.getSubscription();
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
      await window.OneSignal.setSubscription(false);
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
    if (!window.OneSignal) return;

    try {
      await window.OneSignal.sendSelfNotification(
        'Test Notification',
        'This is a test notification from PiPilot!',
        'https://pipilot.dev',
        {
          icon: '/logo.png',
          badge: '/logo.png'
        }
      );
    } catch (error) {
      console.error('Error sending test notification:', error);
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