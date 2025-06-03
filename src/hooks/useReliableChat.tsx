
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

interface UseReliableChatProps {
  placeId: string | null;
  isWithinRange: boolean;
  messageLimit?: number;
}

export const useReliableChat = ({ 
  placeId, 
  isWithinRange, 
  messageLimit = 50 
}: UseReliableChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  
  const channelRef = useRef<any>(null);
  const userCacheRef = useRef<Map<string, string>>(new Map());
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  
  const { user } = useAuth();
  const { canSendMessage, getMuteMessage } = useChatValidation();

  // Fetch user profiles with caching
  const fetchUserProfiles = useCallback(async (userIds: string[]) => {
    const uncachedIds = userIds.filter(id => !userCacheRef.current.has(id));
    if (uncachedIds.length === 0) return;

    try {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', uncachedIds);

      profilesData?.forEach(profile => {
        userCacheRef.current.set(profile.id, profile.nickname || 'Unknown User');
      });
    } catch (error) {
      console.error('❌ Error fetching user profiles:', error);
    }
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!placeId || !isWithinRange) {
      setMessages([]);
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 Fetching chat messages for place:', placeId);
      
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

      if (error) throw error;

      const messages = messagesData || [];
      
      // Fetch user profiles
      const userIds = [...new Set(messages.map(msg => msg.user_id).filter(Boolean))];
      await fetchUserProfiles(userIds);

      // Attach user data
      const messagesWithUsers = messages.map(message => ({
        ...message,
        user: { 
          nickname: userCacheRef.current.get(message.user_id) || 'Unknown User' 
        }
      }));

      setMessages(messagesWithUsers);
      console.log('✅ Chat messages loaded:', messagesWithUsers.length);
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [placeId, isWithinRange, messageLimit, fetchUserProfiles]);

  // Setup real-time subscription
  const setupRealtimeConnection = useCallback(() => {
    if (!placeId || !isWithinRange) {
      if (channelRef.current) {
        console.log('🧹 Cleaning up chat connection - not in range');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setConnectionStatus('disconnected');
      }
      return;
    }

    // Don't create duplicate connections
    if (channelRef.current) {
      console.log('🔄 Chat connection already exists');
      return;
    }

    console.log('🔌 Setting up reliable chat connection for place:', placeId);
    setConnectionStatus('connecting');

    const channel = supabase
      .channel(`reliable_chat_${placeId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `place_id=eq.${placeId}`
      }, async (payload) => {
        console.log('📩 New message received:', payload.new);
        
        const newMessage = payload.new as ChatMessage;
        
        // Fetch user nickname if not cached
        if (!userCacheRef.current.has(newMessage.user_id)) {
          await fetchUserProfiles([newMessage.user_id]);
        }

        const messageWithUser = {
          ...newMessage,
          user: { 
            nickname: userCacheRef.current.get(newMessage.user_id) || 'Unknown User' 
          }
        };

        setMessages(prev => {
          // Prevent duplicates
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
        console.log('📡 Chat connection status:', status);
        
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          reconnectAttempts.current = 0;
          console.log('✅ Chat connection established');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
          console.log('❌ Chat connection error');
          
          // Auto-reconnect with exponential backoff
          if (reconnectAttempts.current < maxReconnectAttempts) {
            const delay = Math.pow(2, reconnectAttempts.current) * 1000;
            reconnectAttempts.current++;
            
            setTimeout(() => {
              console.log(`🔄 Reconnecting chat (attempt ${reconnectAttempts.current})...`);
              if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
              }
              setupRealtimeConnection();
            }, delay);
          }
        }
      });

    channelRef.current = channel;
  }, [placeId, isWithinRange, messageLimit, fetchMessages, fetchUserProfiles]);

  // Initialize connection
  useEffect(() => {
    fetchMessages();
    setupRealtimeConnection();

    return () => {
      if (channelRef.current) {
        console.log('🧹 Cleaning up chat connection on unmount');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchMessages, setupRealtimeConnection]);

  // Send message
  const sendMessage = useCallback(async (messageText: string, isPromotion: boolean = false) => {
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
          is_promotion: isPromotion
        });

      if (error) throw error;

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

  const forceReconnect = useCallback(() => {
    console.log('🔄 Force reconnecting chat...');
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    reconnectAttempts.current = 0;
    setupRealtimeConnection();
  }, [setupRealtimeConnection]);

  return {
    messages,
    loading,
    sending,
    connectionStatus,
    sendMessage,
    canSendMessage,
    getMuteMessage,
    forceReconnect
  };
};
