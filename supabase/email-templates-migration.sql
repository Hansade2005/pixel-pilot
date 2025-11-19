-- Email templates and campaigns migration
-- Run this in your Supabase SQL editor

-- Email templates table for admin email campaigns
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('welcome', 'notification', 'marketing', 'newsletter', 'security', 'feature', 'billing', 'support')),
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Email campaigns table
CREATE TABLE IF NOT EXISTS public.email_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('notification', 'marketing', 'newsletter', 'security', 'feature', 'billing', 'support', 'welcome')),
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    recipient_filters JSONB DEFAULT '{}'::jsonb,
    recipient_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'completed', 'failed', 'cancelled')),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Email campaign recipients table
CREATE TABLE IF NOT EXISTS public.email_campaign_recipients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    email TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained')),
    sent_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies (only admins can manage email templates and campaigns)
CREATE POLICY "Allow admin access to email_templates" ON public.email_templates
    FOR ALL USING (auth.jwt() ->> 'email' IN ('hanscadx8@gmail.com', 'hansade2005@gmail.com'));

CREATE POLICY "Allow admin access to email_campaigns" ON public.email_campaigns
    FOR ALL USING (auth.jwt() ->> 'email' IN ('hanscadx8@gmail.com', 'hansade2005@gmail.com'));

CREATE POLICY "Allow admin access to email_campaign_recipients" ON public.email_campaign_recipients
    FOR ALL USING (auth.jwt() ->> 'email' IN ('hanscadx8@gmail.com', 'hansade2005@gmail.com'));

-- Insert default email templates
INSERT INTO public.email_templates (name, type, subject, content, variables) VALUES
('Welcome New Users', 'welcome', 'Welcome to Pixel Pilot! 🎉', 'Hi {{name}},

Welcome to Pixel Pilot! We''re excited to have you join our community of developers and creators.

Here''s what you can do to get started:
• Explore our AI-powered coding features
• Create your first project
• Join our community forums
• Check out our documentation

If you have any questions, feel free to reach out to our support team.

Happy coding!
The Pixel Pilot Team', '["name"]'::jsonb),

('New Feature Announcement', 'feature', '🚀 New Feature: {{feature_name}} is now available!', 'Hi {{name}},

We''re thrilled to announce that {{feature_name}} is now available in Pixel Pilot!

{{content}}

Try it out today and let us know what you think!

Best regards,
The Pixel Pilot Team', '["name", "feature_name", "content", "try_url"]'::jsonb),

('Security Alert', 'security', '🔒 Security Alert: {{title}}', 'Hi {{name}},

{{content}}

For your account security, we recommend:
• Change your password immediately
• Review your recent account activity
• Enable two-factor authentication if not already enabled

If you didn''t initiate this activity, please contact our support team immediately.

Stay safe,
The Pixel Pilot Team', '["name", "title", "content", "action_url"]'::jsonb),

('Monthly Newsletter', 'newsletter', '📧 {{title}}', 'Hi {{name}},

{{content}}

What''s New This Month:
• Feature updates and improvements
• Community highlights
• Tips and best practices

{{unsubscribe_content}}

Best regards,
The Pixel Pilot Team', '["name", "title", "content", "unsubscribe_content", "unsubscribe_url"]'::jsonb);