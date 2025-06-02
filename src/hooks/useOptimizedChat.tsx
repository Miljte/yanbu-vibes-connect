
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useChatValidation } from './useChatValidation';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  message: string;
  user_id: string;
  place_id: string;
  created_at: string;
  is_deleted: boolean;
  message_type: 'user' | 'merchant' | 'system';
  is_promotion: boolean;
  user?: {
    nickname: string;
  };
}

interface UseOptimizedChatProps {
  placeId: string | null;
  isWithinRange: boolean;
  messageLimit?: number;
}

export const useOptimizedChat = ({ 
  placeId, 
  isWithinRange, 
  messageLimit = 50 
}: UseOptimizedChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<any>(null);
  const lastFetchRef = useRef<number>(0);
  const { user } = useAuth();
  const { canSendMessage, getMuteMessage } = useChatValidation();

  // Optimized fetch to prevent excessive API calls
  const fetchMessages = useCallback(async () => {
    if (!placeId || !isWithinRange) {
      setMessages([]);
      return;
    }

    const now = Date.now();
    if (now - lastFetchRef.current < 1000) return; // Throttle to 1 second
    lastFetchRef.current = now;

    setLoading(true);
    try {
      console.log('🔄 Fetching messages for place:', placeId);
      
      const { data: messagesData, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          message,
          user_id,
          place_id,
          created_at,
          is_deleted,
          message_type,
          is_promotion
        `)
        .eq('place_id', placeId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(messageLimit);

      if (error) {
        console.error('❌ Error fetching messages:', error);
        throw error;
      }

      console.log('✅ Fetched', messagesData?.length || 0, 'messages');

      // Batch fetch user nicknames to reduce queries
      const userIds = [...new Set(messagesData?.map(msg => msg.user_id).filter(Boolean) || [])];
      
      let userProfiles: { [key: string]: string } = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, nickname')
          .in('id', userIds);

        userProfiles = profilesData?.reduce((acc, profile) => ({
          ...acc,
          [profile.id]: profile.nickname
        }), {}) || {};
      }

      const messagesWithUsers = messagesData?.map(message => ({
        ...message,
        user: { nickname: userProfiles[message.user_id] || 'Unknown User' }
      })) || [];

      setMessages(messagesWithUsers);
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [placeId, isWithinRange, messageLimit]);

  // Real-time subscription management
  useEffect(() => {
    if (!placeId || !isWithinRange) {
      // Clean up existing subscription
      if (channelRef.current) {
        console.log('🧹 Cleaning up chat subscription');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setMessages([]);
      return;
    }

    console.log('🔌 Setting up chat subscription for place:', placeId);
    fetchMessages();

    // Create new subscription
    const channel = supabase
      .channel(`optimized_chat_${placeId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `place_id=eq.${placeId}`
      }, async (payload) => {
        console.log('📩 New message received:', payload.new);
        
        // Get user nickname for new message
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', payload.new.user_id)
          .single();

        const newMessage = {
          ...payload.new as ChatMessage,
          user: { nickname: profileData?.nickname || 'Unknown User' }
        };

        setMessages(prev => {
          // Prevent duplicates
          const exists = prev.some(msg => msg.id === newMessage.id);
          if (exists) return prev;
          
          // Keep only latest messages to prevent memory bloat
          const updated = [...prev, newMessage];
          return updated.slice(-messageLimit);
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `place_id=eq.${placeId}`
      }, () => {
        console.log('🔄 Message updated, refreshing...');
        fetchMessages();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'chat_messages',
        filter: `place_id=eq.${placeId}`
      }, () => {
        console.log('🗑️ Message deleted, refreshing...');
        fetchMessages();
      })
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log('🧹 Cleaning up chat subscription on unmount');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [placeId, isWithinRange, fetchMessages]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || !placeId || !user || !canSendMessage() || sending) {
      if (!canSendMessage()) {
        toast.error(getMuteMessage() || 'You cannot send messages');
      }
      return false;
    }

    setSending(true);
    try {
      console.log('📤 Sending message to place:', placeId);
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          message: messageText.trim(),
          user_id: user.id,
          place_id: placeId,
          message_type: 'user',
          is_promotion: false
        });

      if (error) {
        console.error('❌ Error sending message:', error);
        throw error;
      }

      console.log('✅ Message sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      toast.error('Failed to send message');
      return false;
    } finally {
      setSending(false);
    }
  }, [placeId, user, canSendMessage, getMuteMessage, sending]);

  return {
    messages,
    loading,
    sending,
    sendMessage,
    canSendMessage,
    getMuteMessage
  };
};
