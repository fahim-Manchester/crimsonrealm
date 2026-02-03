-- Add time_spent column to campaign_items to track per-item time
ALTER TABLE public.campaign_items 
ADD COLUMN time_spent integer DEFAULT 0;

-- Add time_spent column to projects for direct project time tracking
ALTER TABLE public.projects 
ADD COLUMN time_spent integer DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.campaign_items.time_spent IS 'Time spent on this item during campaign sessions (in seconds)';
COMMENT ON COLUMN public.projects.time_spent IS 'Direct time spent on this project (in minutes)';