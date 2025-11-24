'use client';

import { useState, useEffect, useTransition, useMemo, useCallback, memo } from 'react';
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
import { toast } from 'sonner';
import { useOneSignal } from '@/hooks/use-onesignal';

interface Notification {
  id: string;
  title: string;
  message: string;
  body?: string;
  type: string;
  url?: string;
  image_url?: string;
  icon?: string;
  priority: number;
  is_read: boolean;
  read?: boolean;
  read_at?: string;
  expires_at?: string;
  created_at: string;
}

interface NotificationPreferences {
  push_enabled: boolean;
  email_enabled: boolean;
  morning_reminders: boolean;
  project_reminders: boolean;
  tips_and_features: boolean;
  achievement_notifications: boolean;
}

export const NotificationCenter = memo(function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push_enabled: false,
    email_enabled: true,
    morning_reminders: true,
    project_reminders: true,
    tips_and_features: true,
    achievement_notifications: true,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isPending, startTransition] = useTransition();

  const supabase = useMemo(() => createClient(), []);

  // OneSignal integration
  const {
    isSupported: oneSignalSupported,
    isSubscribed: oneSignalSubscribed,
    isLoading: oneSignalLoading,
    subscribe: subscribeOneSignal,
    unsubscribe: unsubscribeOneSignal,
    sendTestNotification: sendOneSignalTest
  } = useOneSignal();

  // Load notifications from database
  const loadNotifications = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, [supabase]);

  // Load preferences
  const loadPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications((prev: Notification[]) =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev: number) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [supabase]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      setNotifications((prev: Notification[]) => 
        prev.map(n => ({ ...n, is_read: true, read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [supabase]);

  // Handle notification click
  const handleNotificationClick = useCallback((notification: Notification) => {
    if (!notification.is_read && !notification.read) {
      markAsRead(notification.id);
    }
    if (notification.url) {
      window.location.href = notification.url;
    }
    setIsOpen(false);
  }, [markAsRead]);

  // Handle toggle preference
  const handleTogglePreference = useCallback(async (key: string, value: boolean) => {
    try {
      const updated = { ...preferences, [key]: value };
      
      // Optimistically update UI
      startTransition(() => {
        setPreferences(updated);
      });

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
      // Revert on error
      loadPreferences();
    }
  }, [preferences, startTransition]);

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
    loadPreferences();
  }, [loadNotifications, loadPreferences]);

  // Set up real-time subscription for new notifications
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('user_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications((prev: Notification[]) => [newNotification, ...prev]);
            setUnreadCount((prev: number) => prev + 1);

            // Show toast notification
            toast(newNotification.title, {
              description: newNotification.message || newNotification.body,
              action: newNotification.url ? {
                label: 'View',
                onClick: () => window.open(newNotification.url, '_blank'),
              } : undefined,
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscription();
  }, [supabase]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'success': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'announcement': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'feature': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      case 'maintenance': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'security': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (!oneSignalSupported) {
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
                    onClick={markAllAsRead}
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
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-700 last:border-0 ${
                      !notification.is_read && !notification.read ? 'bg-indigo-500/5' : ''
                    }`}
                  >
                    <div className="flex gap-3 w-full">
                      <div className="flex-shrink-0">
                        {notification.icon || notification.image_url ? (
                          <img
                            src={notification.icon || notification.image_url}
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
                          {!notification.is_read && !notification.read && (
                            <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                          {notification.message || notification.body}...
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-xs text-gray-500 flex-1">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.location.href = `/notifications?id=${notification.id}`
                            }}
                            className="h-6 px-2 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                          >
                            Read
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
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
              {oneSignalSupported && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Browser Push Notifications</p>
                    <p className="text-xs text-gray-400">Receive push notifications in your browser</p>
                  </div>
                  <Button
                    size="sm"
                    variant={oneSignalSubscribed ? "outline" : "default"}
                    onClick={oneSignalSubscribed ? unsubscribeOneSignal : subscribeOneSignal}
                    disabled={oneSignalLoading}
                    className="text-xs"
                  >
                    {oneSignalLoading ? '...' : oneSignalSubscribed ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              )}

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

              {oneSignalSupported && oneSignalSubscribed && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={sendOneSignalTest}
                  className="w-full"
                >
                  Send Test Push Notification
                </Button>
              )}

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
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});