-- GridSync: grid_readings table
-- Run this once in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- https://supabase.com/dashboard/project/xxmhqhshquwmwyayjoub/sql

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.grid_readings (
  id              BIGSERIAL PRIMARY KEY,
  hour_timestamp  TIMESTAMPTZ NOT NULL UNIQUE,  -- dedup key: one reading per hour
  usage_mw        INTEGER     NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 2. Index for fast time-range queries
CREATE INDEX IF NOT EXISTS idx_grid_readings_hour
  ON public.grid_readings (hour_timestamp DESC);

-- 3. RLS: allow anon reads + inserts (GridSync API uses anon key)
ALTER TABLE public.grid_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can read grid_readings"
  ON public.grid_readings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "anon can upsert grid_readings"
  ON public.grid_readings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "anon can update grid_readings"
  ON public.grid_readings FOR UPDATE
  TO anon, authenticated
  USING (true);

-- 4. Auto-cleanup: delete readings older than 48h (keeps table tiny)
-- Run via pg_cron or a Supabase scheduled function. 
-- Alternatively, manually run this to prune old data:
-- DELETE FROM public.grid_readings WHERE hour_timestamp < now() - interval '48 hours';

-- Verify:
SELECT COUNT(*) FROM public.grid_readings;
