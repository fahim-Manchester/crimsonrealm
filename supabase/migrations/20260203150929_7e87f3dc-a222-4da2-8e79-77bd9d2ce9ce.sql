-- Create diary_books table
CREATE TABLE public.diary_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  cover_color TEXT NOT NULL DEFAULT '#8B0000',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create diary_entries table
CREATE TABLE public.diary_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.diary_books(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL DEFAULT 'scribed',
  content TEXT,
  resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  note TEXT,
  page_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on diary_books
ALTER TABLE public.diary_books ENABLE ROW LEVEL SECURITY;

-- RLS policies for diary_books
CREATE POLICY "Users can view their own books"
ON public.diary_books
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own books"
ON public.diary_books
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own books"
ON public.diary_books
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own books"
ON public.diary_books
FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS on diary_entries
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for diary_entries (check via book ownership)
CREATE POLICY "Users can view their own entries"
ON public.diary_entries
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.diary_books
  WHERE diary_books.id = diary_entries.book_id
  AND diary_books.user_id = auth.uid()
));

CREATE POLICY "Users can create their own entries"
ON public.diary_entries
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.diary_books
  WHERE diary_books.id = diary_entries.book_id
  AND diary_books.user_id = auth.uid()
));

CREATE POLICY "Users can update their own entries"
ON public.diary_entries
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.diary_books
  WHERE diary_books.id = diary_entries.book_id
  AND diary_books.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own entries"
ON public.diary_entries
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.diary_books
  WHERE diary_books.id = diary_entries.book_id
  AND diary_books.user_id = auth.uid()
));

-- Add trigger for updating updated_at on diary_books
CREATE TRIGGER update_diary_books_updated_at
BEFORE UPDATE ON public.diary_books
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();