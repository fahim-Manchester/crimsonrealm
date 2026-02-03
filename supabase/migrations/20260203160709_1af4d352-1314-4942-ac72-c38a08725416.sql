-- Create ai_usage table to track AI requests per user
CREATE TABLE public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying by user and date
CREATE INDEX idx_ai_usage_user_date ON public.ai_usage (user_id, created_at);

-- Enable RLS
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage (for potential future UI showing remaining credits)
CREATE POLICY "Users can view their own usage"
ON public.ai_usage
FOR SELECT
USING (auth.uid() = user_id);

-- No insert/update/delete policies for users - only edge functions with service role can write