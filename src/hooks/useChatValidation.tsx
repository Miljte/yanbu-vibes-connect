
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useChatValidation = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    checkMuteStatus();
  }, [user]);

  const checkMuteStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data: muteData, error } = await supabase
        .from('user_mutes')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error checking mute status:', error);
        setIsMuted(false);
        return;
      }

      if (muteData) {
        // Check if mute has expired
        if (muteData.expires_at && new Date(muteData.expires_at) < new Date()) {
          console.log('🔓 Mute has expired, deactivating...');
          await supabase
            .from('user_mutes')
            .update({ is_active: false })
            .eq('id', muteData.id);
          setIsMuted(false);
        } else {
          console.log('🔇 User is currently muted');
          setIsMuted(true);
        }
      } else {
        setIsMuted(false);
      }
    } catch (error) {
      console.error('❌ Error in checkMuteStatus:', error);
      setIsMuted(false);
    } finally {
      setLoading(false);
    }
  };

  const canSendMessage = () => {
    if (loading) return false;
    if (!user) return false;
    return !isMuted;
  };

  const getMuteMessage = () => {
    if (isMuted) {
      return "You are currently muted and cannot send messages.";
    }
    return null;
  };

  return {
    isMuted,
    loading,
    canSendMessage,
    getMuteMessage,
    checkMuteStatus
  };
};
