-- =========================================================================
-- FIX CONVERSATIONS SELECT RLS POLICY
-- =========================================================================
-- Relax the SELECT policy to allow users to read conversations they created,
-- enabling safe .select() returns immediately after insertion.
-- =========================================================================

-- 1. Drop the old policy
DROP POLICY IF EXISTS "conversations_select" ON conversations;

-- 2. Re-create it to allow access if you are a member OR if you are the creator
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (
    is_conversation_member(id) OR 
    created_by = auth.uid()
  );
