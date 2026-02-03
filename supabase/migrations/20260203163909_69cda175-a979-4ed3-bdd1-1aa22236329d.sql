-- Fix 1: Add INSERT policy for ai_usage table so edge functions can track usage
CREATE POLICY "Users can insert their own usage"
ON public.ai_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Fix 2: Add database constraints for input validation (field length limits)
-- Resources table
ALTER TABLE public.resources 
  ALTER COLUMN title TYPE VARCHAR(255),
  ALTER COLUMN url TYPE VARCHAR(2048),
  ALTER COLUMN description TYPE VARCHAR(5000),
  ALTER COLUMN category TYPE VARCHAR(100);

-- Tasks table
ALTER TABLE public.tasks 
  ALTER COLUMN title TYPE VARCHAR(255),
  ALTER COLUMN description TYPE VARCHAR(5000);

-- Projects table
ALTER TABLE public.projects 
  ALTER COLUMN name TYPE VARCHAR(255),
  ALTER COLUMN description TYPE VARCHAR(5000);

-- Campaigns table
ALTER TABLE public.campaigns 
  ALTER COLUMN name TYPE VARCHAR(255);

-- Entry groups table
ALTER TABLE public.entry_groups 
  ALTER COLUMN name TYPE VARCHAR(255),
  ALTER COLUMN section TYPE VARCHAR(100);

-- Diary books table
ALTER TABLE public.diary_books 
  ALTER COLUMN title TYPE VARCHAR(255),
  ALTER COLUMN cover_color TYPE VARCHAR(50);

-- Diary entries table
ALTER TABLE public.diary_entries 
  ALTER COLUMN content TYPE TEXT,
  ALTER COLUMN note TYPE VARCHAR(5000),
  ALTER COLUMN entry_type TYPE VARCHAR(50);

-- Campaign items table
ALTER TABLE public.campaign_items 
  ALTER COLUMN temporary_name TYPE VARCHAR(255),
  ALTER COLUMN temporary_description TYPE VARCHAR(5000),
  ALTER COLUMN temporary_type TYPE VARCHAR(100),
  ALTER COLUMN status TYPE VARCHAR(50);