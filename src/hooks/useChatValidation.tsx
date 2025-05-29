
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useChatValidation = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    checkMuteAndBanStatus();
  }, [user]);

  const checkMuteAndBanStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Check mute status
      const { data: muteData, error: muteError } = await supabase
        .from('user_mutes')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (muteError && muteError.code !== 'PGRST116') {
        console.error('❌ Error checking mute status:', muteError);
      }

      let userIsMuted = false;
      if (muteData) {
        // Check if mute has expired
        if (muteData.expires_at && new Date(muteData.expires_at) < new Date()) {
          console.log('🔓 Mute has expired, deactivating...');
          await supabase
            .from('user_mutes')
            .update({ is_active: false })
            .eq('id', muteData.id);
          userIsMuted = false;
        } else {
          console.log('🔇 User is currently muted');
          userIsMuted = true;
        }
      }
      setIsMuted(userIsMuted);

      // Check ban status
      const { data: banData, error: banError } = await supabase
        .from('user_bans')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (banError && banError.code !== 'PGRST116') {
        console.error('❌ Error checking ban status:', banError);
      }

      let userIsBanned = false;
      if (banData) {
        // Check if ban has expired
        if (banData.expires_at && new Date(banData.expires_at) < new Date()) {
          console.log('🔓 Ban has expired, deactivating...');
          await supabase
            .from('user_bans')
            .update({ is_active: false })
            .eq('id', banData.id);
          userIsBanned = false;
        } else {
          console.log('🚫 User is currently banned');
          userIsBanned = true;
        }
      }
      setIsBanned(userIsBanned);

    } catch (error) {
      console.error('❌ Error in checkMuteAndBanStatus:', error);
      setIsMuted(false);
      setIsBanned(false);
    } finally {
      setLoading(false);
    }
  };

  const canSendMessage = () => {
    if (loading) return false;
    if (!user) return false;
    return !isMuted && !isBanned;
  };

  const getMuteMessage = () => {
    if (isBanned) {
      return "You are currently banned and cannot send messages.";
    }
    if (isMuted) {
      return "You are currently muted and cannot send messages.";
    }
    return null;
  };

  return {
    isMuted,
    isBanned,
    loading,
    canSendMessage,
    getMuteMessage,
    checkMuteStatus: checkMuteAndBanStatus
  };
};
