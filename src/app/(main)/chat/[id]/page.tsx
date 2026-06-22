'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useChatStore } from '@/stores/chatStore';
import ChatWindow from '@/components/chat/ChatWindow';

export default function ChatPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const { setActiveConversationId } = useChatStore();

  useEffect(() => {
    if (id) {
      setActiveConversationId(id);
    }
    return () => {
      setActiveConversationId(null);
    };
  }, [id, setActiveConversationId]);

  if (!id) return null;

  return <ChatWindow />;
}
