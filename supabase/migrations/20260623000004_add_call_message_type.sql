-- Add 'call' to the message type check constraint

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT constraint_name 
        FROM information_schema.constraint_column_usage 
        WHERE table_name = 'messages' AND column_name = 'type'
    LOOP
        EXECUTE 'ALTER TABLE messages DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

ALTER TABLE messages ADD CONSTRAINT messages_type_check CHECK (
  type IN ('text','image','video','audio','file','sticker','system','voice_note','poll','link_preview','call')
);

-- Update content_or_media constraint to include type = 'call'
ALTER TABLE messages DROP CONSTRAINT IF EXISTS content_or_media;
ALTER TABLE messages ADD CONSTRAINT content_or_media CHECK (
  is_deleted = TRUE OR 
  content IS NOT NULL OR 
  media_url IS NOT NULL OR 
  type = 'poll' OR
  type = 'call'
);
