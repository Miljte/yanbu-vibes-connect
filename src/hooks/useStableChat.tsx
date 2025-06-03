
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

interface UseStableChatProps {
  placeId: string | null;
  isWithinRange: boolean;
  messageLimit?: number;
}

export const useStableChat = ({ 
  placeId, 
  isWithinRange, 
  messageLimit = 50 
}: UseStableChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  
  const channelRef = useRef<any>(null);
  const lastFetchRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<string[]>([]);
  const userCacheRef = useRef<Map<string, string>>(new Map());
  
  const { user } = useAuth();
  const { canSendMessage, getMuteMessage } = useChatValidation();

  // Optimized user profile fetching with caching
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

  // Optimized message fetching with reduced API calls
  const fetchMessages = useCallback(async () => {
    if (!placeId || !isWithinRange) {
      setMessages([]);
      return;
    }

    const now = Date.now();
    if (now - lastFetchRef.current < 500) return; // Throttle to 500ms
    lastFetchRef.current = now;

    setLoading(true);
    try {
      console.log('🔄 Fetching stable chat messages for place:', placeId);
      
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
      
      // Batch fetch user profiles
      const userIds = [...new Set(messages.map(msg => msg.user_id).filter(Boolean))];
      await fetchUserProfiles(userIds);

      // Attach cached user data
      const messagesWithUsers = messages.map(message => ({
        ...message,
        user: { 
          nickname: userCacheRef.current.get(message.user_id) || 'Unknown User' 
        }
      }));

      setMessages(messagesWithUsers);
      console.log('✅ Stable chat messages loaded:', messagesWithUsers.length);
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [placeId, isWithinRange, messageLimit, fetchUserProfiles]);

  // Stable real-time connection with auto-reconnect
  const setupRealtimeConnection = useCallback(() => {
    if (!placeId || !isWithinRange) {
      if (channelRef.current) {
        console.log('🧹 Cleaning up chat connection - out of range');
        setConnectionStatus('disconnected');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    if (channelRef.current) {
      console.log('🔄 Reusing existing connection');
      return;
    }

    console.log('🔌 Setting up stable chat connection for place:', placeId);
    setConnectionStatus('connecting');

    const channel = supabase
      .channel(`stable_chat_${placeId}`, {
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
          // Prevent duplicates and maintain order
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
        console.log('📡 Connection status:', status);
        
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          console.log('✅ Chat connection established');
          
          // Process any queued messages
          if (messageQueueRef.current.length > 0) {
            console.log('📤 Processing queued messages:', messageQueueRef.current.length);
            messageQueueRef.current.forEach(message => {
              sendMessage(message);
            });
            messageQueueRef.current = [];
          }
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
          console.log('❌ Chat connection error, will retry...');
          
          // Auto-reconnect after 3 seconds
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            setupRealtimeConnection();
          }, 3000);
        }
      });

    channelRef.current = channel;
  }, [placeId, isWithinRange, user, messageLimit, fetchMessages, fetchUserProfiles]);

  // Setup connection and fetch initial messages
  useEffect(() => {
    fetchMessages();
    setupRealtimeConnection();

    return () => {
      if (channelRef.current) {
        console.log('🧹 Cleaning up chat connection on unmount');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [fetchMessages, setupRealtimeConnection]);

  // Optimized message sending with queuing for unstable connections
  const sendMessage = useCallback(async (messageText: string, isPromotion: boolean = false) => {
    if (!messageText.trim() || !placeId || !user || !canSendMessage()) {
      if (!canSendMessage()) {
        toast.error(getMuteMessage() || 'You cannot send messages');
      }
      return false;
    }

    // Queue message if not connected
    if (connectionStatus !== 'connected') {
      console.log('📥 Queueing message for later delivery');
      messageQueueRef.current.push(messageText);
      toast.info('Message queued - will send when connected');
      return false;
    }

    setSending(true);
    try {
      console.log('📤 Sending stable message to place:', placeId);
      
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
      
      // Queue for retry on network issues
      if ((error as any)?.message?.includes('network') || (error as any)?.code === 'PGRST301') {
        console.log('📥 Network error - queueing message for retry');
        messageQueueRef.current.push(messageText);
        toast.error('Network error - message queued for retry');
      } else {
        toast.error('Failed to send message');
      }
      return false;
    } finally {
      setSending(false);
    }
  }, [placeId, user, canSendMessage, getMuteMessage, connectionStatus]);

  const forceReconnect = useCallback(() => {
    console.log('🔄 Force reconnecting chat...');
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
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
    forceReconnect,
    queuedMessages: messageQueueRef.current.length
  };
};
