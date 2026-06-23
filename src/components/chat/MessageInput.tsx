import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Smile, Paperclip, Send, Mic, X, Image, FileText, MicOff } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import EmojiPicker from 'emoji-picker-react';
import toast from 'react-hot-toast';
import { Message } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

export const MessageInput: React.FC = () => {
  const {
    activeConversationId,
    drafts,
    setDraft,
    addMessage,
    replyToMessageId,
    setReplyToMessage,
    messages,
    editingMessageId,
    setEditingMessage,
    updateMessage,
  } = useChatStore();
  const { user, profile } = useAuthStore();
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  // Persistent typing channel — created once per conversation, not per keystroke
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const conversationMessages = messages[activeConversationId || ''] || [];
  const replyToMessage = replyToMessageId
    ? conversationMessages.find((m) => m.id === replyToMessageId)
    : null;
  const editingMessage = editingMessageId
    ? conversationMessages.find((m) => m.id === editingMessageId)
    : null;

  // Restore draft when activeConversationId changes
  useEffect(() => {
    if (activeConversationId) {
      setText(drafts[activeConversationId] || '');
    }
  }, [activeConversationId, drafts]);

  // Load message content when entering editing mode
  useEffect(() => {
    if (editingMessageId && activeConversationId) {
      const msg = messages[activeConversationId]?.find((m) => m.id === editingMessageId);
      if (msg) {
        setText(msg.content || '');
        setReplyToMessage(null);
        setTimeout(() => textareaRef.current?.focus(), 50);
      }
    } else if (activeConversationId) {
      setText(drafts[activeConversationId] || '');
    }
  }, [editingMessageId, activeConversationId, messages, drafts, setReplyToMessage]);

  // Adjust textarea heights automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    if (activeConversationId) setDraft(activeConversationId, val);
    broadcastTyping();
  };

  // Debounced typing broadcast using a SINGLE persistent channel per conversation
  const broadcastTyping = () => {
    if (!activeConversationId || !profile) return;
    // Debounce: only fire after 300ms of no typing
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(async () => {
      if (!typingChannelRef.current) return;
      await typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { username: profile.display_name },
      });
    }, 300);
  };

  // Create / tear down the persistent typing channel when conversation changes
  useEffect(() => {
    if (!activeConversationId) return;
    const ch = supabase.channel(`typing:${activeConversationId}`);
    ch.subscribe();
    typingChannelRef.current = ch;
    return () => {
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      supabase.removeChannel(ch);
      typingChannelRef.current = null;
    };
  }, [activeConversationId]);

  const sendMessage = useCallback(async (payload: {
    content?: string;
    type: Message['type'];
    media_url?: string;
    media_name?: string;
    media_size?: number;
    media_duration?: number;
    reply_to?: string | null;
  }) => {
    if (!activeConversationId || !user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConversationId,
          sender_id: user.id,
          content: payload.content || null,
          type: payload.type,
          media_url: payload.media_url || null,
          media_name: payload.media_name || null,
          media_size: payload.media_size || null,
          media_duration: payload.media_duration || null,
          reply_to: payload.reply_to || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        addMessage(activeConversationId, { ...data, sender: profile || undefined } as Message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    }
  }, [activeConversationId, user, profile, addMessage]);

  const handleSend = async () => {
    if (!text.trim() || !activeConversationId || !user) return;
    const messageText = text.trim();
    setText('');
    if (activeConversationId) setDraft(activeConversationId, '');

    if (editingMessageId) {
      try {
        const { error } = await supabase
          .from('messages')
          .update({
            content: messageText,
            edited_at: new Date().toISOString(),
          })
          .eq('id', editingMessageId);

        if (error) throw error;

        updateMessage(activeConversationId, editingMessageId, {
          content: messageText,
          edited_at: new Date().toISOString(),
        });
        setEditingMessage(null);
      } catch (err: any) {
        toast.error(err.message || 'Failed to edit message');
      }
      return;
    }

    await sendMessage({
      content: messageText,
      type: 'text',
      reply_to: replyToMessageId || null,
    });
    setReplyToMessage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Upload a file to Supabase Storage and send message
  // Images/videos/voice notes → 'media' bucket (50 MB)
  // Documents/files           → 'files'  bucket (100 MB)
  const handleFileUpload = async (file: File) => {
    if (!activeConversationId || !user) return;
    setUploading(true);
    setUploadProgress(10);
    setAttachMenuOpen(false);

    let bucket = 'files';
    let type: Message['type'] = 'file';

    if (file.type.startsWith('image/')) {
      bucket = 'media';
      type = 'image';
    } else if (file.type.startsWith('video/')) {
      bucket = 'media';
      type = 'video';
    } else if (file.type.startsWith('audio/')) {
      bucket = 'media';
      type = 'audio';
    }

    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/${activeConversationId}/${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: false });

      setUploadProgress(70);

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(uploadData.path);

      setUploadProgress(90);

      await sendMessage({
        content: type === 'image' || type === 'video' || type === 'audio' ? undefined : file.name,
        type,
        media_url: publicUrl,
        media_name: file.name,
        media_size: file.size,
      });

      setUploadProgress(100);
      toast.success('File sent!');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordingChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        await uploadVoiceNote(blob, recordingDuration);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingDuration(0);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    toast('Recording cancelled', { icon: '🗑️' });
  };

  const uploadVoiceNote = async (blob: Blob, duration: number) => {
    if (!activeConversationId || !user) return;
    setUploading(true);
    try {
      const filePath = `${user.id}/${activeConversationId}/voice_${Date.now()}.webm`;
      const { data: uploadData, error } = await supabase.storage
        .from('media')
        .upload(filePath, blob);

      if (error) {
        toast.error(`Voice note upload failed: ${error.message}`);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(uploadData.path);

      await sendMessage({
        type: 'voice_note',
        media_url: publicUrl,
        media_duration: duration,
      });
      toast.success('Voice note sent!');
    } catch {
      toast.error('Failed to send voice note');
    } finally {
      setUploading(false);
      setRecordingDuration(0);
    }
  };

  const formatRecordingTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  // Close emoji / attach pickers on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) setEmojiOpen(false);
      if (attachRef.current && !attachRef.current.contains(event.target as Node)) setAttachMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="px-4 py-2.5 bg-bg-sidebar border-t border-divider flex flex-col z-10 shrink-0 select-none relative">
      {/* Reply preview bar */}
      {replyToMessage && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-md bg-bg-hover border-l-2 border-accent">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-accent">
              Replying to {replyToMessage.sender?.display_name || 'message'}
            </p>
            <p className="text-[11px] text-text-secondary truncate">
              {replyToMessage.content || '📎 Attachment'}
            </p>
          </div>
          <button
            onClick={() => setReplyToMessage(null)}
            className="text-text-secondary hover:text-text-primary p-0.5"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Editing preview bar */}
      {editingMessage && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-md bg-bg-hover border-l-2 border-accent">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-accent flex items-center gap-1">
              <span>✏️</span> Editing message
            </p>
            <p className="text-[11px] text-text-secondary truncate">
              {editingMessage.content}
            </p>
          </div>
          <button
            onClick={() => setEditingMessage(null)}
            className="text-text-secondary hover:text-text-primary p-0.5"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Upload progress bar */}
      {uploading && (
        <div className="mb-2 h-1 rounded-full bg-bg-hover overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Recording state */}
      {isRecording ? (
        <div className="flex items-center gap-3 w-full py-1">
          {/* Cancel */}
          <button
            onClick={cancelRecording}
            className="p-1.5 rounded-full hover:bg-bg-hover text-danger transition-colors focus:outline-none shrink-0"
          >
            <X size={18} />
          </button>

          {/* Waveform & timer */}
          <div className="flex-1 flex items-center gap-3 bg-bg-input border border-border rounded-md px-3 py-1.5">
            <div className="flex items-end gap-0.5 h-5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-danger rounded-full"
                  style={{
                    height: `${30 + Math.sin(Date.now() / 200 + i) * 50}%`,
                    animation: `waveform 0.4s ease-in-out ${i * 0.05}s infinite alternate`,
                  }}
                />
              ))}
            </div>
            <span className="text-xs text-danger font-mono font-semibold">
              {formatRecordingTime(recordingDuration)}
            </span>
            <span className="text-[10px] text-text-secondary ml-auto">Recording...</span>
          </div>

          {/* Send recording */}
          <button
            onClick={stopRecording}
            className="p-1.5 rounded-full bg-accent hover:bg-accent-hover text-white transition-colors focus:outline-none shrink-0 shadow-xs"
          >
            <Send size={15} />
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-2 w-full">
          {/* Emoji Selector */}
          <div className="relative flex items-center" ref={emojiRef}>
            <button
              onClick={() => setEmojiOpen(!emojiOpen)}
              className="p-1.5 rounded-full hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors focus:outline-none shrink-0"
            >
              <Smile size={18} />
            </button>

            <AnimatePresence>
              {emojiOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                  className="absolute bottom-12 left-0 z-50 shadow-2xl"
                >
                  <EmojiPicker
                    onEmojiClick={(emojiData) => {
                      setText((prev) => prev + emojiData.emoji);
                      setEmojiOpen(false);
                    }}
                    lazyLoadEmojis={true}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Text Input area */}
          <div className="flex-1 bg-bg-input border border-border rounded-md px-2.5 py-1 flex items-end">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent resize-none border-none text-text-primary placeholder-text-placeholder focus:outline-none py-0.5 text-xs sm:text-sm max-h-24"
              placeholder="Type a message..."
            />
          </div>

          {/* Attachments menu */}
          <div className="relative" ref={attachRef}>
            <button
              onClick={() => setAttachMenuOpen(!attachMenuOpen)}
              className={`p-1.5 rounded-full transition-colors focus:outline-none shrink-0 ${
                attachMenuOpen
                  ? 'bg-accent text-white'
                  : 'hover:bg-bg-hover text-text-secondary hover:text-text-primary'
              }`}
            >
              <Paperclip size={18} />
            </button>

            <AnimatePresence>
              {attachMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 10, originX: 1, originY: 1 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 10 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 350 }}
                  className="absolute bottom-12 right-0 bg-bg-elevated border border-border rounded-lg shadow-xl py-1 z-50 min-w-[150px]"
                >
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full px-3 py-2 flex items-center gap-2.5 text-xs text-text-primary hover:bg-bg-hover transition-colors text-left"
                  >
                    <Image size={14} className="text-accent" />
                    Photo / Video
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-3 py-2 flex items-center gap-2.5 text-xs text-text-primary hover:bg-bg-hover transition-colors text-left"
                  >
                    <FileText size={14} className="text-blue-400" />
                    Document
                  </button>
                  <button
                    onClick={() => {
                      setAttachMenuOpen(false);
                      startRecording();
                    }}
                    className="w-full px-3 py-2 flex items-center gap-2.5 text-xs text-text-primary hover:bg-bg-hover transition-colors text-left"
                  >
                    <Mic size={14} className="text-red-400" />
                    Voice Note
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hidden file inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = '';
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = '';
              }}
            />
          </div>

          {/* Send / Mic button */}
          {text.trim() ? (
            <button
              onClick={handleSend}
              disabled={uploading}
              className="p-1.5 rounded-full bg-accent hover:bg-accent-hover text-white transition-colors focus:outline-none shrink-0 shadow-xs disabled:opacity-50"
            >
              <Send size={15} />
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="p-1.5 rounded-full hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors focus:outline-none shrink-0"
            >
              <Mic size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
export default MessageInput;
