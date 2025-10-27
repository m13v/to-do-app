-- Supabase Schema for Todo App
-- Run this in the Supabase SQL Editor

-- Table 1: Tasks Storage
CREATE TABLE IF NOT EXISTS todoapp_tasks (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique constraint on user_id (one task list per user)
CREATE UNIQUE INDEX IF NOT EXISTS todoapp_tasks_user_id_key ON todoapp_tasks(user_id);

-- Add Row Level Security (RLS)
ALTER TABLE todoapp_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tasks
CREATE POLICY "Users can view their own tasks"
  ON todoapp_tasks
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own tasks
CREATE POLICY "Users can insert their own tasks"
  ON todoapp_tasks
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own tasks
CREATE POLICY "Users can update their own tasks"
  ON todoapp_tasks
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can delete their own tasks
CREATE POLICY "Users can delete their own tasks"
  ON todoapp_tasks
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- Table 2: Quick Prompts Storage
CREATE TABLE IF NOT EXISTS todoapp_prompts (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add Row Level Security (RLS)
ALTER TABLE todoapp_prompts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own prompts
CREATE POLICY "Users can view their own prompts"
  ON todoapp_prompts
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own prompts
CREATE POLICY "Users can insert their own prompts"
  ON todoapp_prompts
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own prompts
CREATE POLICY "Users can update their own prompts"
  ON todoapp_prompts
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can delete their own prompts
CREATE POLICY "Users can delete their own prompts"
  ON todoapp_prompts
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS todoapp_tasks_user_id_idx ON todoapp_tasks(user_id);
CREATE INDEX IF NOT EXISTS todoapp_tasks_updated_at_idx ON todoapp_tasks(updated_at DESC);
CREATE INDEX IF NOT EXISTS todoapp_prompts_user_id_idx ON todoapp_prompts(user_id);
CREATE INDEX IF NOT EXISTS todoapp_prompts_created_at_idx ON todoapp_prompts(created_at);

