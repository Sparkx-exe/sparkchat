-- Create storage policies for the 'avatars' bucket

-- 1. Allow public select access to all files in the avatars bucket
CREATE POLICY "Allow public select access on avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 2. Allow authenticated users to upload files to their own directory in the avatars bucket
CREATE POLICY "Allow authenticated upload to own avatars folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Allow authenticated users to update files in their own directory in the avatars bucket
CREATE POLICY "Allow authenticated update to own avatars folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Allow authenticated users to delete files in their own directory in the avatars bucket
CREATE POLICY "Allow authenticated delete from own avatars folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
