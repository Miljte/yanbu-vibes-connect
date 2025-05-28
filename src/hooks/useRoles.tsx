
import { useAuth } from './useAuth';

export const useRoles = () => {
  const { userRole } = useAuth();

  const isUser = userRole === 'user';
  const isMerchant = userRole === 'merchant' || userRole === 'admin';
  const isAdmin = userRole === 'admin';

  const hasPermission = (permission: string): boolean => {
    const permissions = {
      // User permissions
      'view_map': true,
      'access_chat': true,
      'rsvp_events': true,
      'edit_profile': true,
      'report_messages': true,
      
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
    userRole,
    isUser,
    isMerchant,
    isAdmin,
    hasPermission,
  };
};
