-- Add session_count to campaigns table for tracking session numbers
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS session_count integer DEFAULT 0;

-- Add session_number to campaign_items to track which session an item was completed in
ALTER TABLE public.campaign_items
ADD COLUMN IF NOT EXISTS completed_session integer DEFAULT NULL;

-- Add status to campaign_items to support 'abandoned' status
ALTER TABLE public.campaign_items
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Update existing completed items to have 'completed' status
UPDATE public.campaign_items SET status = 'completed' WHERE completed = true;
UPDATE public.campaign_items SET status = 'pending' WHERE completed = false OR completed IS NULL;

-- Add parent_item_id to campaign_items for nesting tasks under territories
ALTER TABLE public.campaign_items
ADD COLUMN IF NOT EXISTS parent_item_id uuid REFERENCES public.campaign_items(id) ON DELETE SET NULL;