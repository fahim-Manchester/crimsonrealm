-- Saved music: user's permanent saved external tracks/playlists
CREATE TABLE public.saved_music (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title varchar NOT NULL,
  url varchar NOT NULL,
  type varchar NOT NULL DEFAULT 'track',
  source_platform varchar,
  description varchar,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_music ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved music"
  ON public.saved_music FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved music"
  ON public.saved_music FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved music"
  ON public.saved_music FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved music"
  ON public.saved_music FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Music preferences: per-user settings and queues
CREATE TABLE public.music_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  settings jsonb NOT NULL DEFAULT '{}',
  main_queue jsonb NOT NULL DEFAULT '[]',
  downtime_queue jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.music_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own music preferences"
  ON public.music_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own music preferences"
  ON public.music_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own music preferences"
  ON public.music_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own music preferences"
  ON public.music_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);