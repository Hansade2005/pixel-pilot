'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function NotificationDebugPage() {
  const [support, setSupport] = useState<any>({});
  const [swState, setSwState] = useState<string>('checking...');
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 20));
  };

  useEffect(() => {
    checkSupport();
    checkServiceWorker();
  }, []);

  const checkSupport = () => {
    const checks = {
      notifications: 'Notification' in window,
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      permission: Notification?.permission || 'unknown'
    };
    setSupport(checks);
    setPermission(Notification?.permission || 'default');
    addLog(`Support checked: ${JSON.stringify(checks)}`);
  };

  const checkServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          setSwState(`✅ Registered (${registration.active?.state || 'unknown'})`);
          addLog('Service worker found and active');
        } else {
          setSwState('❌ Not registered');
          addLog('Service worker not registered');
        }
      } catch (error) {
        setSwState('❌ Error checking');
        addLog(`Error: ${error}`);
      }
    } else {
      setSwState('❌ Not supported');
      addLog('Service workers not supported');
    }
  };

  const requestPermission = async () => {
    addLog('Requesting notification permission...');
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      addLog(`Permission result: ${result}`);
      return result;
    } catch (error) {
      addLog(`Permission error: ${error}`);
      return 'denied';
    }
  };

  const registerServiceWorker = async () => {
    addLog('Attempting to register service worker...');
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        addLog(`Service worker registered: ${registration.scope}`);
        setSwState('✅ Registered');
        
        // Wait for active
        await navigator.serviceWorker.ready;
        addLog('Service worker ready');
        checkServiceWorker();
      }
    } catch (error) {
      addLog(`Registration failed: ${error}`);
    }
  };

  const testSubscribe = async () => {
    addLog('Starting subscription test...');
    
    try {
      // 1. Check permission
      let perm = permission;
      if (perm !== 'granted') {
        addLog('Requesting permission...');
        perm = await requestPermission();
      }

      if (perm !== 'granted') {
        addLog('❌ Permission denied');
        return;
      }

      addLog('✅ Permission granted');

      // 2. Wait for service worker
      addLog('Waiting for service worker...');
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout after 10s')), 10000)
        )
      ]);
      addLog('✅ Service worker ready');

      // 3. Subscribe to push
      addLog('Subscribing to push...');
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
      addLog(`Using VAPID key: ${vapidKey.substring(0, 20)}...`);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });

      addLog('✅ Push subscription created');
      addLog(`Endpoint: ${subscription.endpoint.substring(0, 50)}...`);

      // 4. Send to server
      addLog('Sending subscription to server...');
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          deviceType: 'desktop',
          browser: 'test'
        })
      });

      if (response.ok) {
        addLog('✅ Subscription saved to server');
      } else {
        const error = await response.text();
        addLog(`❌ Server error: ${response.status} - ${error}`);
      }

    } catch (error: any) {
      addLog(`❌ Error: ${error.message || error}`);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Push Notification Debug</h1>

      {/* Support Check */}
      <Card>
        <CardHeader>
          <CardTitle>Browser Support</CardTitle>
          <CardDescription>Check if your browser supports push notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Notifications API:</span>
            <Badge variant={support.notifications ? 'default' : 'destructive'}>
              {support.notifications ? '✅ Supported' : '❌ Not Supported'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Service Worker:</span>
            <Badge variant={support.serviceWorker ? 'default' : 'destructive'}>
              {support.serviceWorker ? '✅ Supported' : '❌ Not Supported'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Push Manager:</span>
            <Badge variant={support.pushManager ? 'default' : 'destructive'}>
              {support.pushManager ? '✅ Supported' : '❌ Not Supported'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Permission:</span>
            <Badge variant={permission === 'granted' ? 'default' : permission === 'denied' ? 'destructive' : 'secondary'}>
              {permission}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Service Worker Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Worker Status</CardTitle>
          <CardDescription>Current state of the service worker</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-lg">{swState}</div>
          <div className="flex gap-2">
            <Button onClick={checkServiceWorker} variant="outline">
              Refresh Status
            </Button>
            <Button onClick={registerServiceWorker} variant="secondary">
              Register Service Worker
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Test Actions</CardTitle>
          <CardDescription>Test each step of the notification flow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={requestPermission}>
              1. Request Permission
            </Button>
            <Button onClick={registerServiceWorker}>
              2. Register Service Worker
            </Button>
            <Button onClick={testSubscribe} className="col-span-2">
              3. Test Full Subscription Flow
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Logs</CardTitle>
          <CardDescription>Real-time log of all operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 font-mono text-xs p-4 rounded-lg h-64 overflow-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1">{log}</div>
              ))
            )}
          </div>
          <Button 
            onClick={() => setLogs([])} 
            variant="outline" 
            size="sm" 
            className="mt-2"
          >
            Clear Logs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
