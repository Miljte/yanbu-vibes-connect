
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
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  
  const channelRef = useRef<any>(null);
  const lastFetchRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const userCacheRef = useRef<Map<string, string>>(new Map());
  
  const { user } = useAuth();
  const { canSendMessage, getMuteMessage } = useChatValidation();

  // Fast user profile caching
  const fetchUserProfiles = useCallback(async (userIds: string[]) => {
    const uncachedIds = userIds.filter(id => !userCacheRef.current.has(id));
    if (uncachedIds.length === 0) return;

    try {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', uncachedIds);

      profilesData?.forEach(profile => {
        userCacheRef.current.set(profile.id, profile.nickname);
      });
    } catch (error) {
      console.error('❌ Error fetching user profiles:', error);
    }
  }, []);

  // Optimized fetch with throttling and caching
  const fetchMessages = useCallback(async () => {
    if (!placeId || !isWithinRange) {
      setMessages([]);
      setConnectionStatus('disconnected');
      return;
    }

    const now = Date.now();
    if (now - lastFetchRef.current < 1000) return; // Throttle to 1 second
    lastFetchRef.current = now;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    try {
      console.log('🔄 Fast fetching messages for place:', placeId);
      
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
        .limit(messageLimit)
        .abortSignal(abortControllerRef.current.signal);

      if (error) throw error;

      const messages = messagesData || [];
      
      // Batch fetch user profiles for performance
      const userIds = [...new Set(messages.map(msg => msg.user_id).filter(Boolean))];
      await fetchUserProfiles(userIds);

      const messagesWithUsers = messages.map(message => ({
        ...message,
        user: { nickname: userCacheRef.current.get(message.user_id) || 'Unknown User' }
      }));

      setMessages(messagesWithUsers);
      console.log('✅ Messages loaded fast:', messagesWithUsers.length);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('❌ Error fetching messages:', error);
        toast.error('Failed to load messages');
      }
    } finally {
      setLoading(false);
    }
  }, [placeId, isWithinRange, messageLimit, fetchUserProfiles]);

  // Stable real-time subscription
  useEffect(() => {
    if (!placeId || !isWithinRange) {
      // Clean up existing subscription
      if (channelRef.current) {
        console.log('🧹 Cleaning up optimized chat subscription');
        setConnectionStatus('disconnected');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setMessages([]);
      return;
    }

    console.log('🔌 Setting up optimized chat subscription for place:', placeId);
    setConnectionStatus('connecting');
    fetchMessages();

    // Create new subscription with simplified config
    const channel = supabase
      .channel(`optimized_chat_${placeId}`, {
        config: {
          presence: { key: user?.id || 'anonymous' }
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `place_id=eq.${placeId}`
      }, async (payload) => {
        console.log('📩 New optimized message received:', payload.new);
        
        const newMessage = payload.new as ChatMessage;
        
        // Get user nickname
        if (!userCacheRef.current.has(newMessage.user_id)) {
          await fetchUserProfiles([newMessage.user_id]);
        }

        const messageWithUser = {
          ...newMessage,
          user: { nickname: userCacheRef.current.get(newMessage.user_id) || 'Unknown User' }
        };

        setMessages(prev => {
          // Prevent duplicates and maintain performance
          const exists = prev.some(msg => msg.id === messageWithUser.id);
          if (exists) return prev;
          
          const updated = [...prev, messageWithUser];
          return updated.slice(-messageLimit);
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `place_id=eq.${placeId}`
      }, () => {
        console.log('🔄 Message updated, fast refresh...');
        fetchMessages();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'chat_messages',
        filter: `place_id=eq.${placeId}`
      }, () => {
        console.log('🗑️ Message deleted, fast refresh...');
        fetchMessages();
      })
      .subscribe((status) => {
        console.log('📡 Optimized subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
          console.log('❌ Connection error, will auto-retry...');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log('🧹 Cleaning up optimized chat subscription on unmount');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [placeId, isWithinRange, fetchMessages, user]);

  const sendMessage = useCallback(async (messageText: string, isPromotion: boolean = false) => {
    if (!messageText.trim() || !placeId || !user || !canSendMessage() || sending) {
      if (!canSendMessage()) {
        toast.error(getMuteMessage() || 'You cannot send messages');
      }
      return false;
    }

    setSending(true);
    try {
      console.log('📤 Sending optimized message to place:', placeId);
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          message: messageText.trim(),
          user_id: user.id,
          place_id: placeId,
          message_type: 'user',
          is_promotion: isPromotion
        });

      if (error) throw error;

      console.log('✅ Message sent fast');
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
    connectionStatus,
    sendMessage,
    canSendMessage,
    getMuteMessage
  };
};
