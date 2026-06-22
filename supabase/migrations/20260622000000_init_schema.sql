-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  avatar_blurhash TEXT,
  bio TEXT DEFAULT '',
  phone TEXT,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  show_last_seen TEXT DEFAULT 'everyone' CHECK (show_last_seen IN ('everyone','contacts','nobody')),
  show_phone TEXT DEFAULT 'nobody' CHECK (show_phone IN ('everyone','contacts','nobody')),
  who_can_add_to_groups TEXT DEFAULT 'everyone' CHECK (who_can_add_to_groups IN ('everyone','contacts','nobody')),
  two_step_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONVERSATIONS
-- ============================================
CREATE TABLE conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('direct','group','saved')),
  name TEXT,
  description TEXT,
  avatar_url TEXT,
  avatar_blurhash TEXT,
  created_by UUID REFERENCES profiles(id),
  invite_link TEXT UNIQUE DEFAULT encode(gen_random_bytes(8),'hex'),
  slow_mode_seconds INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  pinned_message_id UUID,
  max_members INTEGER DEFAULT 200,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONVERSATION MEMBERS
-- ============================================
CREATE TABLE conversation_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  is_muted BOOLEAN DEFAULT FALSE,
  mute_until TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  draft TEXT DEFAULT '',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- ============================================
-- MESSAGES
-- ============================================
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT,
  type TEXT DEFAULT 'text' CHECK (type IN ('text','image','video','audio','file','sticker','system','voice_note','poll','link_preview')),
  media_url TEXT,
  media_name TEXT,
  media_size INTEGER,
  media_width INTEGER,
  media_height INTEGER,
  media_blurhash TEXT,
  media_duration INTEGER,
  link_url TEXT,
  link_title TEXT,
  link_description TEXT,
  link_image_url TEXT,
  reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
  forwarded_from UUID REFERENCES messages(id) ON DELETE SET NULL,
  forwarded_from_name TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_scheduled BOOLEAN DEFAULT FALSE,
  scheduled_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT content_or_media CHECK (content IS NOT NULL OR media_url IS NOT NULL OR type = 'poll')
);

-- ============================================
-- MESSAGE REACTIONS
-- ============================================
CREATE TABLE message_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- ============================================
-- MESSAGE READS
-- ============================================
CREATE TABLE message_reads (
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- ============================================
-- POLLS
-- ============================================
CREATE TABLE polls (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE UNIQUE,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- [{ id: uuid, text: string }]
  is_anonymous BOOLEAN DEFAULT TRUE,
  is_multiple_choice BOOLEAN DEFAULT FALSE,
  is_quiz BOOLEAN DEFAULT FALSE,
  correct_option_id TEXT,
  is_closed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE poll_votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id, option_id)
);

-- ============================================
-- CONTACTS
-- ============================================
CREATE TABLE contacts (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  nickname TEXT,
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, contact_id)
);

-- ============================================
-- SAVED MESSAGES
-- ============================================
CREATE TABLE saved_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  type TEXT DEFAULT 'text',
  media_url TEXT,
  original_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CALL SESSIONS
-- ============================================
CREATE TABLE call_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  initiator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('voice','video')),
  status TEXT DEFAULT 'ringing' CHECK (status IN ('ringing','active','ended','missed','declined')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE call_participants (
  call_id UUID REFERENCES call_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_muted BOOLEAN DEFAULT FALSE,
  is_video_on BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  PRIMARY KEY (call_id, user_id)
);

-- ============================================
-- SIGNALING (WebRTC SDP & ICE)
-- ============================================
CREATE TABLE signaling (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  call_id UUID REFERENCES call_sessions(id) ON DELETE CASCADE,
  from_user UUID REFERENCES profiles(id) ON DELETE CASCADE,
  to_user UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('offer','answer','ice-candidate','hang-up','decline')),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CHAT FOLDERS
-- ============================================
CREATE TABLE chat_folders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '📁',
  sort_order INTEGER DEFAULT 0,
  include_types TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_folder_items (
  folder_id UUID REFERENCES chat_folders(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  PRIMARY KEY (folder_id, conversation_id)
);

-- ============================================
-- PINNED MESSAGES (multiple per conversation)
-- ============================================
CREATE TABLE pinned_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  pinned_by UUID REFERENCES profiles(id),
  pinned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, message_id)
);

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_scheduled ON messages(is_scheduled, scheduled_at) WHERE is_scheduled = TRUE;
CREATE INDEX idx_conv_members_user ON conversation_members(user_id);
CREATE INDEX idx_conv_members_conv ON conversation_members(conversation_id);
CREATE INDEX idx_signaling_call ON signaling(call_id, created_at DESC);
CREATE INDEX idx_signaling_to_user ON signaling(to_user, created_at DESC);
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_reactions_message ON message_reactions(message_id);
CREATE INDEX idx_poll_votes_poll ON poll_votes(poll_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New User'),
    NEW.phone
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update conversation updated_at on new message
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- Update profiles.updated_at on change
CREATE OR REPLACE FUNCTION update_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_profile_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_profile_timestamp();

-- Get or create direct conversation
CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(user_a UUID, user_b UUID)
RETURNS UUID AS $$
DECLARE conv_id UUID;
BEGIN
  SELECT c.id INTO conv_id
  FROM conversations c
  JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = user_a
  JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = user_b
  WHERE c.type = 'direct'
  LIMIT 1;

  IF conv_id IS NULL THEN
    INSERT INTO conversations (type, created_by)
    VALUES ('direct', user_a)
    RETURNING id INTO conv_id;

    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES (conv_id, user_a, 'member'), (conv_id, user_b, 'member');
  END IF;
  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE signaling ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_folder_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_messages ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Conversations
CREATE POLICY "conversations_select" ON conversations FOR SELECT
  USING (id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid()));
