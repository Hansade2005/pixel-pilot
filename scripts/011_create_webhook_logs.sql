-- Create webhook_logs table for tracking Stripe webhook events
-- This prevents duplicate processing and provides monitoring capabilities

CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    event_id TEXT NOT NULL UNIQUE, -- Prevent duplicate processing
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
    error TEXT,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Indexes for performance
    INDEX idx_webhook_logs_event_id ON webhook_logs(event_id),
    INDEX idx_webhook_logs_user_id ON webhook_logs(user_id),
    INDEX idx_webhook_logs_status ON webhook_logs(status),
    INDEX idx_webhook_logs_processed_at ON webhook_logs(processed_at DESC)
);

-- Enable Row Level Security
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own webhook logs
CREATE POLICY "Users can view their own webhook logs" ON webhook_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role can insert webhook logs
CREATE POLICY "Service role can insert webhook logs" ON webhook_logs
    FOR INSERT WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT, INSERT ON webhook_logs TO authenticated;
GRANT SELECT, INSERT ON webhook_logs TO service_role;

-- Add comments for documentation
COMMENT ON TABLE webhook_logs IS 'Tracks Stripe webhook events to prevent duplicate processing and monitor delivery';
COMMENT ON COLUMN webhook_logs.event_id IS 'Unique Stripe event ID to prevent duplicate processing';
COMMENT ON COLUMN webhook_logs.user_id IS 'Associated user ID for the webhook event';
COMMENT ON COLUMN webhook_logs.status IS 'Processing status: success or failed';
COMMENT ON COLUMN webhook_logs.error IS 'Error message if processing failed';
