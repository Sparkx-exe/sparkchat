-- =========================================================================
-- RESTRICT MEMBER INSERTION TO ADMINS/OWNERS OR SELF-JOIN
-- =========================================================================
-- Ensure only group admins/owners can add other members, while allowing
-- users to add themselves (e.g. via invite link).
-- =========================================================================

-- 1. Helper function to check if user is an admin or owner of the conversation
CREATE OR REPLACE FUNCTION is_conversation_admin(conv_id UUID, u_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = conv_id AND user_id = u_id AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Drop the old wide-open insert policy
DROP POLICY IF EXISTS "conv_members_insert" ON conversation_members;

-- 3. Create the restricted insert policy
CREATE POLICY "conv_members_insert" ON conversation_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    is_conversation_admin(conversation_id, auth.uid())
  );
