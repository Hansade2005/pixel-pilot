'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  XCircle, 
  Download, 
  RefreshCw, 
  Wifi, 
  WifiOff,
  Smartphone,
  Monitor,
  Globe
} from 'lucide-react';
import { usePWA } from '@/hooks/use-pwa';

export function PWAStatus() {
  const { isInstallable, isInstalled, isOnline, install } = usePWA();
  const [serviceWorkerRegistered, setServiceWorkerRegistered] = useState(false);
  const [cacheSize, setCacheSize] = useState<number | null>(null);
  const [displayMode, setDisplayMode] = useState<'browser' | 'standalone'>('browser');

  useEffect(() => {
    // Check service worker registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        setServiceWorkerRegistered(registrations.length > 0);
      });
    }

    // Check display mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setDisplayMode('standalone');
    }

    // Estimate cache size
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        if (estimate.usage) {
          setCacheSize(Math.round(estimate.usage / 1024 / 1024)); // Convert to MB
        }
      });
    }
  }, []);

  const handleInstall = async () => {
    const result = await install();
    if (result.success) {
      alert('App installed successfully!');
    }
  };

  const handleClearCache = async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      setCacheSize(0);
      alert('Cache cleared successfully!');
      window.location.reload();
    }
  };

  const handleUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.update();
        });
        alert('Checking for updates...');
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            PWA Status
          </CardTitle>
          <CardDescription>
            Progressive Web App features and capabilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Installation Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              {isInstalled ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <Download className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className="font-medium">Installation</p>
                <p className="text-sm text-gray-500">
                  {isInstalled ? 'App is installed' : 'Not installed'}
                </p>
              </div>
            </div>
            {isInstalled ? (
              <Badge variant="default" className="bg-green-500">Installed</Badge>
            ) : isInstallable ? (
              <Button size="sm" onClick={handleInstall}>
                Install Now
              </Button>
            ) : (
              <Badge variant="secondary">Not Available</Badge>
            )}
          </div>

          {/* Service Worker Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              {serviceWorkerRegistered ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <div>
                <p className="font-medium">Service Worker</p>
                <p className="text-sm text-gray-500">
                  {serviceWorkerRegistered ? 'Active' : 'Not registered'}
                </p>
              </div>
            </div>
            {serviceWorkerRegistered && (
              <Button size="sm" variant="outline" onClick={handleUpdate}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Update
              </Button>
            )}
          </div>

          {/* Network Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-yellow-500" />
              )}
              <div>
                <p className="font-medium">Network</p>
                <p className="text-sm text-gray-500">
                  {isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            <Badge variant={isOnline ? "default" : "secondary"}>
              {isOnline ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>

          {/* Display Mode */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              {displayMode === 'standalone' ? (
                <Smartphone className="w-5 h-5 text-blue-500" />
              ) : (
                <Monitor className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className="font-medium">Display Mode</p>
                <p className="text-sm text-gray-500">
                  {displayMode === 'standalone' ? 'Standalone app' : 'Browser mode'}
                </p>
              </div>
            </div>
            <Badge variant={displayMode === 'standalone' ? "default" : "secondary"}>
              {displayMode === 'standalone' ? 'App Mode' : 'Browser'}
            </Badge>
          </div>

          {/* Cache Information */}
          {cacheSize !== null && (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium">Cache Size</p>
                  <p className="text-sm text-gray-500">
                    {cacheSize} MB cached
                  </p>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleClearCache}
                className="text-red-600 hover:text-red-700"
              >
                Clear Cache
              </Button>
            </div>
          )}

          {/* PWA Features */}
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3">Available Features</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Offline Support</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Fast Loading</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Auto Updates</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Home Screen</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Caching</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Cross-Platform</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
