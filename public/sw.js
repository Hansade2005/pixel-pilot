// Service Worker with Push Notification Support
// This file is enhanced with push notification handling for next-pwa

self.addEventListener('install', (event) => {
  console.log('Service Worker installing with push notification support.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // The actual fetch handling will be done by next-pwa's generated service worker
  event.respondWith(fetch(event.request));
});

// ============================================
// PUSH NOTIFICATION HANDLERS
// ============================================

// Handle incoming push notifications
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push notification received');
  
  if (!event.data) {
    console.log('[Service Worker] Push notification had no data');
    return;
  }

  let notificationData;
  try {
    notificationData = event.data.json();
  } catch (error) {
    console.error('[Service Worker] Error parsing push data:', error);
    notificationData = {
      title: 'PiPilot Notification',
      body: event.data.text() || 'You have a new notification'
    };
  }

  const options = {
    body: notificationData.body || 'You have a new notification',
    icon: notificationData.icon || '/icons/icon-192x192.png',
    badge: notificationData.badge || '/icons/icon-72x72.png',
    image: notificationData.image,
    vibrate: notificationData.vibrate || [200, 100, 200],
    data: notificationData.data || { url: '/' },
    actions: notificationData.actions || [
      {
        action: 'open',
        title: 'Open',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Dismiss'
      }
    ],
    tag: notificationData.tag || 'pipilot-notification',
    requireInteraction: notificationData.requireInteraction || false,
    silent: notificationData.silent || false
  };

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || 'PiPilot Notification',
      options
    )
  );
});

// Handle notification click events
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'close') {
    // User dismissed the notification
    return;
  }

  // Default action or 'open' action
  const urlToOpen = event.notification.data?.url || '/workspace';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Focus existing window and navigate
            return client.focus().then(() => {
              if ('navigate' in client) {
                return client.navigate(urlToOpen);
              }
            });
          }
        }
        // No window found, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close events (for analytics)
self.addEventListener('notificationclose', function(event) {
  console.log('[Service Worker] Notification closed:', event.notification.tag);
  
  // You can track notification dismissals here if needed
  // event.waitUntil(
  //   fetch('/api/notifications/analytics', {
  //     method: 'POST',
  //     body: JSON.stringify({
  //       event: 'closed',
  //       notification_id: event.notification.data?.id
  //     })
  //   })
  // );
});
