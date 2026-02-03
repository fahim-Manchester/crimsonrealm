-- Add columns to campaign_items for temporary/quick-add items
-- These items exist only in the campaign until explicitly "marked" (saved to main modules)

ALTER TABLE public.campaign_items
ADD COLUMN is_temporary BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN temporary_name TEXT,
ADD COLUMN temporary_description TEXT,
ADD COLUMN temporary_type TEXT CHECK (temporary_type IN ('task', 'project'));

-- Add comment for clarity
COMMENT ON COLUMN public.campaign_items.is_temporary IS 'True for pop-up quests and hidden territories that have not been saved to main modules';
COMMENT ON COLUMN public.campaign_items.temporary_name IS 'Name/title for temporary items before being saved';
COMMENT ON COLUMN public.campaign_items.temporary_description IS 'Description for temporary items before being saved';
COMMENT ON COLUMN public.campaign_items.temporary_type IS 'Type of temporary item: task (pop-up quest) or project (hidden territory)';