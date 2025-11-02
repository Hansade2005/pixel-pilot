'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface PushNotificationHook {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  requestPermission: () => Promise<NotificationPermission>;
  sendTestNotification: () => Promise<void>;
}

export function usePushNotifications(): PushNotificationHook {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const supabase = createClient();

  // Check browser support
  useEffect(() => {
    const checkSupport = () => {
      const supported = 
        'Notification' in window &&
        'serviceWorker' in navigator &&
        'PushManager' in window;
      
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  // Check existing subscription
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported) {
        setIsLoading(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(subscription !== null);
      } catch (error) {
        console.error('Error checking subscription:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isSupported) {
      checkSubscription();
    }
  }, [isSupported]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Error requesting permission:', error);
      return 'denied';
    }
  }, [isSupported]);

  // Convert VAPID key
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.error('Push notifications not supported');
      return false;
    }

    setIsLoading(true);

    try {
      // Request permission if needed
      let perm = permission;
      if (perm !== 'granted') {
        perm = await requestPermission();
      }

      if (perm !== 'granted') {
        console.log('Notification permission denied');
        setIsLoading(false);
        return false;
      }

      // Wait for service worker
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
        'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Send subscription to server
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          deviceType: /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          browser: navigator.userAgent.match(/(firefox|msie|chrome|safari|trident)/gi)?.[0] || 'unknown'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      setIsSubscribed(true);
      setIsLoading(false);
      
      // Track subscription event
      await supabase.from('user_activity_log').insert({
        activity_type: 'feature_used',
        metadata: { feature: 'push_notifications_subscribed' }
      });

      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, permission, requestPermission, supabase]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Remove from server
        await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint
          })
        });
      }

      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      setIsLoading(false);
      return false;
    }
  }, [isSupported]);

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    if (!isSubscribed || permission !== 'granted') {
      console.error('Not subscribed or no permission');
      return;
    }

    try {
      // Show local notification immediately
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('🎉 PiPilot Notification Test', {
        body: 'Great! Push notifications are working perfectly!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: {
          url: '/workspace',
          timestamp: Date.now()
        },
        actions: [
          {
            action: 'open',
            title: 'Open Workspace'
          },
          {
            action: 'close',
            title: 'Dismiss'
          }
        ]
      } as NotificationOptions & { actions?: { action: string; title: string }[] });
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }, [isSubscribed, permission]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    requestPermission,
    sendTestNotification
  };
}
