
import { useAuth } from './useAuth';

export const useRoles = () => {
  const { userRole } = useAuth();

  const isUser = userRole === 'user' || !userRole;
  const isMerchant = userRole === 'merchant' || userRole === 'admin';
  const isAdmin = userRole === 'admin';

  const hasPermission = (permission: string): boolean => {
    // Allow basic permissions for all users
    const basicPermissions = [
      'view_map',
      'access_chat',
      'rsvp_events',
      'edit_profile',
      'report_messages'
    ];

    if (basicPermissions.includes(permission)) {
      return true;
    }

    const permissions = {
      // Merchant permissions
      'merchant_dashboard': isMerchant,
      'send_promotions': isMerchant,
      'upload_photos': isMerchant,
      'view_analytics': isMerchant,
      'manage_place': isMerchant,
      
      // Admin permissions
      'admin_dashboard': isAdmin,
      'ban_users': isAdmin,
      'promote_users': isAdmin,
      'delete_messages': isAdmin,
      'view_logs': isAdmin,
      'manage_subscriptions': isAdmin,
      'moderate_content': isAdmin,
    };

    return permissions[permission] || false;
  };

  return {
    userRole: userRole || 'user',
    isUser,
    isMerchant,
    isAdmin,
    hasPermission,
  };
};
