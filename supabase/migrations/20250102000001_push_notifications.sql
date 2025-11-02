-- Push Notification System Schema
-- This creates tables for managing push notifications, subscriptions, and user engagement

-- ============================================
-- 1. Push Notification Subscriptions
-- ============================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  browser TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 2. Notification Templates
-- ============================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN (
    'morning_motivation', 'evening_reminder', 'project_continuation',
    'achievement', 'tip_of_day', 'feature_highlight', 'milestone',
    'encouragement', 'productivity', 'learning', 'community',
    'update', 'welcome', 'onboarding', 'reengagement'
  )),
  subcategory TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT DEFAULT '/icons/icon-192x192.png',
  badge TEXT DEFAULT '/icons/icon-72x72.png',
  image TEXT,
  url TEXT DEFAULT '/',
  priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  requires_user_data BOOLEAN DEFAULT false,
  requires_project_data BOOLEAN DEFAULT false,
  variables JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. User Notification Preferences
-- ============================================
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  enabled BOOLEAN DEFAULT true,
  morning_reminders BOOLEAN DEFAULT true,
  morning_time TIME DEFAULT '09:00:00',
  evening_reminders BOOLEAN DEFAULT false,
  evening_time TIME DEFAULT '18:00:00',
  project_reminders BOOLEAN DEFAULT true,
  achievement_notifications BOOLEAN DEFAULT true,
  tips_and_features BOOLEAN DEFAULT true,
  community_updates BOOLEAN DEFAULT true,
  marketing BOOLEAN DEFAULT false,
  frequency TEXT DEFAULT 'optimal' CHECK (frequency IN ('minimal', 'optimal', 'maximum')),
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT DEFAULT 'America/Toronto',
  preferred_categories TEXT[] DEFAULT ARRAY['morning_motivation', 'project_continuation', 'tip_of_day']::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. Notification Queue
-- ============================================
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES notification_templates(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT,
  badge TEXT,
  image TEXT,
  url TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. Notification Analytics
-- ============================================
CREATE TABLE IF NOT EXISTS notification_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES notification_templates(id) ON DELETE CASCADE,
  notification_id UUID REFERENCES notification_queue(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'clicked', 'closed', 'failed')),
  device_type TEXT,
  browser TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. User Activity Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'login', 'logout', 'project_created', 'project_opened', 
    'project_updated', 'code_generated', 'template_used',
    'feature_used', 'page_viewed', 'session_start', 'session_end'
  )),
  project_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. User Engagement Scores
-- ============================================
CREATE TABLE IF NOT EXISTS user_engagement_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  overall_score INTEGER DEFAULT 0,
  activity_score INTEGER DEFAULT 0,
  notification_interaction_score INTEGER DEFAULT 0,
  project_completion_score INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_active_at TIMESTAMP WITH TIME ZONE,
  last_notification_clicked_at TIMESTAMP WITH TIME ZONE,
  total_projects INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  avg_session_duration_minutes INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_notification_templates_category ON notification_templates(category);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_scheduled ON notification_queue(user_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_user_id ON notification_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_event_type ON notification_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_engagement_scores_user_id ON user_engagement_scores(user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_push_subscriptions_updated_at 
  BEFORE UPDATE ON push_subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at 
  BEFORE UPDATE ON notification_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_preferences_updated_at 
  BEFORE UPDATE ON user_notification_preferences 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_engagement_scores_updated_at 
  BEFORE UPDATE ON user_engagement_scores 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_engagement_scores ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own subscriptions
CREATE POLICY "Users can manage own subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Users can manage their own preferences
CREATE POLICY "Users can manage own preferences" ON user_notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Users can view their own notification queue
CREATE POLICY "Users can view own notifications" ON notification_queue
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own analytics
CREATE POLICY "Users can view own analytics" ON notification_analytics
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own activity log
CREATE POLICY "Users can view own activity" ON user_activity_log
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own engagement scores
CREATE POLICY "Users can view own engagement" ON user_engagement_scores
  FOR SELECT USING (auth.uid() = user_id);
