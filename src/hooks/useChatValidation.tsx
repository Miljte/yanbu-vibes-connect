
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
    
    // Set up real-time subscription for mute/ban changes
    const channel = supabase
      .channel('user_moderation_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'user_mutes', filter: `user_id=eq.${user.id}` },
        () => {
          console.log('🔄 Mute status changed, rechecking...');
          checkMuteAndBanStatus();
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'user_bans', filter: `user_id=eq.${user.id}` },
        () => {
          console.log('🔄 Ban status changed, rechecking...');
          checkMuteAndBanStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const checkMuteAndBanStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('🔍 Checking mute and ban status for user:', user.id);
      
      // Check mute status
      const { data: muteData, error: muteError } = await supabase
        .from('user_mutes')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('muted_at', { ascending: false })
        .limit(1);

      if (muteError && muteError.code !== 'PGRST116') {
        console.error('❌ Error checking mute status:', muteError);
      }

      let userIsMuted = false;
      if (muteData && muteData.length > 0) {
        const latestMute = muteData[0];
        // Check if mute has expired
        if (latestMute.expires_at && new Date(latestMute.expires_at) < new Date()) {
          console.log('🔓 Mute has expired, deactivating...');
          await supabase
            .from('user_mutes')
            .update({ is_active: false })
            .eq('id', latestMute.id);
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
        .order('banned_at', { ascending: false })
        .limit(1);

      if (banError && banError.code !== 'PGRST116') {
        console.error('❌ Error checking ban status:', banError);
      }

      let userIsBanned = false;
      if (banData && banData.length > 0) {
        const latestBan = banData[0];
        // Check if ban has expired
        if (latestBan.expires_at && new Date(latestBan.expires_at) < new Date()) {
          console.log('🔓 Ban has expired, deactivating...');
          await supabase
            .from('user_bans')
            .update({ is_active: false })
            .eq('id', latestBan.id);
          userIsBanned = false;
        } else {
          console.log('🚫 User is currently banned');
          userIsBanned = true;
        }
      }
      setIsBanned(userIsBanned);

      console.log('✅ Moderation check complete:', { 
        isMuted: userIsMuted, 
        isBanned: userIsBanned 
      });

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
