import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// Server-side Pusher instance
export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

// Client-side Pusher instance
export const pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
});

// Helper function to trigger notifications
export const triggerNotification = async (
  channel: string,
  event: string,
  data: any
) => {
  try {
    await pusher.trigger(channel, event, data);
  } catch (error) {
    console.error('Error triggering Pusher event:', error);
  }
};

// Helper function to trigger user-specific notifications
export const triggerUserNotification = async (
  userId: string,
  notification: any
) => {
  await triggerNotification(`user-${userId}`, 'notification', notification);
};

// Helper function to trigger admin notifications
export const triggerAdminNotification = async (
  notification: any
) => {
  await triggerNotification('admin-notifications', 'new-notification', notification);
};