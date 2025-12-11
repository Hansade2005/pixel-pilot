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
        setIsSupported(
          typeof window.OneSignal?.isPushNotificationsSupported === 'function'
            ? window.OneSignal.isPushNotificationsSupported()
            : !!window.OneSignal
        );

        // Determine subscription status using available OneSignal APIs
        let isSubscribedResult = false;

        if (typeof window.OneSignal?.isPushNotificationsEnabled === 'function') {
          try {
            isSubscribedResult = !!(await window.OneSignal.isPushNotificationsEnabled());
          } catch (err) {
            // If this call throws, fall back to other checks
            console.warn('isPushNotificationsEnabled threw:', err);
          }
        }

        if (!isSubscribedResult && typeof window.OneSignal?.getUserId === 'function') {
          try {
            const userId = await window.OneSignal.getUserId();
            isSubscribedResult = !!userId;
          } catch (err) {
            console.warn('getUserId threw:', err);
          }
        }

        // Legacy Notifications API fallback
        if (!isSubscribedResult && window.OneSignal?.Notifications && typeof window.OneSignal.Notifications.getSubscription === 'function') {
          try {
            isSubscribedResult = !!(await window.OneSignal.Notifications.getSubscription());
          } catch (err) {
            console.warn('Notifications.getSubscription threw:', err);
          }
        }

        setIsSubscribed(!!isSubscribedResult);

        // Listen for subscription changes using modern API if available
        if (typeof window.OneSignal?.on === 'function') {
          window.OneSignal.on('subscriptionChange', (isSubscribed: boolean) => setIsSubscribed(!!isSubscribed));
        } else if (window.OneSignal?.Notifications && typeof window.OneSignal.Notifications.addEventListener === 'function') {
          window.OneSignal.Notifications.addEventListener('subscriptionChange', (isSubscribed: boolean) => setIsSubscribed(!!isSubscribed));
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

      // Use modern registerForPushNotifications if available
      if (typeof window.OneSignal.registerForPushNotifications === 'function') {
        await window.OneSignal.registerForPushNotifications();
      } else if (window.OneSignal?.Notifications && typeof window.OneSignal.Notifications.requestPermission === 'function') {
        await window.OneSignal.Notifications.requestPermission();
      } else if (typeof Notification !== 'undefined' && Notification.requestPermission) {
        await Notification.requestPermission();
      }

      // Re-check subscription state using the same robust approach as above
      let subscribed = false;
      if (typeof window.OneSignal.isPushNotificationsEnabled === 'function') {
        subscribed = !!(await window.OneSignal.isPushNotificationsEnabled());
      }
      if (!subscribed && typeof window.OneSignal.getUserId === 'function') {
        const uid = await window.OneSignal.getUserId();
        subscribed = !!uid;
      }
      if (!subscribed && window.OneSignal?.Notifications && typeof window.OneSignal.Notifications.getSubscription === 'function') {
        subscribed = !!(await window.OneSignal.Notifications.getSubscription());
      }

      setIsSubscribed(!!subscribed);
      return !!subscribed;
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
      if (typeof window.OneSignal.setSubscription === 'function') {
        await window.OneSignal.setSubscription(false);
      } else if (window.OneSignal?.Notifications && typeof window.OneSignal.Notifications.setSubscription === 'function') {
        await window.OneSignal.Notifications.setSubscription(false);
      }
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