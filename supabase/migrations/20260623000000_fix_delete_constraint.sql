-- =========================================================================
-- FIX CONTENT_OR_MEDIA CONSTRAINT FOR DELETED MESSAGES
-- =========================================================================
-- When is_deleted is true, a message should be allowed to have NULL content
-- and NULL media_url to ensure the content is fully purged from the database.
-- =========================================================================

-- 1. Drop the old constraint
ALTER TABLE messages DROP CONSTRAINT IF EXISTS content_or_media;

-- 2. Add the updated constraint that allows NULL content/media if the message is deleted
ALTER TABLE messages ADD CONSTRAINT content_or_media CHECK (
  is_deleted = TRUE OR 
  content IS NOT NULL OR 
  media_url IS NOT NULL OR 
  type = 'poll'
);