CREATE POLICY "conversations_insert" ON conversations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "conversations_update" ON conversations FOR UPDATE
  USING (id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

-- Conversation Members
CREATE POLICY "conv_members_select" ON conversation_members FOR SELECT
  USING (conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid()));
CREATE POLICY "conv_members_insert" ON conversation_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "conv_members_update" ON conversation_members FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "conv_members_delete" ON conversation_members FOR DELETE USING (user_id = auth.uid());

-- Messages
CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid()));
CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND
    conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid()));
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (sender_id = auth.uid());
CREATE POLICY "messages_delete" ON messages FOR DELETE USING (sender_id = auth.uid());

-- Reactions
CREATE POLICY "reactions_select" ON message_reactions FOR SELECT USING (true);
CREATE POLICY "reactions_insert" ON message_reactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "reactions_delete" ON message_reactions FOR DELETE USING (user_id = auth.uid());

-- Reads
CREATE POLICY "reads_insert" ON message_reads FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "reads_select" ON message_reads FOR SELECT
  USING (message_id IN (SELECT id FROM messages WHERE conversation_id IN
    (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid())));

-- Contacts
CREATE POLICY "contacts_all" ON contacts FOR ALL USING (user_id = auth.uid());

-- Saved messages
CREATE POLICY "saved_all" ON saved_messages FOR ALL USING (user_id = auth.uid());

-- Calls
CREATE POLICY "calls_select" ON call_sessions FOR SELECT
  USING (id IN (SELECT call_id FROM call_participants WHERE user_id = auth.uid()) OR initiator_id = auth.uid());
CREATE POLICY "calls_insert" ON call_sessions FOR INSERT WITH CHECK (initiator_id = auth.uid());
CREATE POLICY "calls_update" ON call_sessions FOR UPDATE
  USING (id IN (SELECT call_id FROM call_participants WHERE user_id = auth.uid()) OR initiator_id = auth.uid());

CREATE POLICY "call_participants_select" ON call_participants FOR SELECT USING (true);
CREATE POLICY "call_participants_all" ON call_participants FOR ALL USING (user_id = auth.uid());

-- Signaling
CREATE POLICY "signaling_select" ON signaling FOR SELECT USING (to_user = auth.uid() OR from_user = auth.uid());
CREATE POLICY "signaling_insert" ON signaling FOR INSERT WITH CHECK (from_user = auth.uid());

-- Folders
CREATE POLICY "folders_all" ON chat_folders FOR ALL USING (user_id = auth.uid());
CREATE POLICY "folder_items_all" ON chat_folder_items FOR ALL
  USING (folder_id IN (SELECT id FROM chat_folders WHERE user_id = auth.uid()));

-- Polls
CREATE POLICY "polls_select" ON polls FOR SELECT
  USING (message_id IN (SELECT id FROM messages WHERE conversation_id IN
    (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid())));
CREATE POLICY "polls_insert" ON polls FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "poll_votes_all" ON poll_votes FOR ALL USING (user_id = auth.uid());
CREATE POLICY "poll_votes_select" ON poll_votes FOR SELECT
  USING (poll_id IN (SELECT id FROM polls));

-- Pinned messages
CREATE POLICY "pinned_select" ON pinned_messages FOR SELECT
  USING (conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid()));
CREATE POLICY "pinned_insert" ON pinned_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "pinned_delete" ON pinned_messages FOR DELETE USING (auth.uid() IS NOT NULL);
