'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Bell, BellOff, Settings, Check, X } from 'lucide-react';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  read: boolean;
  created_at: string;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    sendTestNotification
  } = usePushNotifications();

  const supabase = createClient();

  // Load notifications
  useEffect(() => {
    loadNotifications();
  }, []);

  // Load user preferences
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // For now, create mock notifications
      // In production, this would fetch from notification_queue table
      const mockNotifications: Notification[] = [
        {
          id: '1',
          title: '🌅 Good Morning!',
          body: 'Ready to build something amazing today?',
          icon: '/icons/icon-192x192.png',
          url: '/workspace',
          read: false,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          title: '💡 Pro Tip',
          body: 'Use AI autocomplete to code 10x faster!',
          icon: '/icons/icon-192x192.png',
          url: '/docs/tips',
          read: false,
          created_at: new Date(Date.now() - 3600000).toISOString()
        }
      ];

      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handleEnableNotifications = async () => {
    const success = await subscribe();
    if (success) {
      toast.success('🔔 Notifications enabled!');
      await sendTestNotification();
    } else {
      toast.error('Failed to enable notifications');
    }
  };

  const handleDisableNotifications = async () => {
    const success = await unsubscribe();
    if (success) {
      toast.success('Notifications disabled');
    } else {
      toast.error('Failed to disable notifications');
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    if (notification.url) {
      window.location.href = notification.url;
    }
    setIsOpen(false);
  };

  const handleTogglePreference = async (key: string, value: boolean) => {
    try {
      const updated = { ...preferences, [key]: value };
      setPreferences(updated);

      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      toast.success('Preferences updated');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
    }
  };

  if (!isSupported) {
    return (
      <button className="text-white hover:text-gray-300 transition-colors relative">
        <BellOff className="w-5 h-5" />
      </button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button className="text-white hover:text-gray-300 transition-colors relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center p-0 text-[10px] bg-red-500 border-none"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-gray-800 border-gray-700 max-h-[500px] overflow-hidden">
        {!showSettings ? (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-gray-400">{unreadCount} unread</p>
                )}
              </div>
              <div className="flex gap-1">
                {unreadCount > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleMarkAllAsRead}
                    className="h-7 text-xs"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Mark all
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowSettings(true)}
                  className="h-7 px-2"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Enable/Disable Section */}
            {!isSubscribed && permission !== 'denied' && (
              <div className="p-4 bg-indigo-500/10 border-b border-gray-700">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-indigo-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white mb-1">
                      Enable Push Notifications
                    </p>
                    <p className="text-xs text-gray-400 mb-3">
                      Get timely reminders and updates about your projects
                    </p>
                    <Button
                      size="sm"
                      onClick={handleEnableNotifications}
                      disabled={isLoading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                      {isLoading ? 'Enabling...' : 'Enable Notifications'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {permission === 'denied' && (
              <div className="p-4 bg-yellow-500/10 border-b border-gray-700">
                <div className="flex items-start gap-3">
                  <BellOff className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white mb-1">
                      Notifications Blocked
                    </p>
                    <p className="text-xs text-gray-400">
                      Enable notifications in your browser settings to receive updates
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications List */}
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <div className="text-sm">No notifications yet</div>
                  <p className="text-xs mt-1">
                    We'll notify you about important updates
                  </p>
                </div>
              ) : (
                notifications.map(notification => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`p-4 cursor-pointer ${
                      !notification.read ? 'bg-indigo-500/5' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3 w-full">
                      <div className="flex-shrink-0">
                        {notification.icon ? (
                          <img
                            src={notification.icon}
                            alt=""
                            className="w-10 h-10 rounded-lg"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                            <Bell className="w-5 h-5 text-indigo-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-medium text-white truncate">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                          {notification.body}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            {/* Settings View */}
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-white">Notification Settings</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSettings(false)}
                className="h-7 px-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
              {isSubscribed && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Push Notifications</p>
                    <p className="text-xs text-gray-400">Receive browser notifications</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDisableNotifications}
                    className="text-xs"
                  >
                    Disable
                  </Button>
                </div>
              )}

              {preferences && (
                <>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">Morning Reminders</p>
                      <p className="text-xs text-gray-400">Daily motivation at 9 AM</p>
                    </div>
                    <Switch
                      checked={preferences.morning_reminders}
                      onCheckedChange={(checked) => handleTogglePreference('morning_reminders', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white">Project Reminders</p>
                    <Switch
                      checked={preferences.project_reminders}
                      onCheckedChange={(checked) => handleTogglePreference('project_reminders', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white">Tips & Features</p>
                    <Switch
                      checked={preferences.tips_and_features}
                      onCheckedChange={(checked) => handleTogglePreference('tips_and_features', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white">Achievements</p>
                    <Switch
                      checked={preferences.achievement_notifications}
                      onCheckedChange={(checked) => handleTogglePreference('achievement_notifications', checked)}
                    />
                  </div>

                  <DropdownMenuSeparator className="bg-gray-700" />

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={sendTestNotification}
                    disabled={!isSubscribed}
                    className="w-full"
                  >
                    Send Test Notification
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowSettings(false);
                      window.location.href = '/settings/notifications';
                    }}
                    className="w-full mt-2"
                  >
                    Advanced Settings & Preview
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
