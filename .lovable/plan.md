

# Upload Local Audio Files to Music Library

Add the ability to upload MP3/audio files from the user's device, stored in a cloud storage bucket. Uploaded files get a public URL and are saved to the `saved_music` table just like external links, making them playable anywhere in the music system.

## Database Changes

Create a public storage bucket `music-uploads` with RLS policies allowing authenticated users to upload/read/delete their own files (files stored under `{user_id}/` prefix).

## File Changes

### `src/components/music/SaveMusicDialog.tsx`
- Add an "Upload File" tab/toggle alongside the URL input
- File input accepting `audio/*` (.mp3, .wav, .ogg, .m4a, .flac)
- On file select: upload to `music-uploads/{userId}/{filename}`, get public URL, auto-fill the URL field
- Show upload progress indicator
- Max file size: 20MB with client-side validation
- Auto-detect title from filename if title field is empty

### `src/hooks/useSavedMusic.ts`
- Add `uploadAndSave(file: File, title: string, description?: string)` method
- Handles storage upload, gets public URL, inserts into `saved_music` with `source_platform: "upload"`
- Returns the saved item

### Migration SQL
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('music-uploads', 'music-uploads', true);

CREATE POLICY "Users can upload their own music"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'music-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can read music uploads"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'music-uploads');

CREATE POLICY "Users can delete their own music"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'music-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
```

Storage cost is minimal -- files are stored in the existing cloud infrastructure with generous free tier limits.

