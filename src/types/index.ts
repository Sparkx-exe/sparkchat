export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  avatar_blurhash: string | null;
  bio: string | null;
  phone: string | null;
  is_online: boolean;
  last_seen: string;
  show_last_seen: 'everyone' | 'contacts' | 'nobody';
  show_phone: 'everyone' | 'contacts' | 'nobody';
  who_can_add_to_groups: 'everyone' | 'contacts' | 'nobody';
  two_step_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'saved';
  name: string | null;
  description: string | null;
  avatar_url: string | null;
  avatar_blurhash: string | null;
  created_by: string | null;
  invite_link: string | null;
  slow_mode_seconds: number;
  is_archived: boolean;
  pinned_message_id: string | null;
  max_members: number;
  created_at: string;
  updated_at: string;
  // Extra fields populated in queries
  unread_count?: number;
  members?: ConversationMemberWithProfile[];
  pinned_messages?: PinnedMessage[];
  last_message?: Message | null;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  is_muted: boolean;
  mute_until: string | null;
  is_archived: boolean;
  is_pinned: boolean;
  last_read_at: string;
  draft: string;
  joined_at: string;
}

export interface ConversationMemberWithProfile extends ConversationMember {
  profile: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string | null;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'system' | 'voice_note' | 'poll' | 'link_preview' | 'call';
  media_url: string | null;
  media_name: string | null;
  media_size: number | null;
  media_width: number | null;
  media_height: number | null;
  media_blurhash: string | null;
  media_duration: number | null;
  link_url: string | null;
  link_title: string | null;
  link_description: string | null;
  link_image_url: string | null;
  reply_to: string | null;
  forwarded_from: string | null;
  forwarded_from_name: string | null;
  is_deleted: boolean;
  is_pinned: boolean;
  is_scheduled: boolean;
  scheduled_at: string | null;
  edited_at: string | null;
  created_at: string;
  // Populated fields
  sender?: Profile;
  reply_to_message?: Message | null;
  reactions?: MessageReaction[];
  reads?: MessageRead[];
  poll?: Poll | null;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  profile?: Profile;
}

export interface MessageRead {
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface PollOption {
  id: string;
  text: string;
}

export interface Poll {
  id: string;
  message_id: string;
  question: string;
  options: PollOption[];
  is_anonymous: boolean;
  is_multiple_choice: boolean;
  is_quiz: boolean;
  correct_option_id: string | null;
  is_closed: boolean;
  created_at: string;
  // Extra fields
  votes?: PollVote[];
}

export interface PollVote {
  id: string;
  poll_id: string;
  user_id: string;
  option_id: string;
  created_at: string;
}

export interface Contact {
  user_id: string;
  contact_id: string;
  nickname: string | null;
  is_blocked: boolean;
  created_at: string;
  contact_profile?: Profile;
}

export interface SavedMessage {
  id: string;
  user_id: string;
  content: string | null;
  type: string;
  media_url: string | null;
  original_message_id: string | null;
  created_at: string;
  original_message?: Message;
}

export interface CallSession {
  id: string;
  conversation_id: string;
  initiator_id: string;
  type: 'voice' | 'video';
  status: 'ringing' | 'active' | 'ended' | 'missed' | 'declined';
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
  conversation?: Conversation;
  initiator?: Profile;
  participants?: CallParticipantWithProfile[];
}

export interface CallParticipant {
  call_id: string;
  user_id: string;
  is_muted: boolean;
  is_video_on: boolean;
  joined_at: string;
  left_at: string | null;
}

export interface CallParticipantWithProfile extends CallParticipant {
  profile: Profile;
}

export interface Signaling {
  id: string;
  call_id: string;
  from_user: string;
  to_user: string;
  type: 'offer' | 'answer' | 'ice-candidate' | 'hang-up' | 'decline';
  payload: any;
  created_at: string;
}

export interface ChatFolder {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  sort_order: number;
  include_types: string[];
  created_at: string;
  conversations?: Conversation[];
}

export interface ChatFolderItem {
  folder_id: string;
  conversation_id: string;
}

export interface PinnedMessage {
  id: string;
  conversation_id: string;
  message_id: string;
  pinned_by: string;
  pinned_at: string;
  message?: Message;
}
