
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useRoles } from './useRoles';
import { toast } from 'sonner';

export const useAdminPermissions = () => {
  const { user } = useAuth();
  const { hasPermission } = useRoles();
  const [loading, setLoading] = useState(false);

  const canModerateContent = hasPermission('moderate_content');
  const canDeleteMessages = hasPermission('delete_messages');
  const canBanUsers = hasPermission('ban_users');
  const canViewLogs = hasPermission('view_logs');

  const deleteMessage = async (messageId: string, reason?: string) => {
    if (!canDeleteMessages) {
      toast.error('You do not have permission to delete messages');
      return false;
    }

    setLoading(true);
    try {
      console.log('🗑️ Admin deleting message:', messageId);
      
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_deleted: true })
        .eq('id', messageId);

      if (error) throw error;

      // Log admin action
      await supabase
        .from('admin_logs')
        .insert({
          admin_id: user?.id,
          action_type: 'delete_message',
          target_entity_id: messageId,
          details: { reason: reason || 'Admin deletion' }
        });

      console.log('✅ Message deleted successfully');
      toast.success('Message deleted');
      return true;
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      toast.error('Failed to delete message');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const muteUser = async (userId: string, duration: number = 24, reason?: string) => {
    if (!canBanUsers) {
      toast.error('You do not have permission to mute users');
      return false;
    }

    setLoading(true);
    try {
      console.log('🔇 Admin muting user:', userId);
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + duration);

      const { error } = await supabase
        .from('user_mutes')
        .insert({
          user_id: userId,
          muted_by: user?.id,
          expires_at: expiresAt.toISOString(),
          reason: reason || 'Admin action',
          is_active: true
        });

      if (error) throw error;

      // Log admin action
      await supabase
        .from('admin_logs')
        .insert({
          admin_id: user?.id,
          action_type: 'mute_user',
          target_user_id: userId,
          details: { duration, reason, expires_at: expiresAt.toISOString() }
        });

      console.log('✅ User muted successfully');
      toast.success(`User muted for ${duration} hours`);
      return true;
    } catch (error) {
      console.error('❌ Error muting user:', error);
      toast.error('Failed to mute user');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const banUser = async (userId: string, duration?: number, reason?: string) => {
    if (!canBanUsers) {
      toast.error('You do not have permission to ban users');
      return false;
    }

    setLoading(true);
    try {
      console.log('🚫 Admin banning user:', userId);
      
      const banData: any = {
        user_id: userId,
        banned_by: user?.id,
        reason: reason || 'Admin action',
        is_active: true
      };

      if (duration) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + duration);
        banData.expires_at = expiresAt.toISOString();
      }

      const { error } = await supabase
        .from('user_bans')
        .insert(banData);

      if (error) throw error;

      // Log admin action
      await supabase
        .from('admin_logs')
        .insert({
          admin_id: user?.id,
          action_type: 'ban_user',
          target_user_id: userId,
          details: { duration, reason, permanent: !duration }
        });

      console.log('✅ User banned successfully');
      toast.success(duration ? `User banned for ${duration} hours` : 'User permanently banned');
      return true;
    } catch (error) {
      console.error('❌ Error banning user:', error);
      toast.error('Failed to ban user');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const viewAllChats = async () => {
    if (!canViewLogs) {
      toast.error('You do not have permission to view all chats');
      return [];
    }

    try {
      console.log('👁️ Admin viewing all chats');
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          profiles!inner(nickname),
          places!inner(name)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      console.log(`✅ Retrieved ${data?.length || 0} messages for admin review`);
      return data || [];
    } catch (error) {
      console.error('❌ Error viewing all chats:', error);
      toast.error('Failed to load chat data');
      return [];
    }
  };

  return {
    canModerateContent,
    canDeleteMessages,
    canBanUsers,
    canViewLogs,
    loading,
    deleteMessage,
    muteUser,
    banUser,
    viewAllChats
  };
};
