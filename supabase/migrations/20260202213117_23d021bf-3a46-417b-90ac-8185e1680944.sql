-- Create entry_groups table to store cleave groups for all sections
CREATE TABLE public.entry_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('resources', 'projects', 'tasks')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.entry_groups ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own groups"
  ON public.entry_groups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own groups"
  ON public.entry_groups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own groups"
  ON public.entry_groups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own groups"
  ON public.entry_groups FOR DELETE
  USING (auth.uid() = user_id);

-- Add group_id column to resources, projects, tasks
ALTER TABLE public.resources ADD COLUMN group_id UUID REFERENCES public.entry_groups(id) ON DELETE SET NULL;
ALTER TABLE public.projects ADD COLUMN group_id UUID REFERENCES public.entry_groups(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN group_id UUID REFERENCES public.entry_groups(id) ON DELETE SET NULL;

-- Add time_logged column to tasks for tracking work time
ALTER TABLE public.tasks ADD COLUMN time_logged INTEGER DEFAULT 0;

-- Trigger for updated_at on entry_groups
CREATE TRIGGER update_entry_groups_updated_at
  BEFORE UPDATE ON public.entry_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();