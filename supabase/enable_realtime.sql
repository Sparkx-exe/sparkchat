-- =========================================================================
-- ENABLE REALTIME REPLICATION FOR SPARKCHAT TABLES
-- =========================================================================
-- Run this script in the Supabase SQL Editor (https://supabase.com) to enable
-- instant, real-time message sending/receiving and status updates.
-- =========================================================================

BEGIN;
  -- 1. Ensure the 'supabase_realtime' publication exists
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END $$;

  -- 2. Add the 'messages' table to the publication
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr 
      JOIN pg_class c ON c.oid = pr.prrelid 
      JOIN pg_publication p ON p.oid = pr.prpubid 
      WHERE p.pubname = 'supabase_realtime' AND c.relname = 'messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    END IF;
  END $$;

  -- 3. Add the 'conversations' table to the publication
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr 
      JOIN pg_class c ON c.oid = pr.prrelid 
      JOIN pg_publication p ON p.oid = pr.prpubid 
      WHERE p.pubname = 'supabase_realtime' AND c.relname = 'conversations'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
    END IF;
  END $$;

  -- 4. Add the 'conversation_members' table to the publication
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr 
      JOIN pg_class c ON c.oid = pr.prrelid 
      JOIN pg_publication p ON p.oid = pr.prpubid 
      WHERE p.pubname = 'supabase_realtime' AND c.relname = 'conversation_members'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE conversation_members;
    END IF;
  END $$;

  -- 5. Add the 'profiles' table to the publication (online/offline status updates)
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr 
      JOIN pg_class c ON c.oid = pr.prrelid 
      JOIN pg_publication p ON p.oid = pr.prpubid 
      WHERE p.pubname = 'supabase_realtime' AND c.relname = 'profiles'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
    END IF;
  END $$;
COMMIT;
