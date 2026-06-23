import { create } from 'zustand';
import { Conversation, Message, ChatFolder } from '@/types';

export type CallState = {
  type: 'voice' | 'video';
  conversationId: string;
  status: 'ringing' | 'active';
  isOutgoing: boolean;
  callPartnerId: string; // the other user's ID (for signaling), empty for group calls
  isGroupCall?: boolean;
} | null;

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>; // conversationId -> messages
  typing: Record<string, string[]>; // conversationId -> usernames typing
  drafts: Record<string, string>; // conversationId -> draft text
  selectedMessageIds: string[];
  folders: ChatFolder[];
  activeFolderId: string | null; // null represents "All"
  replyToMessageId: string | null;
  editingMessageId: string | null;
  callState: CallState;
  messageSearchOpen: boolean;
  messageSearchQuery: string;
  activeGroupCallParticipants: Record<string, any[]>;

  setConversations: (conversations: Conversation[]) => void;
  setActiveConversationId: (id: string | null) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  setDraft: (conversationId: string, draft: string) => void;
  setTyping: (conversationId: string, usernames: string[]) => void;
  toggleSelectMessage: (messageId: string) => void;
  clearSelectedMessages: () => void;
  setFolders: (folders: ChatFolder[]) => void;
  setActiveFolderId: (folderId: string | null) => void;
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => void;
  setReplyToMessage: (messageId: string | null) => void;
  setEditingMessage: (messageId: string | null) => void;
  setCallState: (state: CallState) => void;
  setMessageSearchOpen: (open: boolean) => void;
  setMessageSearchQuery: (query: string) => void;
  setActiveGroupCallParticipants: (conversationId: string, participants: any[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typing: {},
  drafts: {},
  selectedMessageIds: [],
  folders: [],
  activeFolderId: null,
  replyToMessageId: null,
  editingMessageId: null,
  callState: null,
  messageSearchOpen: false,
  messageSearchQuery: '',
  activeGroupCallParticipants: {},

  setConversations: (conversations) => set({ conversations }),
  setActiveConversationId: (id) => set({ activeConversationId: id, selectedMessageIds: [], replyToMessageId: null, editingMessageId: null, messageSearchOpen: false, messageSearchQuery: '' }),
  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages },
    })),
  addMessage: (conversationId, message) =>
    set((state) => {
      const currentMessages = state.messages[conversationId] || [];
      // Prevent duplicates
      if (currentMessages.some((m) => m.id === message.id)) {
        return {};
      }

      // Sync the last message and updated_at of the conversation in the sidebar instantly
      const updatedConversations = state.conversations.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            last_message: message,
            updated_at: message.created_at,
          };
        }
        return c;
      });

      return {
        messages: {
          ...state.messages,
          [conversationId]: [...currentMessages, message],
        },
        conversations: updatedConversations,
      };
    }),
  updateMessage: (conversationId, messageId, updates) =>
    set((state) => {
      const currentMessages = state.messages[conversationId] || [];
      const updatedMessages = currentMessages.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m
      );

      // If the updated message was the conversation's last message, sync the sidebar preview
      let updatedConversations = state.conversations;
      const conversation = state.conversations.find((c) => c.id === conversationId);
      if (conversation && conversation.last_message?.id === messageId) {
        updatedConversations = state.conversations.map((c) => {
          if (c.id === conversationId) {
            return {
              ...c,
              last_message: { ...c.last_message, ...updates } as Message,
            };
          }
          return c;
        });
      }

      return {
        messages: {
          ...state.messages,
          [conversationId]: updatedMessages,
        },
        conversations: updatedConversations,
      };
    }),
  deleteMessage: (conversationId, messageId) =>
    set((state) => {
      const currentMessages = state.messages[conversationId] || [];
      const updatedMessages = currentMessages.filter((m) => m.id !== messageId);

      // If the deleted message was the conversation's last message, find the new last message for the sidebar preview
      let updatedConversations = state.conversations;
      const conversation = state.conversations.find((c) => c.id === conversationId);
      if (conversation && conversation.last_message?.id === messageId) {
        const newLastMsg = updatedMessages.length > 0 ? updatedMessages[updatedMessages.length - 1] : null;
        updatedConversations = state.conversations.map((c) => {
          if (c.id === conversationId) {
            return {
              ...c,
              last_message: newLastMsg,
            };
          }
          return c;
        });
      }

      return {
        messages: {
          ...state.messages,
          [conversationId]: updatedMessages,
        },
        conversations: updatedConversations,
      };
    }),
  setDraft: (conversationId, draft) =>
    set((state) => ({
      drafts: { ...state.drafts, [conversationId]: draft },
    })),
  setTyping: (conversationId, usernames) =>
    set((state) => ({
      typing: { ...state.typing, [conversationId]: usernames },
    })),
  toggleSelectMessage: (messageId) =>
    set((state) => {
      const isSelected = state.selectedMessageIds.includes(messageId);
      const selectedMessageIds = isSelected
        ? state.selectedMessageIds.filter((id) => id !== messageId)
        : [...state.selectedMessageIds, messageId];
      return { selectedMessageIds };
    }),
  clearSelectedMessages: () => set({ selectedMessageIds: [] }),
  setFolders: (folders) => set({ folders }),
  setActiveFolderId: (folderId) => set({ activeFolderId: folderId }),
  updateConversation: (conversationId, updates) =>
    set((state) => {
      const exists = state.conversations.some((c) => c.id === conversationId);
      if (!exists) {
        // If it does not exist, append it. Since updates is a Partial<Conversation>,
        // we cast it, ensuring that complete conversation loads from parseConversation are correctly appended.
        return { conversations: [updates as Conversation, ...state.conversations] };
      }
      const updatedConversations = state.conversations.map((c) =>
        c.id === conversationId ? { ...c, ...updates } : c
      );
      return { conversations: updatedConversations };
    }),
  setReplyToMessage: (messageId) => set({ replyToMessageId: messageId }),
  setEditingMessage: (messageId) => set({ editingMessageId: messageId }),
  setCallState: (state) => set({ callState: state }),
  setMessageSearchOpen: (open) => set({ messageSearchOpen: open, messageSearchQuery: open ? '' : '' }),
  setMessageSearchQuery: (query) => set({ messageSearchQuery: query }),
  setActiveGroupCallParticipants: (conversationId, participants) =>
    set((state) => ({
      activeGroupCallParticipants: {
        ...state.activeGroupCallParticipants,
        [conversationId]: participants,
      },
    })),
}));
