import { create } from 'zustand';
import { Conversation, Message, ChatFolder } from '@/types';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>; // conversationId -> messages
  typing: Record<string, string[]>; // conversationId -> usernames typing
  drafts: Record<string, string>; // conversationId -> draft text
  selectedMessageIds: string[];
  folders: ChatFolder[];
  activeFolderId: string | null; // null represents "All"
  
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

  setConversations: (conversations) => set({ conversations }),
  setActiveConversationId: (id) => set({ activeConversationId: id, selectedMessageIds: [] }),
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
      return {
        messages: {
          ...state.messages,
          [conversationId]: [...currentMessages, message],
        },
      };
    }),
  updateMessage: (conversationId, messageId, updates) =>
    set((state) => {
      const currentMessages = state.messages[conversationId] || [];
      const updatedMessages = currentMessages.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m
      );
      return {
        messages: {
          ...state.messages,
          [conversationId]: updatedMessages,
        },
      };
    }),
  deleteMessage: (conversationId, messageId) =>
    set((state) => {
      const currentMessages = state.messages[conversationId] || [];
      const updatedMessages = currentMessages.filter((m) => m.id !== messageId);
      return {
        messages: {
          ...state.messages,
          [conversationId]: updatedMessages,
        },
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
      const updatedConversations = state.conversations.map((c) =>
        c.id === conversationId ? { ...c, ...updates } : c
      );
      return { conversations: updatedConversations };
    }),
}));
