-- ============================================================================
-- Setup pg_cron + pg_net for Scheduled Task Execution
-- ============================================================================
-- Run this in Supabase SQL Editor AFTER deploying the app.
--
-- Prerequisites:
--   1. CRON_SECRET env var is set in Vercel
--   2. Tables scheduled_tasks and task_executions exist
--   3. App is deployed at https://pipilot.dev
-- ============================================================================

-- Step 1: Enable extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Remove old job if it exists (safe to run multiple times)
SELECT cron.unschedule('execute-scheduled-tasks')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'execute-scheduled-tasks');

-- Step 3: Schedule the execution job (every 5 minutes)
-- IMPORTANT: Replace YOUR_CRON_SECRET_HERE with the actual CRON_SECRET value
SELECT cron.schedule(
  'execute-scheduled-tasks',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pipilot.dev/api/cron/execute-scheduled-tasks',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_CRON_SECRET_HERE"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Step 4: Verify the job was created
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'execute-scheduled-tasks';

-- ============================================================================
-- Useful commands:
--
-- Check all cron jobs:
--   SELECT * FROM cron.job;
--
-- Check recent cron executions:
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
--
-- Pause the job:
--   UPDATE cron.job SET active = false WHERE jobname = 'execute-scheduled-tasks';
--
-- Resume the job:
--   UPDATE cron.job SET active = true WHERE jobname = 'execute-scheduled-tasks';
--
-- Change frequency to every 1 minute:
--   SELECT cron.unschedule('execute-scheduled-tasks');
--   SELECT cron.schedule('execute-scheduled-tasks', '* * * * *', $$ ... $$);
--
-- Delete the job:
--   SELECT cron.unschedule('execute-scheduled-tasks');
-- ============================================================================
