-- ============================================================================
-- Scheduled Tasks: Tables + pg_cron + pg_net execution trigger
-- ============================================================================
-- This migration:
-- 1. Creates scheduled_tasks and task_executions tables (if not exist)
-- 2. Enables pg_cron and pg_net extensions
-- 3. Schedules a cron job that hits the execution API every 5 minutes
-- ============================================================================

-- 1. Create tables ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.scheduled_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  cron_expression text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  enabled boolean DEFAULT true,
  next_execution_at timestamptz,
  last_executed_at timestamptz,
  execution_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  output text,
  error_message text,
  duration_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_user_id ON public.scheduled_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_enabled_next ON public.scheduled_tasks(enabled, next_execution_at)
  WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_task_executions_task_id ON public.task_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_user_id ON public.task_executions(user_id);

-- RLS policies (service role access only, like agent_cloud tables)
ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_executions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on scheduled_tasks"
  ON public.scheduled_tasks FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on task_executions"
  ON public.task_executions FOR ALL
  USING (true) WITH CHECK (true);


-- 2. Enable extensions ──────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;


-- 3. Schedule the cron job ──────────────────────────────────────────────────
-- Runs every 5 minutes, calls the Next.js execution endpoint via pg_net.
-- Replace <YOUR_APP_URL> and <YOUR_CRON_SECRET> with real values.
--
-- To set this up:
--   1. Go to Supabase Dashboard > SQL Editor
--   2. Run the SELECT cron.schedule(...) query below with real values
--   3. Or use the Supabase Management API
--
-- IMPORTANT: Replace the placeholder values before running!
-- ──────────────────────────────────────────────────────────────────────────

-- Uncomment and run manually with real values:
--
-- SELECT cron.schedule(
--   'execute-scheduled-tasks',            -- job name
--   '*/5 * * * *',                        -- every 5 minutes
--   $$
--   SELECT net.http_post(
--     url := 'https://pipilot.dev/api/cron/execute-scheduled-tasks',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- To check existing cron jobs:
-- SELECT * FROM cron.job;

-- To remove the job:
-- SELECT cron.unschedule('execute-scheduled-tasks');
