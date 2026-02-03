-- Drop the old constraint that doesn't allow temporary items
ALTER TABLE public.campaign_items DROP CONSTRAINT campaign_item_type;

-- Add a new constraint that allows:
-- 1. Regular items: exactly one of task_id or project_id set (is_temporary = false)
-- 2. Temporary items: both null but is_temporary = true with temporary_type set
ALTER TABLE public.campaign_items 
ADD CONSTRAINT campaign_item_type CHECK (
  (is_temporary = false AND ((task_id IS NOT NULL AND project_id IS NULL) OR (task_id IS NULL AND project_id IS NOT NULL)))
  OR
  (is_temporary = true AND task_id IS NULL AND project_id IS NULL AND temporary_type IS NOT NULL)
);