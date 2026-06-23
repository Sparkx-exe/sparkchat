-- ============================================
-- FIX 1: Fix infinite recursion in conversation_members RLS policy
-- The current policy references itself causing infinite recursion.
-- Replace with a non-recursive approach.
-- ============================================

-- Drop recursive policies
DROP POLICY IF EXISTS "conv_members_select" ON conversation_members;
DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "reads_select" ON message_reads;
DROP POLICY IF EXISTS "polls_select" ON polls;
DROP POLICY IF EXISTS "pinned_select" ON pinned_messages;

-- Fix conversation_members: use auth.uid() directly, no subquery on itself
CREATE POLICY "conv_members_select" ON conversation_members
  FOR SELECT USING (user_id = auth.uid());

-- Fix conversations: check membership via a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION is_conversation_member(conv_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (is_conversation_member(id));

-- Fix messages: same approach
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (is_conversation_member(conversation_id));

-- Fix reads
CREATE POLICY "reads_select" ON message_reads
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Fix polls
CREATE POLICY "polls_select" ON polls
  FOR SELECT USING (
    message_id IN (
      SELECT m.id FROM messages m
      WHERE is_conversation_member(m.conversation_id)
    )
  );

-- Fix pinned messages
CREATE POLICY "pinned_select" ON pinned_messages
  FOR SELECT USING (is_conversation_member(conversation_id));


-- ============================================
-- FIX 2: Fix the handle_new_user trigger
-- The trigger may fail due to username uniqueness or NULL constraint.
-- Make it more robust with error handling.
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Get the desired username from metadata, fallback to user_ + id prefix
  base_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    'user_' || substr(NEW.id::text, 1, 8)
  );
  final_username := base_username;

  -- Ensure username is unique by appending a number if needed
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || '_' || counter;
  END LOOP;

  INSERT INTO profiles (id, username, display_name, phone)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''), 'New User'),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone::text, '')), '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't block signup
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger (in case it wasn't applied)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
