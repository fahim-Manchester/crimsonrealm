-- Update campaigns to support "archived" and "routine" statuses
-- No constraint change needed as status is text field

-- Add a comment describing valid statuses for documentation
COMMENT ON COLUMN public.campaigns.status IS 'Valid statuses: active, archived, routine, completed';